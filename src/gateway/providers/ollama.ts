import type { Message } from "./anthropic.js";
import { existsSync, readFileSync } from "fs";

function imageMime(value: string): string {
  const lower = value.toLowerCase().split("?")[0];
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

function localImageDataUrl(value: string): string | undefined {
  let filePath = value.startsWith("file://") ? value.slice("file://".length) : value;
  if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1);
  try { filePath = decodeURIComponent(filePath); } catch { /* keep raw */ }
  if (!existsSync(filePath)) return undefined;
  const data = readFileSync(filePath).toString("base64");
  return `data:${imageMime(filePath)};base64,${data}`;
}

function imageUrlFromValue(raw: string): string | undefined {
  const value = raw.trim().replace(/[)\]}>.,;:'"]+$/g, "");
  if (/^data:image\//i.test(value) || /^https?:\/\//i.test(value)) return value;
  return localImageDataUrl(value);
}

function contentWithDetectedImages(text: string): string | unknown[] {
  const imageParts: unknown[] = [];
  const seen = new Set<string>();
  const patterns = [
    /((?:file:\/\/\/?|[A-Za-z]:[\\/])[^\r\n"'<>]+?\.(?:png|jpe?g|webp|gif|bmp|svg))/gi,
    /((?:\/|~\/)[^\r\n"'<>]+?\.(?:png|jpe?g|webp|gif|bmp|svg))/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1];
      const url = imageUrlFromValue(raw);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      imageParts.push({ type: "image_url", image_url: { url } });
    }
  }
  return imageParts.length ? [{ type: "text", text }, ...imageParts] : text;
}

function imageUrlFromPart(part: Record<string, unknown>): string | undefined {
  const source = part.source as Record<string, unknown> | undefined;
  if (source?.type === "base64" && typeof source.data === "string") {
    return `data:${String(source.media_type ?? "image/png")};base64,${source.data}`;
  }

  const rawImageUrl = part.image_url as string | { url?: string } | undefined;
  const raw = typeof rawImageUrl === "string"
    ? rawImageUrl
    : rawImageUrl?.url ?? part.url ?? part.path ?? part.file_path ?? part.filename;
  if (typeof raw !== "string" || !raw) return undefined;
  return imageUrlFromValue(raw);
}

export function toOllamaContent(content: Message["content"]): string | unknown[] {
  if (typeof content === "string") return contentWithDetectedImages(content);
  const parts: unknown[] = [];
  for (const part of content as Record<string, unknown>[]) {
    if (part.type === "image" || part.type === "input_image" || part.image_url || part.source) {
      const url = imageUrlFromPart(part);
      if (url) parts.push({ type: "image_url", image_url: { url } });
      continue;
    }
    const text = typeof part.text === "string" ? part.text : "";
    if (text) parts.push({ type: "text", text });
  }
  return parts.length ? parts : content.map((c) => c.text ?? "").join("");
}


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
      content: toOllamaContent(m.content),
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
