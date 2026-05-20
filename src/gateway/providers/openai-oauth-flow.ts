import { createServer } from "http";
import { createHash, randomBytes } from "crypto";
import { execSync } from "child_process";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTH_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const CALLBACK_PORT = 1455;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/auth/callback`;
const SCOPES = "openid profile email offline_access";

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function buildAuthUrl(): { url: string; state: string; verifier: string } {
  const { verifier, challenge } = generatePKCE();
  const state = randomBytes(16).toString("hex");

  // Build query string manually to preserve %20 encoding (OpenAI requires this)
  const paramEntries: Record<string, string> = {
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    originator: "codex_cli_rs",
    state,
  };
  const query = Object.entries(paramEntries)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return { url: `${AUTH_URL}?${query}`, state, verifier };
}

export async function exchangeCode(code: string, verifier: string): Promise<OAuthTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }).toString(),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshOpenAIAccessToken(refreshToken: string): Promise<OAuthTokens> {
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
    throw new Error(`OpenAI token refresh failed (${res.status}): ${err}`);
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

// Opens a one-shot HTTP server on port 1455 to receive the OAuth callback.
// Resolves with the authorization code when received (or rejects on error/timeout).
export function waitForCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
      if (url.pathname !== "/auth/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(successPage(`Login failed: ${error}`, true));
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");

      if (state !== expectedState || !code) {
        res.writeHead(400);
        res.end("Bad request");
        server.close();
        reject(new Error("Invalid OAuth callback"));
        return;
      }

      res.writeHead(200, { "content-type": "text/html" });
      res.end(successPage("ChatGPT connected! You can close this tab.", false));
      server.close();
      resolve(code);
    });

    server.on("error", reject);
    server.listen(CALLBACK_PORT, "127.0.0.1");

    // 5-minute timeout
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth login timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}

function openBrowser(url: string): void {
  try {
    if (process.platform === "darwin") execSync(`open "${url}"`);
    else if (process.platform === "win32") execSync(`start "" "${url}"`, { windowsHide: true });
    else execSync(`xdg-open "${url}"`);
  } catch { /* ignore */ }
}

// Full OAuth flow: opens browser and waits for callback. Returns tokens.
export async function runOAuthFlow(): Promise<OAuthTokens> {
  const { url, state, verifier } = buildAuthUrl();
  openBrowser(url);
  const code = await waitForCallback(state);
  return exchangeCode(code, verifier);
}

function successPage(msg: string, isError: boolean): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0d0d12;color:#e2e2f0}
.box{text-align:center;padding:40px;border-radius:16px;background:#16161e;border:1px solid ${isError ? "#ef4444" : "#22c55e"}33}
h2{color:${isError ? "#ef4444" : "#22c55e"};margin-bottom:8px}p{color:#6b6b8a}</style></head>
<body><div class="box"><h2>${isError ? "Error:" : "Success:"} ${msg}</h2><p>Return to the rcodex Gateway tab.</p></div></body></html>`;
}
