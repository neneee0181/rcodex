import crypto from "crypto";
import type { Message } from "./anthropic.js";

// ── Model lists ─────────────────────────────────────────────────────────────

export const VERTEX_MODELS: string[] = [
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

export const VERTEX_PARTNER_MODELS: string[] = [
  "deepseek-ai/deepseek-v3.2-maas",
  "qwen/qwen3-next-80b-a3b-thinking-maas",
  "qwen/qwen3-next-80b-a3b-instruct-maas",
  "zai-org/glm-5-maas",
];

export function getVertexModels(): string[] {
  return [...VERTEX_MODELS];
}

export function getVertexPartnerModels(): string[] {
  return [...VERTEX_PARTNER_MODELS];
}

// ── Service Account ─────────────────────────────────────────────────────────

export interface ServiceAccountInfo {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function parseServiceAccount(json: string): ServiceAccountInfo {
  const sa = JSON.parse(json) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error(
      "Invalid GCP service account JSON: missing project_id, client_email, or private_key",
    );
  }
  return {
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: sa.private_key,
  };
}

// ── Region mapping ──────────────────────────────────────────────────────────

const DEFAULT_REGION = "us-central1";

// Partner MaaS models are region-specific. Check Vertex AI Model Garden for updates.
const MODEL_REGION_MAP: Record<string, string> = {
  "deepseek-ai/deepseek-v3.2-maas": "us-east5",
  "qwen/qwen3-next-80b-a3b-thinking-maas": "us-central1",
  "qwen/qwen3-next-80b-a3b-instruct-maas": "us-central1",
  "zai-org/glm-5-maas": "us-central1",
};

function getRegion(model: string): string {
  return MODEL_REGION_MAP[model] ?? DEFAULT_REGION;
}

// ── JWT / OAuth2 token management ───────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch seconds
}

const tokenCache = new Map<string, CachedToken>();

/** Minimum remaining lifetime (seconds) before we proactively refresh. */
const REFRESH_MARGIN_SECS = 300; // 5 minutes

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function createJwtAssertion(sa: ServiceAccountInfo): string {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signature = base64url(
    crypto.sign("RSA-SHA256", Buffer.from(signingInput), sa.privateKey),
  );

  return `${signingInput}.${signature}`;
}

async function exchangeJwtForToken(jwt: string): Promise<CachedToken> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(jwt)}`,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GCP token exchange failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  return {
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}

export async function getVertexAccessToken(
  sa: ServiceAccountInfo,
): Promise<string> {
  const cached = tokenCache.get(sa.clientEmail);
  const now = Math.floor(Date.now() / 1000);

  if (cached && cached.expiresAt - now > REFRESH_MARGIN_SECS) {
    return cached.accessToken;
  }

  const jwt = createJwtAssertion(sa);
  const token = await exchangeJwtForToken(jwt);
  tokenCache.set(sa.clientEmail, token);
  return token.accessToken;
}

// ── Vertex Gemini (Google format) ───────────────────────────────────────────

export async function callVertex(
  saJson: string,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
  tools?: Record<string, unknown>[],
  contents?: unknown[],
): Promise<Response> {
  const sa = parseServiceAccount(saJson);
  const accessToken = await getVertexAccessToken(sa);
  const region = getRegion(model);

  const geminiContents =
    contents ??
    messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        {
          text:
            typeof m.content === "string"
              ? m.content
              : (m.content as { text?: string }[])
                  .map((c) => c.text ?? "")
                  .join(""),
        },
      ],
    }));

  const body: Record<string, unknown> = {
    contents: geminiContents,
    generationConfig: { temperature: 1 },
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  if (tools?.length) {
    body.tools = [{ functionDeclarations: tools }];
  }

  const action = stream ? "streamGenerateContent" : "generateContent";
  const altParam = stream ? "?alt=sse" : "";
  const url =
    `https://${region}-aiplatform.googleapis.com/v1` +
    `/projects/${sa.projectId}/locations/${region}` +
    `/publishers/google/models/${model}:${action}${altParam}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    signal,
  });
}

// ── Vertex Partner (OpenAI format) ──────────────────────────────────────────

export async function callVertexPartner(
  saJson: string,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
): Promise<Response> {
  const sa = parseServiceAccount(saJson);
  const accessToken = await getVertexAccessToken(sa);
  const region = getRegion(model);

  const allMessages: { role: string; content: string | unknown }[] = [];
  if (systemPrompt) {
    allMessages.push({ role: "system", content: systemPrompt });
  }
  allMessages.push(
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  );

  const url =
    `https://${region}-aiplatform.googleapis.com/v1beta1` +
    `/projects/${sa.projectId}/locations/${region}` +
    `/endpoints/openapi/chat/completions`;

  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      model,
      messages: allMessages,
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
    }),
    signal,
  });
}
