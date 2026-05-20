import type { ProviderAuth } from "../auth.js";

const API_BASE = "https://api.anthropic.com/v1";

export interface Message { role: string; content: string | ContentPart[]; }
// Allow extra keys so tool_use / tool_result blocks can be passed through
export interface ContentPart { type: string; text?: string; [key: string]: unknown; }

export function isAnthropicModel(model: string): boolean {
  return model.startsWith("claude-");
}

// claude-3-7+, claude-sonnet-4+, claude-opus-4+ support extended thinking
export function supportsThinking(model: string): boolean {
  return /^claude-(3-7|opus-4|sonnet-4|haiku-4)/.test(model);
}

export async function callAnthropic(
  auth: ProviderAuth,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
  enableThinking = false,
  tools?: unknown[],
  betas?: string[]
): Promise<Response> {
  // OAuth official: always use Bearer token ??routes through Claude Code subscription quota
  // (create_api_key keys bill against separate API credits, not the subscription)
  if (auth.method === "oauth-official" && auth.oauthToken) {
    return callAnthropicBearer(auth.oauthToken, model, messages, systemPrompt, stream, signal, enableThinking, tools, betas);
  }
  if (auth.method === "oauth-unofficial" && auth.sessionToken) {
    return callAnthropicUnofficial(auth.sessionToken, model, messages, systemPrompt, stream, signal);
  }
  if (auth.apiKey) {
    return callAnthropicAPI(auth.apiKey, model, messages, systemPrompt, stream, signal, enableThinking, tools, betas);
  }
  throw new Error("Anthropic: no valid authentication configured");
}

function serializeMessages(messages: Message[]): unknown[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    const parts = m.content;
    // If any part has a non-text/thinking/thinking type (e.g. tool_use, tool_result),
    // pass the content array through as-is ??it's already Anthropic-formatted.
    const hasSpecial = parts.some(p => p.type !== "text" && p.type !== "thinking");
    if (hasSpecial) return { role: m.role, content: parts };
    return {
      role: m.role,
      content: parts.map(c => c.type === "thinking" ? c : { type: "text", text: c.text ?? "" }),
    };
  });
}

async function callAnthropicAPI(
  apiKey: string,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
  enableThinking = false,
  tools?: unknown[],
  betas?: string[]
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: enableThinking ? 16000 : 8192,
    messages: serializeMessages(messages),
    stream,
  };
  if (systemPrompt) body.system = systemPrompt;
  if (enableThinking) body.thinking = { type: "enabled", budget_tokens: 8000 };
  if (tools?.length) body.tools = tools;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (betas?.length) headers["anthropic-beta"] = betas.join(",");

  return fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
}

async function callAnthropicBearer(
  accessToken: string,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
  enableThinking = false,
  tools?: unknown[],
  betas?: string[]
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: enableThinking ? 16000 : 8192,
    messages: serializeMessages(messages),
    stream,
  };
  if (systemPrompt) body.system = systemPrompt;
  if (enableThinking) body.thinking = { type: "enabled", budget_tokens: 8000 };
  if (tools?.length) body.tools = tools;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "authorization": `Bearer ${accessToken}`,
    "anthropic-version": "2023-06-01",
  };
  if (betas?.length) headers["anthropic-beta"] = betas.join(",");

  return fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
}

async function callAnthropicUnofficial(
  _sessionToken: string,
  _model: string,
  _messages: Message[],
  _systemPrompt: string | undefined,
  _stream: boolean,
  _signal?: AbortSignal
): Promise<Response> {
  // Claude.ai's internal API requires a multi-step conversation protocol
  // (create conversation ??stream completion) that differs significantly from
  // the Anthropic API. Not implemented ??use an API key instead.
  throw new Error(
    "Unofficial Claude.ai session auth is not supported. Please add an Anthropic API key in the gateway UI."
  );
}

export async function getAnthropicModels(auth: ProviderAuth): Promise<string[]> {
  if (auth.method === "oauth-official") {
    return ["claude-haiku-4-5-20251001"];
  }
  if (auth.method === "oauth-unofficial") {
    return [];
  }
  if (!auth.apiKey) {
    return [];
  }
  try {
    const res = await fetch(`${API_BASE}/models`, {
      headers: { "x-api-key": auth.apiKey, "anthropic-version": "2023-06-01" },
    });
    if (!res.ok) throw new Error("failed");
    const data = await res.json() as { data: { id: string }[] };
    return data.data.map((m) => m.id);
  } catch {
    return [];
  }
}
