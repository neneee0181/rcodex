import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const RCODEX_DIR = join(homedir(), ".rcodex");
const CONFIG_PATH = join(RCODEX_DIR, "gateway.json");
const GATEWAY_LOG_PATH = join(RCODEX_DIR, "gateway.log");
export const DEFAULT_BODY_LIMIT_MIB = 64;

// A single (account, model) slot in the active output routing chain
export interface ModelSlot {
  slotId: string;
  model: string;
  order: number;
}

// One authenticated account ??same provider can have multiple accounts
export interface Account {
  id: string;
  provider: "anthropic" | "openai" | "google" | "ollama" | "antigravity" | "copilot" | "kiro" | "vertex" | "opencode" | "freetier" | string;
  label: string;
  method: "apikey" | "oauth-official" | "oauth-unofficial" | "local";
  apiKey?: string;
  sessionToken?: string;
  oauthToken?: string;
  oauthRefresh?: string;
  oauthExpiry?: number;
  projectId?: string;
  connectedAt: string;
  // Legacy single-slot fields (kept for migration / backwards compat)
  selectedModel?: string;
  connectedToOut: boolean;
  connectedOrder?: number;
  // Multi-slot routing: each slot = one canvas node with its own model & priority
  activeModels?: ModelSlot[];
  // Pi Agent node connection
  connectedToPi?: boolean;
  piModels?: string[];
}

// Kept for compatibility with existing provider call signatures
export interface ProviderAuth {
  apiKey?: string;
  sessionToken?: string;
  oauthToken?: string;
  oauthRefresh?: string;
  oauthExpiry?: number;
  method?: "apikey" | "oauth-official" | "oauth-unofficial";
  connectedAt?: string;
  selectedModel?: string;
  connectedToOut?: boolean;
}

export interface GatewayConfig {
  port: number;
  bodyLimitMiB: number;
  pid?: number;
  accounts: Account[];
  ollamaBaseUrl: string;
  uiState?: {
    pos?: Record<string, { x: number; y: number } | unknown>;
    canvas?: string[];
    slots?: Record<string, { accountId: string; model: string } | unknown>;
    hidden?: string[];
    piConns?: string[];
  };
}

export function accountToProviderAuth(account: Account): ProviderAuth {
  return {
    apiKey: account.apiKey,
    sessionToken: account.sessionToken,
    oauthToken: account.oauthToken,
    oauthRefresh: account.oauthRefresh,
    oauthExpiry: account.oauthExpiry,
    method: account.method as "apikey" | "oauth-official" | "oauth-unofficial",
    connectedAt: account.connectedAt,
    selectedModel: account.selectedModel,
    connectedToOut: account.connectedToOut,
  };
}

const DEFAULT_CONFIG: GatewayConfig = {
  port: 3141,
  bodyLimitMiB: DEFAULT_BODY_LIMIT_MIB,
  accounts: [],
  ollamaBaseUrl: "http://localhost:11434",
};

function ensureDir(): void {
  if (!existsSync(RCODEX_DIR)) mkdirSync(RCODEX_DIR, { recursive: true });
}

function kst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

function appendGatewayLifecycleLog(message: string): void {
  try {
    ensureDir();
    writeFileSync(GATEWAY_LOG_PATH, `[${kst()}] ${message}` + "\n", { flag: "a", encoding: "utf-8" });
  } catch { /* ignore logging failures */ }
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeBodyLimitMiB(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BODY_LIMIT_MIB;
  return Math.min(1024, Math.max(1, Math.floor(n)));
}

// One-time migration from the old providers-map format
function migrateOldFormat(raw: Record<string, unknown>): GatewayConfig {
  const old = raw.providers as Record<string, Record<string, unknown>> | undefined;
  if (!old) return raw as unknown as GatewayConfig;

  const accounts: Account[] = [];
  const LABELS: Record<string, string> = { anthropic: "Claude", openai: "ChatGPT / Codex", google: "Gemini" };

  for (const p of ["anthropic", "openai", "google"] as const) {
    const auth = old[p];
    if (!auth?.method) continue;
    accounts.push({
      id: genId(p),
      provider: p,
      label: LABELS[p],
      method: auth.method as Account["method"],
      apiKey: auth.apiKey as string | undefined,
      sessionToken: auth.sessionToken as string | undefined,
      oauthToken: auth.oauthToken as string | undefined,
      oauthRefresh: auth.oauthRefresh as string | undefined,
      oauthExpiry: auth.oauthExpiry as number | undefined,
      connectedAt: (auth.connectedAt as string) || new Date().toISOString(),
      selectedModel: auth.selectedModel as string | undefined,
      connectedToOut: (auth.connectedToOut as boolean) || false,
    });
  }

  return {
    port: (raw.port as number) || 3141,
    bodyLimitMiB: normalizeBodyLimitMiB(raw.bodyLimitMiB),
    pid: raw.pid as number | undefined,
    accounts,
    ollamaBaseUrl: (old.ollama?.baseUrl as string) || "http://localhost:11434",
  };
}

export function loadConfig(): GatewayConfig {
  ensureDir();
  if (!existsSync(CONFIG_PATH)) return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    if (raw.providers && !raw.accounts) {
      const migrated = migrateOldFormat(raw);
      saveConfig(migrated);
      return migrated;
    }
    if (!raw.accounts) raw.accounts = [];
    if (!raw.ollamaBaseUrl) raw.ollamaBaseUrl = "http://localhost:11434";
    let dirty = false;
    const bodyLimitMiB = normalizeBodyLimitMiB(raw.bodyLimitMiB);
    if (raw.bodyLimitMiB !== bodyLimitMiB) {
      raw.bodyLimitMiB = bodyLimitMiB;
      dirty = true;
    }
    const config = raw as unknown as GatewayConfig;

    // Migration 1: assign connectedOrder to connected accounts that pre-date this field
    let next = Math.max(-1, ...config.accounts.map(a => a.connectedOrder ?? -1)) + 1;
    for (const account of config.accounts) {
      if (account.connectedToOut && account.connectedOrder === undefined) {
        account.connectedOrder = next++;
        dirty = true;
      }
    }

    // Migration 2: convert legacy connectedToOut/selectedModel into activeModels slots
    for (const account of config.accounts) {
      if (account.connectedToOut && !account.activeModels?.length) {
        account.activeModels = [{
          slotId: genId("slot"),
          model: account.selectedModel || "",
          order: account.connectedOrder ?? 999,
        }];
        dirty = true;
      }
    }

    if (dirty) saveConfig(config);
    return config;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(config: GatewayConfig): void {
  ensureDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function addAccount(
  provider: Account["provider"],
  label: string,
  method: Account["method"],
  credentials: Pick<Account, "apiKey" | "sessionToken" | "oauthToken" | "oauthRefresh" | "oauthExpiry">
): Account {
  const config = loadConfig();
  const account: Account = {
    id: genId(provider),
    provider,
    label,
    method,
    connectedAt: new Date().toISOString(),
    connectedToOut: false,
    ...credentials,
  };
  config.accounts.push(account);
  saveConfig(config);
  return account;
}

export function updateAccountOAuth(
  id: string,
  accessToken: string,
  refreshToken: string,
  expiry: number
): void {
  const config = loadConfig();
  const account = config.accounts.find(a => a.id === id);
  if (!account) return;
  account.oauthToken = accessToken;
  account.oauthRefresh = refreshToken;
  account.oauthExpiry = expiry;
  saveConfig(config);
}

export function updateAccountProjectId(id: string, projectId: string): void {
  const config = loadConfig();
  const account = config.accounts.find(a => a.id === id);
  if (!account) return;
  account.projectId = projectId;
  saveConfig(config);
}

export function removeAccount(id: string): void {
  const config = loadConfig();
  config.accounts = config.accounts.filter(a => a.id !== id);
  saveConfig(config);
}

// Model slot management

export function addModelSlot(accountId: string, model: string, clientSlotId?: string): ModelSlot | null {
  const config = loadConfig();
  const account = config.accounts.find(a => a.id === accountId);
  if (!account) return null;
  if (!account.activeModels) account.activeModels = [];

  // If slot with this ID already exists, return it (idempotent)
  if (clientSlotId) {
    const existing = account.activeModels.find(s => s.slotId === clientSlotId);
    if (existing) return existing;
  }

  // Global max order across all accounts
  let maxOrder = -1;
  for (const acc of config.accounts) {
    for (const s of acc.activeModels ?? []) {
      if (s.order > maxOrder) maxOrder = s.order;
    }
  }

  const slot: ModelSlot = { slotId: clientSlotId ?? genId("slot"), model, order: maxOrder + 1 };
  account.activeModels.push(slot);
  account.connectedToOut = true;
  saveConfig(config);
  return slot;
}

export function removeModelSlot(accountId: string, slotId: string): void {
  const config = loadConfig();
  const account = config.accounts.find(a => a.id === accountId);
  if (!account) return;
  account.activeModels = (account.activeModels ?? []).filter(s => s.slotId !== slotId);
  if (!account.activeModels.length) {
    account.connectedToOut = false;
    delete account.connectedOrder;
  }
  saveConfig(config);
}

export function reorderAllSlots(orderedItems: { accountId: string; slotId: string }[]): void {
  const config = loadConfig();
  orderedItems.forEach(({ accountId, slotId }, idx) => {
    const account = config.accounts.find(a => a.id === accountId);
    const slot = account?.activeModels?.find(s => s.slotId === slotId);
    if (slot) slot.order = idx;
  });
  saveConfig(config);
}

// Legacy: kept for backward compat with old node-state endpoint
export function setAccountNodeState(
  id: string,
  selectedModel: string | null,
  connectedToOut: boolean,
  connectedOrder?: number
): void {
  const config = loadConfig();
  const account = config.accounts.find(a => a.id === id);
  if (!account) return;
  account.selectedModel = selectedModel ?? undefined;
  account.connectedToOut = connectedToOut;
  if (connectedOrder !== undefined) account.connectedOrder = connectedOrder;
  else if (!connectedToOut) delete account.connectedOrder;
  saveConfig(config);
}

export function connectPiAccount(accountId: string, model: string): void {
  const config = loadConfig();
  const account = config.accounts.find(a => a.id === accountId);
  if (!account) return;
  account.connectedToPi = true;
  if (!account.piModels) account.piModels = [];
  if (model && !account.piModels.includes(model)) account.piModels.push(model);
  saveConfig(config);
}

export function disconnectPiAccount(accountId: string, model?: string): void {
  const config = loadConfig();
  const account = config.accounts.find(a => a.id === accountId);
  if (!account) return;
  if (model) {
    account.piModels = (account.piModels ?? []).filter(m => m !== model);
    if (!account.piModels.length) { account.connectedToPi = false; delete account.piModels; }
  } else {
    account.connectedToPi = false;
    delete account.piModels;
  }
  saveConfig(config);
}

export function reorderConnectedAccounts(orderedIds: string[]): void {
  const config = loadConfig();
  orderedIds.forEach((id, idx) => {
    const account = config.accounts.find(a => a.id === id);
    if (account) account.connectedOrder = idx;
  });
  saveConfig(config);
}

export function saveGatewayPid(pid: number): void {
  const config = loadConfig();
  config.pid = pid;
  saveConfig(config);
}

export function clearGatewayPid(): void {
  const config = loadConfig();
  delete config.pid;
  saveConfig(config);
}

export function killExistingGateway(): boolean {
  const config = loadConfig();
  if (!config.pid) return false;
  const pid = config.pid;
  clearGatewayPid();
  try {
    process.kill(pid, 0);
    appendGatewayLifecycleLog(`[gateway] lifecycle: parent killing existing gateway pid=${pid}`);
    process.kill(pid);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    appendGatewayLifecycleLog(`[gateway] lifecycle: parent kill skipped pid=${pid} (${msg})`);
    return false;
  }
}
