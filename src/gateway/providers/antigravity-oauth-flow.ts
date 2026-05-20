import { createServer } from "http";
import { randomBytes } from "crypto";
import { platform, arch } from "os";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

type AppCreds = { clientId: string; clientSecret: string };

function tryReadCreds(p: string): AppCreds | null {
  try {
    if (!existsSync(p)) return null;
    const d = JSON.parse(readFileSync(p, "utf-8")) as { clientId?: string; clientSecret?: string };
    if (d.clientId && d.clientSecret) return { clientId: d.clientId, clientSecret: d.clientSecret };
  } catch { /* fall through */ }
  return null;
}

export function getAppCredentials(): AppCreds {
  // 1. User override in ~/.rcodex/antigravity-app.json
  const userPath = join(homedir(), ".rcodex", "antigravity-app.json");
  const fromUser = tryReadCreds(userPath);
  if (fromUser) return fromUser;

  // 2. Bundled with the package (dist/antigravity-credentials.json)
  const pkgDir = dirname(fileURLToPath(import.meta.url));
  const bundledPath = join(pkgDir, "../../antigravity-credentials.json");
  const fromPkg = tryReadCreds(bundledPath);
  if (fromPkg) return fromPkg;

  throw new Error(
    "Antigravity credentials not found.\n" +
    "Run: rcodex doctor  ??to diagnose and auto-fix setup issues.\n" +
    "Or create ~/.rcodex/antigravity-app.json with { \"clientId\": \"...\", \"clientSecret\": \"...\" }"
  );
}

export function hasAppCredentials(): boolean {
  try { getAppCredentials(); return true; } catch { return false; }
}
const AUTH_URL      = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL     = "https://oauth2.googleapis.com/token";
const CALLBACK_PORT = 49157;
const REDIRECT_URI  = `http://localhost:${CALLBACK_PORT}/callback`;
const SCOPES        = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/cloud-platform",
].join(" ");

export interface AntigravityTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function buildAntigravityAuthUrl(): { url: string; state: string } {
  const { clientId } = getAppCredentials();
  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return { url: `${AUTH_URL}?${params}`, state };
}

export async function exchangeAntigravityCode(code: string): Promise<AntigravityTokens> {
  const { clientId, clientSecret } = getAppCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Antigravity token exchange failed (${res.status}): ${await res.text()}`);
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

export async function refreshAntigravityAccessToken(refreshToken: string): Promise<AntigravityTokens> {
  const { clientId, clientSecret } = getAppCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Antigravity token refresh failed (${res.status}): ${await res.text()}`);
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken, expiresIn: data.expires_in };
}

const LOAD_ASSIST_URL = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const ONBOARD_URL     = "https://cloudcode-pa.googleapis.com/v1internal:onboardUser";

function platformEnum(): number {
  const os = platform(); const a = arch();
  if (os === "darwin") return a === "arm64" ? 2 : 1;
  if (os === "linux")  return a === "arm64" ? 4 : 3;
  if (os === "win32")  return 5;
  return 0;
}

function assistHeaders(accessToken: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "authorization": `Bearer ${accessToken}`,
    "user-agent": "google-api-nodejs-client/9.15.1",
    "x-goog-api-client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
    "client-metadata": JSON.stringify({ ideType: 9, platform: platformEnum(), pluginType: 2 }),
  };
}

export async function loadAntigravityProject(accessToken: string): Promise<string> {
  const metadata = { ideType: 9, platform: platformEnum(), pluginType: 2 };
  const res = await fetch(LOAD_ASSIST_URL, {
    method: "POST",
    headers: assistHeaders(accessToken),
    body: JSON.stringify({ metadata }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`loadCodeAssist failed (${res.status}): ${await res.text()}`);
  const data = await res.json() as { cloudaicompanionProject?: string | { id?: string }; allowedTiers?: { isDefault?: boolean; id?: string }[] };

  let projectId: string | undefined;
  if (typeof data.cloudaicompanionProject === "string") projectId = data.cloudaicompanionProject;
  else if (data.cloudaicompanionProject?.id) projectId = data.cloudaicompanionProject.id;
  if (!projectId) throw new Error("No cloudaicompanionProject in loadCodeAssist response");

  let tierId = "legacy-tier";
  for (const t of data.allowedTiers ?? []) {
    if (t.isDefault && t.id) { tierId = t.id.trim(); break; }
  }

  // Onboard (enables Gemini Code Assist for the project); poll until done
  for (let i = 0; i < 10; i++) {
    const ob = await fetch(ONBOARD_URL, {
      method: "POST",
      headers: assistHeaders(accessToken),
      body: JSON.stringify({ tierId, metadata }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!ob.ok) break;
    const od = await ob.json() as { done?: boolean; response?: { cloudaicompanionProject?: string | { id?: string } } };
    if (od.done) {
      const rp = od.response?.cloudaicompanionProject;
      if (typeof rp === "string" && rp) projectId = rp.trim();
      else if (rp && typeof rp === "object" && rp.id) projectId = rp.id.trim();
      break;
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  return projectId;
}

let activeServer: ReturnType<typeof createServer> | null = null;
function closeServer(): void {
  if (!activeServer) return;
  try { (activeServer as unknown as { closeAllConnections?(): void }).closeAllConnections?.(); activeServer.close(); } catch { /* */ }
  activeServer = null;
}

export function waitForAntigravityCallback(expectedState: string): Promise<string> {
  closeServer();
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
      if (url.pathname !== "/callback") { res.writeHead(404); res.end(); return; }
      const error = url.searchParams.get("error");
      if (error) {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(page(`Login failed: ${error}`, true));
        closeServer(); reject(new Error(`OAuth error: ${error}`)); return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (state !== expectedState || !code) {
        res.writeHead(400); res.end("Bad request");
        closeServer(); reject(new Error("Invalid OAuth callback")); return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(page("Antigravity connected! You can close this tab.", false));
      closeServer(); resolve(code);
    });
    activeServer = server;
    server.on("error", (err) => { activeServer = null; reject(err); });
    server.listen(CALLBACK_PORT, "127.0.0.1");
    setTimeout(() => { closeServer(); reject(new Error("OAuth login timed out after 5 minutes")); }, 5 * 60 * 1000);
  });
}

function page(msg: string, isError: boolean): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0d0d12;color:#e2e2f0}
.box{text-align:center;padding:40px;border-radius:16px;background:#16161e;border:1px solid ${isError ? "#ef4444" : "#34d399"}33}
h2{color:${isError ? "#ef4444" : "#34d399"};margin-bottom:8px}p{color:#6b6b8a}</style></head>
<body><div class="box"><h2>${isError ? "Error:" : "Success:"} ${msg}</h2><p>Return to the rcodex Gateway tab.</p></div></body></html>`;
}
