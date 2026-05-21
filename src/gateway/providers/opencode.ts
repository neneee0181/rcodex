import type { Message } from "./anthropic.js";

const COMPLETIONS_URL = "https://opencode.ai/zen/v1/chat/completions";
const MESSAGES_URL = "https://opencode.ai/zen/v1/messages";

// Models from 9router reference (currently commented-out upstream; kept here for availability)
export const OPENCODE_MODELS: string[] = [
  "nemotron-3-super-free",
  "qwen3.6-plus-free",
  "big-pickle",
  "minimax-m2.5-free",
  "trinity-large-preview-free",
];

// big-pickle routes through the Claude Messages API format
const CLAUDE_FORMAT_MODELS = new Set(["big-pickle"]);

function usesClaude(model: string): boolean {
  return CLAUDE_FORMAT_MODELS.has(model);
}

// ── OpenAI chat completions format ──────────────────────────────────────────
function callCompletions(
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  const allMessages: { role: string; content: string | unknown }[] = [];
  if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
  allMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })));

  return fetch(COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer public",
      "x-opencode-client": "desktop",
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

// ── Claude Messages API format (for big-pickle) ────────────────────────────
function callMessages(
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream,
  };
  if (systemPrompt) body.system = systemPrompt;

  return fetch(MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer public",
      "x-opencode-client": "desktop",
    },
    body: JSON.stringify(body),
    signal,
  });
}

// ── Public interface ────────────────────────────────────────────────────────
export async function callOpenCode(
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  if (usesClaude(model)) {
    return callMessages(model, messages, systemPrompt, stream, signal);
  }
  return callCompletions(model, messages, systemPrompt, stream, signal);
}

export function getOpenCodeModels(): string[] {
  return [...OPENCODE_MODELS];
}
