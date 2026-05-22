// Free-tier / third-party provider definitions and generic caller.
// Each provider speaks either the OpenAI or Claude (Anthropic) messages format
// and is reachable at a static base URL with an API key.

// ── Types ────────────────────────────────────────────────────────────────────

export interface FreetierProviderDef {
  id: string;            // provider id (matches Account.provider)
  name: string;          // display name
  baseUrl: string;       // API endpoint URL
  format: "openai" | "claude"; // API format
  authHeader?: string;   // 'x-api-key' for claude format / enally, 'Authorization' (default Bearer) for openai
  noAuth?: boolean;      // true if no auth needed (e.g. uncloseai)
  models: { id: string; name: string }[];
}

// ── Provider registry ────────────────────────────────────────────────────────

function m(id: string, name?: string): { id: string; name: string } {
  return { id, name: name ?? id };
}

export const FREETIER_PROVIDERS: FreetierProviderDef[] = [
  {
    id: "agentrouter",
    name: "AgentRouter",
    baseUrl: "https://agentrouter.org/v1/messages",
    format: "claude",
    authHeader: "x-api-key",
    models: [
      m("claude-opus-4-6"),
      m("claude-haiku-4-5-20251001"),
      m("glm-5.1"),
      m("deepseek-v3.2"),
    ],
  },
  {
    id: "aimlapi",
    name: "AIML API",
    baseUrl: "https://api.aimlapi.com/v1/chat/completions",
    format: "openai",
    models: [
      m("gpt-4o"),
      m("gpt-4o-mini"),
      m("claude-3-5-sonnet-20241022"),
      m("gemini-2.0-flash-exp"),
      m("meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"),
    ],
  },
  {
    id: "novita",
    name: "Novita AI",
    baseUrl: "https://api.novita.ai/v3/openai/chat/completions",
    format: "openai",
    models: [
      m("deepseek/deepseek-r1"),
      m("deepseek/deepseek-v3"),
      m("meta-llama/llama-3.3-70b-instruct"),
      m("qwen/qwen-2.5-72b-instruct"),
    ],
  },
  {
    id: "sambanova",
    name: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("Meta-Llama-3.1-405B-Instruct"),
      m("Meta-Llama-3.1-70B-Instruct"),
      m("Meta-Llama-3.1-8B-Instruct"),
    ],
  },
  {
    id: "deepinfra",
    name: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai/chat/completions",
    format: "openai",
    models: [
      m("meta-llama/Meta-Llama-3.1-70B-Instruct"),
      m("deepseek-ai/DeepSeek-V3"),
      m("Qwen/Qwen2.5-72B-Instruct"),
    ],
  },
  {
    id: "scaleway",
    name: "Scaleway",
    baseUrl: "https://api.scaleway.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("qwen3-235b-a22b-instruct-2507"),
      m("llama-3.3-70b-instruct"),
      m("mistral-small-3.1-24b-instruct-2503"),
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("gpt-oss-120b"),
      m("zai-glm-4.7"),
      m("llama-3.3-70b"),
      m("qwen-3-32b"),
    ],
  },
  {
    id: "kluster",
    name: "Kluster AI",
    baseUrl: "https://api.kluster.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("deepseek-ai/DeepSeek-R1"),
      m("meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"),
      m("Qwen/Qwen3-235B-A22B-Instruct"),
    ],
  },
  {
    id: "glhf",
    name: "GLHF",
    baseUrl: "https://glhf.chat/api/openai/v1/chat/completions",
    format: "openai",
    models: [
      m("hf:meta-llama/Meta-Llama-3.1-405B-Instruct"),
      m("hf:meta-llama/Meta-Llama-3.1-70B-Instruct"),
      m("hf:Qwen/Qwen2.5-72B-Instruct"),
    ],
  },
  {
    id: "morph",
    name: "Morph",
    baseUrl: "https://api.morphllm.com/v1/chat/completions",
    format: "openai",
    models: [
      m("morph-v3-large"),
      m("morph-v3-fast"),
    ],
  },
  {
    id: "longcat",
    name: "LongCat",
    baseUrl: "https://api.longcat.chat/openai/v1/chat/completions",
    format: "openai",
    models: [
      m("LongCat-Flash-Chat"),
      m("LongCat-Flash-Thinking"),
      m("LongCat-Flash-Lite"),
    ],
  },
  {
    id: "puter",
    name: "Puter",
    baseUrl: "https://api.puter.com/puterai/openai/v1/chat/completions",
    format: "openai",
    models: [
      m("gpt-5"),
      m("claude-opus-4"),
      m("gemini-3-pro-preview"),
      m("grok-4"),
      m("deepseek-chat"),
    ],
  },
  {
    id: "uncloseai",
    name: "UncloseAI",
    baseUrl: "https://hermes.ai.unturf.com/v1/chat/completions",
    format: "openai",
    noAuth: true,
    models: [
      m("auto"),
      m("gpt-4o-mini"),
    ],
  },
  {
    id: "nscale",
    name: "Nscale",
    baseUrl: "https://inference.api.nscale.com/v1/chat/completions",
    format: "openai",
    models: [
      m("meta-llama/Llama-3.3-70B-Instruct"),
      m("Qwen/Qwen2.5-Coder-32B-Instruct"),
    ],
  },
  {
    id: "baseten",
    name: "Baseten",
    baseUrl: "https://inference.baseten.co/v1/chat/completions",
    format: "openai",
    models: [
      m("deepseek-ai/DeepSeek-R1"),
      m("meta-llama/Llama-3.3-70B-Instruct"),
    ],
  },
  {
    id: "publicai",
    name: "PublicAI",
    baseUrl: "https://api.publicai.co/v1/chat/completions",
    format: "openai",
    models: [
      m("auto"),
    ],
  },
  {
    id: "nous-research",
    name: "Nous Research",
    baseUrl: "https://inference-api.nousresearch.com/v1/chat/completions",
    format: "openai",
    models: [
      m("Hermes-4-405B"),
      m("Hermes-4-70B"),
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    format: "openai",
    models: [
      m("llama-3.3-70b-versatile"),
      m("meta-llama/llama-4-maverick-17b-128e-instruct"),
      m("qwen/qwen3-32b"),
      m("openai/gpt-oss-120b"),
    ],
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1/chat/completions",
    format: "openai",
    models: [
      m("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
      m("deepseek-ai/DeepSeek-R1"),
      m("Qwen/Qwen3-235B-A22B"),
      m("meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"),
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1/chat/completions",
    format: "openai",
    models: [
      m("accounts/fireworks/models/deepseek-v3p1"),
      m("accounts/fireworks/models/llama-v3p3-70b-instruct"),
      m("accounts/fireworks/models/qwen3-235b-a22b"),
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    format: "openai",
    models: [
      m("anthropic/claude-opus-4"),
      m("google/gemini-2.5-pro-preview"),
      m("meta-llama/llama-4-maverick"),
      m("deepseek/deepseek-r1"),
      m("qwen/qwen3-235b-a22b"),
      m("openai/gpt-4o"),
      m("x-ai/grok-4"),
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/chat/completions",
    format: "openai",
    models: [
      m("deepseek-v4-pro"),
      m("deepseek-v4-flash"),
      m("deepseek-chat"),
      m("deepseek-reasoner"),
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("mistral-large-latest"),
      m("codestral-latest"),
      m("mistral-medium-latest"),
    ],
  },
  {
    id: "xai",
    name: "xAI",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("grok-4"),
      m("grok-4-fast-reasoning"),
      m("grok-code-fast-1"),
      m("grok-3"),
    ],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai/chat/completions",
    format: "openai",
    models: [
      m("sonar-pro"),
      m("sonar"),
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    baseUrl: "https://api.cohere.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("command-r-plus-08-2024"),
      m("command-r-08-2024"),
      m("command-a-03-2025"),
    ],
  },
  {
    id: "nebius",
    name: "Nebius",
    baseUrl: "https://api.studio.nebius.ai/v1/chat/completions",
    format: "openai",
    models: [
      m("meta-llama/Llama-3.3-70B-Instruct"),
    ],
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
    format: "openai",
    models: [
      m("deepseek-ai/DeepSeek-V3.2"),
      m("deepseek-ai/DeepSeek-R1"),
      m("Qwen/Qwen3-235B-A22B-Instruct-2507"),
    ],
  },
  {
    id: "hyperbolic",
    name: "Hyperbolic",
    baseUrl: "https://api.hyperbolic.xyz/v1/chat/completions",
    format: "openai",
    models: [
      m("Qwen/QwQ-32B"),
      m("deepseek-ai/DeepSeek-R1"),
      m("deepseek-ai/DeepSeek-V3"),
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    format: "openai",
    models: [
      m("minimaxai/minimax-m2.7"),
      m("z-ai/glm4.7"),
    ],
  },
  {
    id: "enally",
    name: "Enally",
    baseUrl: "https://ai.enally.in/v1/chat/completions",
    format: "openai",
    authHeader: "x-api-key",
    models: [
      m("gpt-4o"),
      m("gpt-4o-mini"),
      m("claude-3-5-sonnet"),
    ],
  },
];

// ── Lookup index ─────────────────────────────────────────────────────────────

const providerMap = new Map<string, FreetierProviderDef>(
  FREETIER_PROVIDERS.map((p) => [p.id, p]),
);

// ── Public helpers ───────────────────────────────────────────────────────────

export function getFreetierProvider(providerId: string): FreetierProviderDef | undefined {
  return providerMap.get(providerId);
}

export function getFreetierModels(providerId: string): string[] {
  return providerMap.get(providerId)?.models.map((m) => m.id) ?? [];
}

export function isFreetierProvider(providerId: string): boolean {
  return providerMap.has(providerId);
}

export function getAllFreetierProviderIds(): string[] {
  return FREETIER_PROVIDERS.map((p) => p.id);
}

// ── Generic caller ───────────────────────────────────────────────────────────

export async function callFreetier(
  providerId: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string | unknown }[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
): Promise<Response> {
  const provider = providerMap.get(providerId);
  if (!provider) throw new Error(`Unknown free-tier provider: ${providerId}`);

  if (provider.format === "claude") {
    return callClaude(provider, apiKey, model, messages, systemPrompt, stream, signal);
  }
  return callOpenAI(provider, apiKey, model, messages, systemPrompt, stream, signal);
}

// ── OpenAI-compatible call ───────────────────────────────────────────────────

function callOpenAI(
  provider: FreetierProviderDef,
  apiKey: string,
  model: string,
  messages: { role: string; content: string | unknown }[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
): Promise<Response> {
  const allMessages: { role: string; content: string | unknown }[] = [];
  if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
  allMessages.push(...messages.map((msg) => ({ role: msg.role, content: msg.content })));

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (!provider.noAuth) {
    if (provider.authHeader === "x-api-key") {
      headers["x-api-key"] = apiKey;
    } else {
      headers["authorization"] = `Bearer ${apiKey}`;
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages: allMessages,
    stream,
  };
  if (stream) body.stream_options = { include_usage: true };

  return fetch(provider.baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
}

// ── Claude / Anthropic-compatible call ───────────────────────────────────────

function callClaude(
  provider: FreetierProviderDef,
  apiKey: string,
  model: string,
  messages: { role: string; content: string | unknown }[],
  systemPrompt: string | undefined,
  stream: boolean,
  signal?: AbortSignal,
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
    stream,
  };
  if (systemPrompt) body.system = systemPrompt;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "claude-code-20250219,interleaved-thinking-2025-05-14",
  };

  if (provider.authHeader === "x-api-key") {
    headers["x-api-key"] = apiKey;
  } else {
    headers["authorization"] = `Bearer ${apiKey}`;
  }

  return fetch(provider.baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
}
