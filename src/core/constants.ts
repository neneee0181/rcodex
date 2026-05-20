// Single fixed provider key in Codex config ??keeping the name stable preserves
// SQLite thread history when switching between gateway providers.
export const MANAGED_PROVIDER_KEY = "rcodex";

// Built-in Codex OpenAI provider key (used when reverting from gateway)
export const OPENAI_PROVIDER_KEY = "openai";

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com";
