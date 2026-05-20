import type { ProviderAuth } from "../auth.js";
import type { Message } from "./anthropic.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function isGoogleModel(model: string): boolean {
  return model.startsWith("gemini-");
}

export async function callGoogle(
  auth: ProviderAuth,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
  tools?: unknown[],
  prebuiltContents?: unknown[]
): Promise<Response> {
  const apiKey = auth.apiKey || auth.oauthToken;
  if (!apiKey) throw new Error("Google: no valid authentication configured");

  const contents = prebuiltContents ?? messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string"
      ? m.content
      : m.content.map((c) => c.text ?? "").join("") }],
  }));

  const body: Record<string, unknown> = { contents };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  if (tools?.length) {
    body.tools = [{ functionDeclarations: tools }];
  }

  const endpoint = stream
    ? `${API_BASE}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
    : `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;

  return fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export async function getGoogleModels(auth: ProviderAuth): Promise<string[]> {
  const apiKey = auth.apiKey || auth.oauthToken;
  if (!apiKey) return [];
  try {
    const res = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (!res.ok) throw new Error("failed");
    const data = await res.json() as { models: { name: string; supportedGenerationMethods?: string[] }[] };
    return data.models
      .filter((m) => (m.supportedGenerationMethods ?? []).some(method => method === "generateContent" || method === "streamGenerateContent"))
      .map((m) => m.name.replace("models/", ""))
      .filter((id) =>
        id.startsWith("gemini-") &&
        !/(embedding|embed|tts|audio|image|robotics|computer-use)/i.test(id)
      );
  } catch {
    return [];
  }
}

// Google OAuth endpoints
export const GOOGLE_OAUTH = {
  clientId: "", // user must configure
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope: "https://www.googleapis.com/auth/generative-language",
};
