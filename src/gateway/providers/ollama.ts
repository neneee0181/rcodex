import type { Message } from "./anthropic.js";

export function isOllamaModel(model: string): boolean {
  return model.includes(":") || model.includes("/");
}

export async function callOllama(
  baseUrl: string,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
  tools?: unknown[],
  prebuiltMessages?: unknown[]
): Promise<Response> {
  const allMessages: unknown[] = prebuiltMessages ?? (() => {
    const msgs: unknown[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages.map((m) => ({
      role: m.role,
      // Ollama only accepts string content ??flatten content-part arrays
      content: typeof m.content === "string"
        ? m.content
        : m.content.map((c) => c.text ?? "").join(""),
    })));
    return msgs;
  })();

  const body: Record<string, unknown> = { model, messages: allMessages, stream };
  if (stream) body.stream_options = { include_usage: true };
  if (tools?.length) body.tools = tools;
  // Enable thinking mode for models that support it (qwen3, deepseek-r1, etc.).
  // Ollama passes unknown options to the model runtime ??unsupported models ignore it.
  body.options = { think: true };

  return fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export async function getOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json() as { models: { name: string }[] };
    return data.models.map((m) => m.name);
  } catch {
    return [];
  }
}

export async function isOllamaRunning(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
