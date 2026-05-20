const COPILOT_API = "https://api.githubcopilot.com";
const GH_API = "https://api.github.com";
const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98";

export const COPILOT_DEFAULT_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
  "claude-3.5-sonnet",
  "claude-sonnet-4-5",
];

export interface CopilotDeviceAuth {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface CopilotOAuthToken {
  accessToken: string;
  tokenType?: string;
  scope?: string;
}

// In-memory cache: GitHub OAuth access token ??{Copilot token, expiresAt ms}
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function startCopilotDeviceAuth(): Promise<CopilotDeviceAuth> {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "User-Agent": "GithubCopilot/1.155.0",
    },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "read:user" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`GitHub device auth failed (${res.status}): ${await res.text()}`);
  const data = await res.json() as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval?: number;
  };
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval ?? 5,
  };
}

export async function pollCopilotDeviceToken(auth: CopilotDeviceAuth): Promise<CopilotOAuthToken> {
  const startedAt = Date.now();
  let intervalMs = Math.max(1, auth.interval) * 1000;
  while (Date.now() - startedAt < auth.expiresIn * 1000) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "User-Agent": "GithubCopilot/1.155.0",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: auth.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`GitHub token polling failed (${res.status}): ${await res.text()}`);
    const data = await res.json() as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (data.access_token) {
      return { accessToken: data.access_token, tokenType: data.token_type, scope: data.scope };
    }
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      intervalMs += 5_000;
      continue;
    }
    if (data.error === "access_denied") throw new Error("GitHub Copilot login was denied by the user");
    if (data.error === "expired_token") throw new Error("GitHub Copilot login code expired");
    throw new Error(data.error_description || data.error || "GitHub Copilot login failed");
  }
  throw new Error("GitHub Copilot login timed out");
}

export async function getCopilotToken(githubToken: string): Promise<string> {
  const cached = tokenCache.get(githubToken);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${GH_API}/copilot_internal/v2/token`, {
    headers: {
      "Authorization": `token ${githubToken}`,
      "User-Agent": "GithubCopilot/1.155.0",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Copilot token exchange failed (${res.status}): ${await res.text()}`);
  const data = await res.json() as { token: string; expires_at: number };
  tokenCache.set(githubToken, { token: data.token, expiresAt: data.expires_at * 1000 });
  return data.token;
}

function copilotHeaders(token: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Editor-Version": "vscode/1.90.2",
    "Editor-Plugin-Version": "copilot-chat/0.17.2",
    "Openai-Intent": "conversation-panel",
    "User-Agent": "GithubCopilot/1.155.0",
  };
}

export async function getCopilotModels(githubToken: string): Promise<string[]> {
  if (!githubToken) return [];
  try {
    const token = await getCopilotToken(githubToken);
    const res = await fetch(`${COPILOT_API}/models`, {
      headers: copilotHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { data?: { id: string; model_picker_enabled?: boolean; supported_endpoints?: string[] }[] };
    const models = (data.data || [])
      .filter(m => m.model_picker_enabled !== false)
      .filter(m => (m.supported_endpoints ?? []).includes("/chat/completions"))
      .map(m => m.id)
      .filter(Boolean);
    return models;
  } catch {
    return [];
  }
}

export async function callCopilot(
  githubToken: string,
  model: string,
  messages: unknown[],
  instructions?: string,
  stream = true,
  signal?: AbortSignal,
  tools?: unknown[],
): Promise<Response> {
  const token = await getCopilotToken(githubToken);
  const fullMessages = instructions
    ? [{ role: "system", content: instructions }, ...messages]
    : messages;
  const body: Record<string, unknown> = { model, messages: fullMessages, stream };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  return fetch(`${COPILOT_API}/chat/completions`, {
    method: "POST",
    headers: copilotHeaders(token),
    body: JSON.stringify(body),
    signal,
  });
}
