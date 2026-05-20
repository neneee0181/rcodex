import type { ProviderAuth } from "../auth.js";
import type { Message } from "./anthropic.js";

const API_BASE = "https://api.openai.com/v1";
const CHATGPT_SESSION_URL = "https://chatgpt.com/api/auth/session";
const CHATGPT_API_BASE = "https://chatgpt.com/backend-api";
const CODEX_API_URL = "https://chatgpt.com/backend-api/codex/responses";

// Models available via Codex OAuth subscription (no discovery API ??hardcoded like 9router)
const CODEX_MODELS = [
  "gpt-5.5", "gpt-5.4", "gpt-5.3-codex", "gpt-5.3-codex-high", "gpt-5.3-codex-low",
  "gpt-5.3-codex-spark", "gpt-5.2-codex", "gpt-5.2", "gpt-5.1-codex-max",
  "gpt-5.1-codex", "gpt-5.1-codex-mini", "gpt-5.1", "gpt-5-codex", "gpt-5-codex-mini",
  "gpt-4o", "gpt-4o-mini",
];

export function isOpenAIModel(model: string): boolean {
  return (
    model.startsWith("gpt-") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("o4") ||
    model.startsWith("chatgpt-")
  );
}

// ?? Codex OAuth (chatgpt.com/backend-api/codex/responses) ?????????????????
// Codex always uses Responses API format and requires streaming to be true.
export async function callCodexAPI(
  token: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(CODEX_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      originator: "codex-cli",
      "user-agent": "codex-cli/1.0.18 (macOS; arm64)",
    },
    body: JSON.stringify(body),
    signal,
  });
}

// ?? Official API key ????????????????????????????????????????????????????????
async function callOpenAIAPI(
  apiKey: string,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  const allMessages = [];
  if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
  allMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })));

  return fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages: allMessages, stream, ...(stream ? { stream_options: { include_usage: true } } : {}) }),
    signal,
  });
}

// ?? Unofficial: ChatGPT consumer session ???????????????????????????????????
// Uses __Secure-next-auth.session-token cookie to get a bearer token,
// then proxies through chatgpt.com/backend-api.
// ??Unofficial ??may break without notice. Against OpenAI ToS.
async function resolveAccessToken(sessionToken: string): Promise<string> {
  const res = await fetch(CHATGPT_SESSION_URL, {
    headers: {
      cookie: `__Secure-next-auth.session-token=${sessionToken}`,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Session refresh failed: ${res.status}`);
  const data = await res.json() as { accessToken?: string; error?: string };
  if (data.error || !data.accessToken) {
    throw new Error("Invalid or expired ChatGPT session token. Please refresh it from your browser.");
  }
  return data.accessToken;
}

async function callOpenAIUnofficial(
  sessionToken: string,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  const accessToken = await resolveAccessToken(sessionToken);

  // Build conversation messages in ChatGPT backend format
  const formatted = [];
  if (systemPrompt) formatted.push({ role: "system", content: systemPrompt });
  formatted.push(...messages.map((m) => ({
    id: crypto.randomUUID(),
    role: m.role,
    author: { role: m.role },
    content: {
      content_type: "text",
      parts: [typeof m.content === "string" ? m.content : JSON.stringify(m.content)],
    },
  })));

  const body = {
    action: "next",
    messages: formatted,
    model: model || "gpt-4o",
    parent_message_id: crypto.randomUUID(),
    conversation_id: null,
    stream,
  };

  return fetch(`${CHATGPT_API_BASE}/conversation`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    },
    body: JSON.stringify(body),
    signal,
  });
}

// ?? Parse ChatGPT backend SSE response ??plain text ????????????????????????
async function parseChatGPTResponse(res: Response, model: string): Promise<import("../proxy.js").ResponsesResponse> {
  const text = await res.text();

  // ChatGPT backend returns SSE lines; find the last data event with message content
  let lastContent = "";
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const raw = line.slice(6).trim();
    if (raw === "[DONE]") break;
    try {
      const evt = JSON.parse(raw) as {
        message?: { content?: { parts?: string[] }; author?: { role?: string } };
      };
      const parts = evt.message?.content?.parts;
      if (parts?.length && evt.message?.author?.role === "assistant") {
        lastContent = parts.join("");
      }
    } catch { /* skip */ }
  }

  return {
    id: `resp_${Date.now()}`,
    object: "response",
    model,
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: lastContent }] }],
  };
}

// ?? Public interface ????????????????????????????????????????????????????????
export async function callOpenAI(
  auth: ProviderAuth,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  if (auth.method === "apikey" && auth.apiKey) {
    return callOpenAIAPI(auth.apiKey, model, messages, systemPrompt, stream, signal);
  }
  if (auth.method === "oauth-official" && auth.oauthToken) {
    return callOpenAIAPI(auth.oauthToken, model, messages, systemPrompt, stream, signal);
  }
  if (auth.method === "oauth-unofficial" && auth.sessionToken) {
    return callOpenAIUnofficial(auth.sessionToken, model, messages, systemPrompt, stream, signal);
  }
  throw new Error("OpenAI: no valid authentication configured");
}

// Called from proxy.ts ??handles ChatGPT backend response format separately
export async function callOpenAIAndParse(
  auth: ProviderAuth,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  signal?: AbortSignal
): Promise<import("../proxy.js").ResponsesResponse> {
  if (auth.method === "oauth-unofficial" && auth.sessionToken) {
    const res = await callOpenAIUnofficial(auth.sessionToken, model, messages, systemPrompt, false, signal);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ChatGPT API error ${res.status}: ${err}`);
    }
    return parseChatGPTResponse(res, model);
  }
  // oauth-official and apikey: handled in proxy.ts via callOpenAI
  throw new Error("Use callOpenAI for API key / OAuth path");
}

export async function getOpenAIModels(auth: ProviderAuth): Promise<string[]> {
  if (auth.method === "oauth-official") {
    const fetched = auth.oauthToken ? await getCodexModels(auth.oauthToken) : [];
    return fetched.length ? fetched : CODEX_MODELS;
  }
  if (auth.method === "oauth-unofficial") {
    return ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "chatgpt-4o-latest"];
  }
  if (!auth.apiKey) return [];
  try {
    const res = await fetch(`${API_BASE}/models`, {
      headers: { authorization: `Bearer ${auth.apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json() as { data: { id: string }[] };
    return data.data
      .map((m) => m.id)
      .filter(isUsableOpenAIChatModel)
      .sort();
  } catch {
    return [];
  }
}

async function getCodexModels(token: string): Promise<string[]> {
  const endpoints = [
    `${CHATGPT_API_BASE}/codex/models`,
    `${CHATGPT_API_BASE}/models`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
          originator: "codex-cli",
          "user-agent": "codex-cli/1.0.18",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json() as Record<string, unknown>;
      const raw = Array.isArray(data.data) ? data.data
        : Array.isArray(data.models) ? data.models
        : Array.isArray(data) ? data
        : [];
      const models = raw
        .map((m) => typeof m === "string" ? m : ((m as Record<string, unknown>).id ?? (m as Record<string, unknown>).slug ?? (m as Record<string, unknown>).model))
        .filter((id): id is string => typeof id === "string" && isUsableOpenAIChatModel(id))
        .sort();
      if (models.length) return models;
    } catch { /* try next */ }
  }
  return [];
}

function isUsableOpenAIChatModel(id: string): boolean {
  if (/(embedding|embed|whisper|tts|audio|realtime|image|dall-e|moderation|transcribe|search)/i.test(id)) return false;
  return (
    id.startsWith("gpt-") ||
    id.startsWith("o1") ||
    id.startsWith("o3") ||
    id.startsWith("o4") ||
    id.startsWith("chatgpt-")
  );
}
