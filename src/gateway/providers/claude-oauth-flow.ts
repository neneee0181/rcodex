import { createServer } from "http";
import { createHash, randomBytes } from "crypto";

const CLIENT_ID      = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTH_URL       = "https://claude.ai/oauth/authorize";
const TOKEN_URL      = "https://platform.claude.com/v1/oauth/token";
const CREATE_KEY_URL = "https://api.anthropic.com/api/oauth/claude_cli/create_api_key";
const CALLBACK_PORT  = 49155;
// The token exchange validates against this URI, NOT the localhost one
const PLATFORM_REDIRECT_URI = "https://platform.claude.com/oauth/code/callback";
// Localhost server receives the actual code (platform relays via state-encoded port)
const LOCAL_REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
const SCOPES = "org:create_api_key user:profile user:inference";

export const CLAUDE_CODE_MODELS = [
  "claude-opus-4-7-20250514",
  "claude-opus-4-5",
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5-20251001",
];

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier  = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  apiKey?: string;
}

export function buildClaudeAuthUrl(): { url: string; state: string; verifier: string } {
  const { verifier, challenge } = generatePKCE();
  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    // Use localhost so we directly receive the code in our callback server
    redirect_uri: LOCAL_REDIRECT_URI,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });

  return { url: `${AUTH_URL}?${params}`, state, verifier };
}

export async function exchangeClaudeCode(
  code: string,
  verifier: string,
  state: string,
): Promise<OAuthTokens> {
  // Strip fragment (#...) from auth code ??Anthropic appends extra data after '#'
  const cleanCode = code.split("#")[0];

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: cleanCode,
      // Token endpoint validates against the platform redirect URI, not localhost
      redirect_uri: LOCAL_REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
      state,
    }).toString(),
    signal: AbortSignal.timeout(120_000), // endpoint can be slow (up to 60s)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };

  // Use the access token to create a permanent API key
  try {
    tokens.apiKey = await createClaudeApiKey(data.access_token);
  } catch (err) {
    console.warn("[Claude OAuth] create_api_key failed (storing OAuth token as fallback):", (err as Error).message);
  }

  return tokens;
}

async function createClaudeApiKey(accessToken: string): Promise<string> {
  const res = await fetch(CREATE_KEY_URL, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${accessToken}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "rcodex Gateway" }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`create_api_key failed (${res.status}): ${err}`);
  }

  const data = await res.json() as { raw_key?: string; key?: string; api_key?: string };
  const key = data.raw_key ?? data.key ?? data.api_key;
  if (!key) throw new Error(`create_api_key: no key in response: ${JSON.stringify(data)}`);
  return key;
}

export async function refreshClaudeAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }).toString(),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  };
}

let activeCallbackServer: ReturnType<typeof createServer> | null = null;

function closeCallbackServer(): void {
  if (!activeCallbackServer) return;
  try {
    (activeCallbackServer as unknown as { closeAllConnections?(): void }).closeAllConnections?.();
    activeCallbackServer.close();
  } catch { /* ignore */ }
  activeCallbackServer = null;
}

export function waitForClaudeCallback(expectedState: string): Promise<string> {
  closeCallbackServer();

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404); res.end(); return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(successPage(`Login failed: ${error}`, true));
        closeCallbackServer();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      const state = url.searchParams.get("state");
      const code  = url.searchParams.get("code");

      if (state !== expectedState || !code) {
        res.writeHead(400); res.end("Bad request");
        closeCallbackServer();
        reject(new Error("Invalid OAuth callback"));
        return;
      }

      res.writeHead(200, { "content-type": "text/html" });
      res.end(successPage("Claude Code connected! You can close this tab.", false));
      closeCallbackServer();
      resolve(code);
    });

    activeCallbackServer = server;
    server.on("error", (err) => { activeCallbackServer = null; reject(err); });
    server.listen(CALLBACK_PORT, "127.0.0.1");

    setTimeout(() => {
      closeCallbackServer();
      reject(new Error("OAuth login timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}

function successPage(msg: string, isError: boolean): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0d0d12;color:#e2e2f0}
.box{text-align:center;padding:40px;border-radius:16px;background:#16161e;border:1px solid ${isError ? "#ef4444" : "#f97316"}33}
h2{color:${isError ? "#ef4444" : "#f97316"};margin-bottom:8px}p{color:#6b6b8a}</style></head>
<body><div class="box"><h2>${isError ? "Error:" : "Success:"} ${msg}</h2><p>Return to the rcodex Gateway tab.</p></div></body></html>`;
}
