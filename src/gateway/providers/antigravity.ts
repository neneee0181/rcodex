import { randomUUID } from "crypto";
import { platform, arch } from "os";

const AG_BASE = "https://daily-cloudcode-pa.googleapis.com";

export const ANTIGRAVITY_DEFAULT_MODELS = [
  "ag/gemini-3.1-pro-high",
  "ag/gemini-3.1-pro-low",
  "ag/gemini-3-flash",
  "ag/claude-sonnet-4-6",
  "ag/claude-opus-4-6-thinking",
  "ag/gpt-oss-120b-medium",
];

const modelCache = new Map<string, { models: string[]; expiresAt: number }>();

export function isAntigravityModel(model: string): boolean {
  return model.startsWith("ag/");
}

function generateProjectId(): string {
  const adj = ["useful", "bright", "swift", "calm", "bold"][Math.floor(Math.random() * 5)];
  const noun = ["fuze", "wave", "spark", "flow", "core"][Math.floor(Math.random() * 5)];
  return `${adj}-${noun}-${randomUUID().slice(0, 5)}`;
}

export async function callAntigravity(
  accessToken: string,
  model: string,
  contents: unknown[],
  systemInstruction?: unknown,
  tools?: unknown[],
  stream = true,
  signal?: AbortSignal,
  projectId?: string,
): Promise<Response> {
  const agModel = model.replace(/^ag\//, "");

  const sessionId = randomUUID() + Date.now().toString();

  const request: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: 8192 },
    sessionId,
  };
  if (systemInstruction) request.systemInstruction = systemInstruction;
  if (tools?.length) {
    request.tools = [{ functionDeclarations: tools }];
    request.toolConfig = { functionCallingConfig: { mode: "VALIDATED" } };
  }

  const body: Record<string, unknown> = {
    project: projectId ?? generateProjectId(),
    model: agModel,
    userAgent: "antigravity",
    requestType: "agent",
    requestId: `agent-${randomUUID()}`,
    request,
  };

  const endpoint = stream
    ? `${AG_BASE}/v1internal:streamGenerateContent?alt=sse`
    : `${AG_BASE}/v1internal:generateContent`;

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${accessToken}`,
      "user-agent": `antigravity/1.107.0 ${platform()}/${arch()}`,
      "x-request-source": "local",
      "accept": stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
}

export async function getAntigravityModels(accessToken: string, projectId?: string): Promise<string[]> {
  if (!accessToken) return [];
  const key = `${accessToken.slice(0, 16)}:${projectId ?? ""}`;
  const cached = modelCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.models;

  const checks = await Promise.all(ANTIGRAVITY_DEFAULT_MODELS.map(async model => {
    const ok = await probeAntigravityModel(accessToken, model, projectId);
    return ok ? model : null;
  }));
  const models = checks.filter((model): model is string => Boolean(model));
  modelCache.set(key, { models, expiresAt: Date.now() + 10 * 60_000 });
  return models;
}

async function probeAntigravityModel(accessToken: string, model: string, projectId?: string): Promise<boolean> {
  const agModel = model.replace(/^ag\//, "");
  const body = {
    project: projectId ?? generateProjectId(),
    model: agModel,
    userAgent: "antigravity",
    requestType: "agent",
    requestId: `model-probe-${randomUUID()}`,
    request: {
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: { maxOutputTokens: 1 },
      sessionId: randomUUID() + Date.now().toString(),
    },
  };
  try {
    const res = await fetch(`${AG_BASE}/v1internal:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${accessToken}`,
        "user-agent": `antigravity/1.107.0 ${platform()}/${arch()}`,
        "x-request-source": "local",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) return true;
    const text = await res.text();
    if (res.status === 429 || /quota|rate/i.test(text)) return true;
    return false;
  } catch {
    return false;
  }
}
