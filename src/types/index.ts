export interface ModelProvider {
  name: string;
  base_url: string;
  env_key?: string;
  wire_api?: string;
  requires_openai_auth?: boolean;
}

export interface Profile {
  model: string;
  model_provider: string;
}

export interface CodexConfig {
  model?: string;
  model_provider?: string;
  oss_provider?: string;
  approval_policy?: string;
  sandbox_mode?: string;
  model_providers?: Record<string, ModelProvider>;
  profiles?: Record<string, Profile>;
  [key: string]: unknown;
}

export interface SyncOptions {
  dryRun: boolean;
  showHeader?: boolean;
}
