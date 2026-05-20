import { randomUUID } from "crypto";
import { platform, arch } from "os";

const AG_BASE = "https://daily-cloudcode-pa.googleapis.com";
const AG_CONTROL_BASE = "https://cloudcode-pa.googleapis.com";

export const ANTIGRAVITY_DEFAULT_MODELS = [
  "ag/gemini-3.5-flash",
  "ag/gemini-3.1-pro-high",
  "ag/gemini-3.1-pro-low",
  "ag/gemini-3-flash",
  "ag/claude-sonnet-4-6",
  "ag/claude-opus-4-6-thinking",
  "ag/gpt-oss-120b-medium",
];

const modelCache = new Map<string, { models: string[]; expiresAt: number }>();
const quotaCache = new Map<string, { quota: AntigravityQuota; expiresAt: number }>();

export interface AntigravityQuotaModel {
  name: string;
  displayName?: string;
  used: number;
  remainingPercentage: number;
  resets_at: string | number | null;
}

export interface AntigravityQuota {
  models: AntigravityQuotaModel[];
}

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

  let models = await fetchAntigravityModels(accessToken, projectId);
  if (!models.length) {
    const checks = await Promise.all(ANTIGRAVITY_DEFAULT_MODELS.map(async model => {
      const ok = await probeAntigravityModel(accessToken, model, projectId);
      return ok ? model : null;
    }));
    models = checks.filter((model): model is string => Boolean(model));
  }
  modelCache.set(key, { models, expiresAt: Date.now() + 10 * 60_000 });
  return models;
}

function parseResetTime(value: unknown): string | number | null {
  if (typeof value === "string" || typeof value === "number") return value;
  return null;
}

async function fetchAvailableModels(accessToken: string, projectId?: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${AG_CONTROL_BASE}/v1internal:fetchAvailableModels`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${accessToken}`,
        "user-agent": `antigravity/1.107.0 ${platform()}/${arch()}`,
        "x-client-name": "antigravity",
        "x-client-version": "1.107.0",
        "x-request-source": "local",
      },
      body: JSON.stringify({ ...(projectId ? { project: projectId } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchAntigravityModels(accessToken: string, projectId?: string): Promise<string[]> {
  const data = await fetchAvailableModels(accessToken, projectId);
  const rawModels = data?.models;
  if (!rawModels || typeof rawModels !== "object" || Array.isArray(rawModels)) return [];
  return Object.entries(rawModels as Record<string, { isInternal?: boolean }>)
    .filter(([id, info]) => id && !info?.isInternal)
    .map(([id]) => `ag/${id}`)
    .sort();
}

export async function getAntigravityQuota(accessToken: string, projectId?: string): Promise<AntigravityQuota> {
  const key = `${accessToken.slice(0, 16)}:${projectId ?? ""}`;
  const cached = quotaCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.quota;

  const data = await fetchAvailableModels(accessToken, projectId);
  const rawModels = data?.models;
  const models: AntigravityQuotaModel[] = [];
  if (rawModels && typeof rawModels === "object" && !Array.isArray(rawModels)) {
    for (const [name, infoRaw] of Object.entries(rawModels as Record<string, Record<string, unknown>>)) {
      if (!name || infoRaw.isInternal) continue;
      const quotaInfo = infoRaw.quotaInfo as Record<string, unknown> | undefined;
      if (!quotaInfo) continue;
      const remainingFraction = typeof quotaInfo.remainingFraction === "number" ? quotaInfo.remainingFraction : Number(quotaInfo.remainingFraction ?? 0);
      const remainingPercentage = Math.max(0, Math.min(100, remainingFraction * 100));
      models.push({
        name,
        displayName: typeof infoRaw.displayName === "string" ? infoRaw.displayName : undefined,
        used: Math.max(0, Math.min(100, 100 - remainingPercentage)),
        remainingPercentage,
        resets_at: parseResetTime(quotaInfo.resetTime),
      });
    }
  }
  const quota = { models: models.sort((a, b) => a.name.localeCompare(b.name)) };
  quotaCache.set(key, { quota, expiresAt: Date.now() + 90_000 });
  return quota;
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
