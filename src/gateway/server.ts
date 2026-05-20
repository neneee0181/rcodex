import Fastify from "fastify";
import cors from "@fastify/cors";
import { createServer } from "net";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync, accessSync, constants } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getCodexConfigPath } from "../utils/paths.js";
import { readCodexConfig, writeCodexConfig } from "../core/config.js";
import { MANAGED_PROVIDER_KEY, OPENAI_PROVIDER_KEY } from "../core/constants.js";
import { isCodexRunning, killCodex, openCodexApp } from "../core/codex.js";
import { migrateThreads } from "../commands/migrate.js";
import {
  loadConfig, saveConfig, addAccount, removeAccount, setAccountNodeState, reorderConnectedAccounts,
  addModelSlot, removeModelSlot, reorderAllSlots, updateAccountProjectId,
  saveGatewayPid, clearGatewayPid, type GatewayConfig, type Account,
} from "./auth.js";
import { buildAuthUrl, waitForCallback, exchangeCode } from "./providers/openai-oauth-flow.js";
import { buildClaudeAuthUrl, waitForClaudeCallback, exchangeClaudeCode } from "./providers/claude-oauth-flow.js";
import { buildAntigravityAuthUrl, waitForAntigravityCallback, exchangeAntigravityCode, loadAntigravityProject } from "./providers/antigravity-oauth-flow.js";
import { ANTIGRAVITY_DEFAULT_MODELS, getAntigravityModels } from "./providers/antigravity.js";
import { getCopilotModels, startCopilotDeviceAuth, pollCopilotDeviceToken, getCopilotToken } from "./providers/copilot.js";
import { proxyRequest, streamProxyRequest, tryCodexPassthrough, requestLog, pushLog, flushLog, ensureFreshToken, glog, gwarn, gerr, type ResponsesRequest, type ResponsesResponse, type RequestLogEntry } from "./proxy.js";
import { getAnthropicModels } from "./providers/anthropic.js";
import { getOpenAIModels } from "./providers/openai.js";
import { getGoogleModels } from "./providers/google.js";
import { getOllamaModels } from "./providers/ollama.js";
import { accountToProviderAuth } from "./auth.js";
import { getHTML } from "./ui.js";

const execAsync = promisify(exec);
const startTime = Date.now();

function findFreePort(startPort: number, maxAttempts = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number, attempt: number) => {
      if (attempt >= maxAttempts) { reject(new Error(`No free port found starting from ${startPort}`)); return; }
      const server = createServer();
      server.listen(port, "127.0.0.1", () => { server.close(() => resolve(port)); });
      server.on("error", () => tryPort(port + 1, attempt + 1));
    };
    tryPort(startPort, 0);
  });
}

async function loadModelsForAccount(account: Account, ollamaBaseUrl: string): Promise<string[]> {
  const auth = accountToProviderAuth(account);
  try {
    switch (account.provider) {
      case "anthropic":    return await getAnthropicModels(auth);
      case "openai":       return await getOpenAIModels(auth);
      case "google":       return await getGoogleModels(auth);
      case "ollama":       return await getOllamaModels(ollamaBaseUrl);
      case "antigravity":  return await getAntigravityModels(auth.oauthToken ?? "", account.projectId);
      case "copilot":      return await getCopilotModels(auth.oauthToken ?? "");
      default:             return [];
    }
  } catch { return []; }
}

export interface GatewayServer {
  start(): Promise<number>;
  stop(): Promise<void>;
}

export function createGatewayServer(): GatewayServer {
  const fastify = Fastify({ logger: false });
  fastify.register(cors, { origin: "*" });

  let pendingOAuth: string | null = null;
  let oauthError: string | null = null;

  // Quota cache ??keyed by account.id, TTL 90s to avoid rate-limiting upstream APIs
  const QUOTA_TTL = 90_000;
  type QuotaEntry = {
    provider: string; label: string; id: string;
    five_hour?: { utilization: number; resets_at: string | number | null };
    seven_day?: { utilization: number; resets_at: string | number | null };
    primary?: { used: number; resets_at: string | number | null };
    secondary?: { used: number; resets_at: string | number | null };
    error?: string;
  };
  const quotaCache = new Map<string, { entry: QuotaEntry; ts: number }>();

  // ?�?� Web UI ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get("/", async (_req, reply) => {
    const config = loadConfig();
    reply.header("content-type", "text/html; charset=utf-8");
    return reply.send(getHTML(config.port));
  });

  // ?�?� Health check + status ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get("/api/status", async () => {
    const config = loadConfig();
    return {
      ok: true,
      port: config.port,
      pid: process.pid,
      uptimeMs: Date.now() - startTime,
      home: homedir(),
      accountCount: config.accounts.length,
      connectedCount: config.accounts.filter(a => a.connectedToOut).length,
      connectedProviders: config.accounts.filter(a => a.connectedToOut)
        .sort((a, b) => (a.connectedOrder ?? 999) - (b.connectedOrder ?? 999))
        .map(a => ({ label: a.label, provider: a.provider, model: a.selectedModel || "(auto)" })),
    };
  });

  // ?�?� Gateway log tail ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get<{ Querystring: { n?: string } }>("/api/logs", async (req) => {
    const n = Math.min(parseInt(req.query.n ?? "120"), 500);
    const logPath = join(homedir(), ".rcodex", "gateway.log");
    try {
      const content = readFileSync(logPath, "utf-8");
      const lines = content.split("\n").filter(Boolean);
      return { lines: lines.slice(-n) };
    } catch {
      return { lines: [] };
    }
  });

  // ?�?� Request history ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get("/api/requests", async () => ({ requests: [...requestLog].reverse().slice(0, 100) }));
  fastify.delete("/api/requests", async () => { requestLog.splice(0); return { ok: true }; });
  fastify.delete("/api/logs", async () => {
    const logPath = join(homedir(), ".rcodex", "gateway.log");
    try { writeFileSync(logPath, "", "utf-8"); } catch { /* ignore */ }
    return { ok: true };
  });

  // ?�?� Provider quota (Claude Code & Codex OAuth) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get<{ Querystring: { bust?: string } }>("/api/quota", async (req) => {
    const cfg = loadConfig();
    const bustId = req.query.bust;
    if (bustId) quotaCache.delete(bustId);
    const results: QuotaEntry[] = [];

    for (const rawAccount of cfg.accounts) {
      if (rawAccount.method !== "oauth-official" || !rawAccount.oauthToken) continue;

      // Return cached entry if still fresh
      const cached = quotaCache.get(rawAccount.id);
      if (cached && Date.now() - cached.ts < QUOTA_TTL) {
        results.push(cached.entry);
        continue;
      }

      const account = await ensureFreshToken(rawAccount);

      if (account.provider === "anthropic") {
        let entry: QuotaEntry;
        try {
          const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
            headers: {
              "authorization": `Bearer ${account.oauthToken}`,
              "anthropic-beta": "oauth-2025-04-20",
              "anthropic-version": "2023-06-01",
            },
            signal: AbortSignal.timeout(10_000),
          });
          if (res.ok) {
            const d = await res.json() as Record<string, unknown>;
            const fh = d.five_hour as { utilization?: number; resets_at?: string } | undefined;
            const sd = d.seven_day as { utilization?: number; resets_at?: string } | undefined;
            entry = {
              provider: "anthropic", label: account.label, id: account.id,
              five_hour: fh ? { utilization: fh.utilization ?? 0, resets_at: fh.resets_at ?? null } : undefined,
              seven_day: sd ? { utilization: sd.utilization ?? 0, resets_at: sd.resets_at ?? null } : undefined,
            };
          } else {
            entry = { provider: "anthropic", label: account.label, id: account.id, error: `${res.status}` };
          }
        } catch (e) {
          entry = { provider: "anthropic", label: account.label, id: account.id, error: String(e) };
        }
        // Only cache successful responses (not errors)
        if (!entry.error) quotaCache.set(account.id, { entry, ts: Date.now() });
        results.push(entry);
      }

      if (account.provider === "openai") {
        let entry: QuotaEntry;
        try {
          const res = await fetch("https://chatgpt.com/backend-api/wham/usage", {
            headers: { "authorization": `Bearer ${account.oauthToken}`, "accept": "application/json" },
            signal: AbortSignal.timeout(10_000),
          });
          if (res.ok) {
            const d = await res.json() as Record<string, unknown>;
            const rl = (d.rate_limit ?? d.rate_limits ?? (d.rate_limits_by_limit_id as Record<string, unknown>)?.codex ?? {}) as Record<string, unknown>;
            const body = (rl.rate_limit && typeof rl.rate_limit === "object" ? rl.rate_limit : rl) as Record<string, unknown>;
            const primary = (body.primary_window ?? body.primary) as { used_percent?: number; percent_used?: number; reset_at?: string | number; resets_at?: string | number; reset_after_seconds?: number; reset_after?: number } | undefined;
            const secondary = (body.secondary_window ?? body.secondary) as { used_percent?: number; percent_used?: number; reset_at?: string | number; resets_at?: string | number; reset_after_seconds?: number; reset_after?: number } | undefined;
            const resetValue = (w: typeof primary) => {
              if (!w) return null;
              const absolute = w.reset_at ?? w.resets_at;
              if (absolute != null) return absolute;
              const relative = w.reset_after_seconds ?? w.reset_after;
              return typeof relative === "number" ? Date.now() + relative * 1000 : null;
            };
            entry = {
              provider: "openai", label: account.label, id: account.id,
              primary: primary ? { used: Math.min(100, primary.used_percent ?? primary.percent_used ?? 0), resets_at: resetValue(primary) } : undefined,
              secondary: secondary ? { used: Math.min(100, secondary.used_percent ?? secondary.percent_used ?? 0), resets_at: resetValue(secondary) } : undefined,
            };
          } else {
            entry = { provider: "openai", label: account.label, id: account.id, error: `${res.status}` };
          }
        } catch (e) {
          entry = { provider: "openai", label: account.label, id: account.id, error: String(e) };
        }
        if (!entry.error) quotaCache.set(account.id, { entry, ts: Date.now() });
        results.push(entry);
      }
    }

    return { quota: results };
  });

  // ?�?� Codex provider mode ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get("/api/codex-provider", async () => {
    const configPath = getCodexConfigPath();
    const config = readCodexConfig(configPath);
    const active = config.model_provider ?? MANAGED_PROVIDER_KEY;
    return { mode: active === MANAGED_PROVIDER_KEY ? "rcodex" : "openai", activeProvider: active };
  });

  fastify.post<{ Body: { mode: string } }>("/api/codex-provider", async (req, reply) => {
    const { mode } = req.body;
    if (mode !== "rcodex" && mode !== "openai") return reply.status(400).send({ error: "invalid mode" });
    const targetProvider = mode === "rcodex" ? MANAGED_PROVIDER_KEY : OPENAI_PROVIDER_KEY;

    // 1. Stop Codex (required before migration)
    if (await isCodexRunning()) {
      await killCodex();
      await new Promise(r => setTimeout(r, 800));
    }

    // 2. Update Codex config
    const configPath = getCodexConfigPath();
    const config = readCodexConfig(configPath);
    const gatewayPort = loadConfig().port;

    if (mode === "rcodex") {
      // Restore rcodex provider entry and activate it
      if (!config.model_providers) config.model_providers = {};
      config.model_providers[MANAGED_PROVIDER_KEY] = {
        name: "rcodex Gateway",
        base_url: `http://localhost:${gatewayPort}/v1`,
        wire_api: "responses",
      };
      config.model_provider = MANAGED_PROVIDER_KEY;
    } else {
      // Revert to Codex built-in OpenAI: remove model_provider key and rcodex entry
      // so Codex falls back to its default (no label shown)
      delete config.model_provider;
      if (config.model_providers) {
        delete config.model_providers[MANAGED_PROVIDER_KEY];
        if (Object.keys(config.model_providers).length === 0) {
          delete config.model_providers;
        }
      }
    }
    writeCodexConfig(configPath, config);

    // 3. Migrate threads to target provider
    await migrateThreads(targetProvider, false);

    // 4. Restart Codex
    openCodexApp().catch(() => {});
    return { ok: true, mode };
  });

  // ?�?� Terminal exec ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { cmd: string; cwd?: string } }>("/api/terminal/exec", async (req, reply) => {
    const { cmd, cwd } = req.body;
    if (!cmd?.trim()) return reply.code(400).send("cmd required");
    const workDir = cwd ?? homedir();
    const trimmed = cmd.trim();

    if (/^cd(\s|$)/.test(trimmed)) {
      const raw = trimmed.replace(/^cd\s*/, "").trim() || "~";
      const dir = raw === "~" ? homedir()
        : raw.startsWith("~/") ? join(homedir(), raw.slice(2))
        : raw.startsWith("/") ? raw
        : join(workDir, raw);
      try { accessSync(dir, constants.R_OK); return { stdout: "", stderr: "", cwd: dir }; }
      catch { return { stdout: "", stderr: `cd: no such file or directory: ${raw}`, cwd: workDir }; }
    }

    try {
      const { stdout, stderr } = await execAsync(trimmed, {
        cwd: workDir, timeout: 15_000, maxBuffer: 512 * 1024,
        env: { ...process.env, TERM: "dumb" },
        windowsHide: true,
      });
      return { stdout: stdout.slice(0, 8192), stderr: stderr.slice(0, 8192), cwd: workDir };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      return { stdout: (e.stdout ?? "").slice(0, 8192), stderr: (e.stderr ?? e.message ?? "error").slice(0, 8192), cwd: workDir };
    }
  });

  // ?�?� Accounts list + status ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get("/api/accounts", async () => {
    const config = loadConfig();
    const ollamaModels = await getOllamaModels(config.ollamaBaseUrl);
    const accountsWithModels = await Promise.all(
      config.accounts.map(async account => ({
        ...account,
        models: await loadModelsForAccount(account, config.ollamaBaseUrl),
      }))
    );
    return {
      port: config.port,
      accounts: accountsWithModels,
      ollamaRunning: ollamaModels.length > 0,
      ollamaModels,
      ollamaBaseUrl: config.ollamaBaseUrl,
      oauthPending: pendingOAuth,
      oauthError,
    };
  });

  // ?�?� Add account ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{
    Body: {
      provider: Account["provider"];
      label: string;
      method: Account["method"];
      apiKey?: string;
      sessionToken?: string;
    };
  }>("/api/accounts", async (req, reply) => {
    const { provider, label, method, apiKey, sessionToken } = req.body;
    if (!provider || !label || !method) return reply.code(400).send("provider, label, method required");
    const account = addAccount(provider, label, method, { apiKey, sessionToken });
    glog(`[account] added: ${label} (${provider}, ${method})`);
    return account;
  });

  // ?�?� Remove account ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.delete<{ Params: { id: string } }>("/api/accounts/:id", async (req, reply) => {
    const { id } = req.params;
    const config = loadConfig();
    const account = config.accounts.find(a => a.id === id);
    if (!account) return reply.code(404).send("Account not found");
    removeAccount(id);
    glog(`[account] removed: ${account.label} (${account.provider})`);
    return { ok: true };
  });

  // ?�?� Account node state (canvas connection) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{
    Params: { id: string };
    Body: { connectedToOut: boolean; selectedModel?: string | null; connectedOrder?: number };
  }>("/api/accounts/:id/node-state", async (req, reply) => {
    const { id } = req.params;
    const { connectedToOut, selectedModel, connectedOrder } = req.body;
    const config = loadConfig();
    const account = config.accounts.find(a => a.id === id);
    if (!account) return reply.code(404).send("Account not found");
    setAccountNodeState(id, selectedModel ?? null, connectedToOut, connectedOrder);
    glog(`[canvas] ${account.label}: connectedToOut=${connectedToOut}${selectedModel ? ` model=${selectedModel}` : ""}`);
    return { ok: true };
  });

  // ?�?� Add model slot ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Params: { id: string }; Body: { model: string; slotId?: string } }>(
    "/api/accounts/:id/slots", async (req, reply) => {
      const { id } = req.params;
      const { model, slotId } = req.body;
      if (!model) return reply.code(400).send("model required");
      const config = loadConfig();
      const account = config.accounts.find(a => a.id === id);
      if (!account) return reply.code(404).send("Account not found");
      const slot = addModelSlot(id, model, slotId);
      glog(`[slot] added: ${account.label} -> ${model}`);
      return slot ?? reply.code(500).send("Failed to create slot");
    }
  );

  // ?�?� Remove model slot ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.delete<{ Params: { id: string; slotId: string } }>(
    "/api/accounts/:id/slots/:slotId", async (req, reply) => {
      const { id, slotId } = req.params;
      const config = loadConfig();
      const account = config.accounts.find(a => a.id === id);
      if (!account) return reply.code(404).send("Account not found");
      const slot = account.activeModels?.find(s => s.slotId === slotId);
      removeModelSlot(id, slotId);
      glog(`[slot] removed: ${account.label} -> ${slot?.model ?? slotId}`);
      return { ok: true };
    }
  );

  // ?�?� Reorder all slots (cross-account) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { items: { accountId: string; slotId: string }[] } }>(
    "/api/slots/reorder", async (req, reply) => {
      const { items } = req.body;
      if (!Array.isArray(items)) return reply.code(400).send("items array required");
      reorderAllSlots(items);
      return { ok: true };
    }
  );

  // ?�?� Reorder connected accounts (legacy) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { ids: string[] } }>("/api/accounts/reorder", async (req, reply) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return reply.code(400).send("ids array required");
    reorderConnectedAccounts(ids);
    return { ok: true };
  });

  // ?�?� Ollama base URL update ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { baseUrl: string } }>("/api/ollama/config", async (req, reply) => {
    const { baseUrl } = req.body;
    if (!baseUrl?.trim()) return reply.code(400).send("baseUrl required");
    const config = loadConfig();
    config.ollamaBaseUrl = baseUrl.trim();
    saveConfig(config);
    return { ok: true };
  });

  // ?�?� Claude Code OAuth (PKCE) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { label?: string } }>("/api/oauth/anthropic/start", async (req, reply) => {
    const { url, state, verifier } = buildClaudeAuthUrl();
    const label = req.body?.label || "Claude Code";
    oauthError = null;
    pendingOAuth = "anthropic";
    glog(`[oauth] anthropic: login started (label="${label}")`);
    waitForClaudeCallback(state)
      .then(code => { glog("[oauth] anthropic: callback received, exchanging token..."); return exchangeClaudeCode(code, verifier, state); })
      .then(tokens => {
        pendingOAuth = null;
        const expiry = Date.now() + tokens.expiresIn * 1000;
        addAccount("anthropic", label, "oauth-official", {
          apiKey: tokens.apiKey,
          oauthToken: tokens.accessToken,
          oauthRefresh: tokens.refreshToken,
          oauthExpiry: expiry,
        });
        glog(`[oauth] anthropic: ??account added (label="${label}", apiKey=${tokens.apiKey ? "yes" : "no"})`);
      })
      .catch((err: Error) => {
        pendingOAuth = null;
        oauthError = err.message;
        gerr(`[oauth] anthropic: ??failed ??${err.message}`);
      });
    return reply.send({ authUrl: url });
  });

  // ?�?� ChatGPT OAuth (PKCE) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { label?: string } }>("/api/oauth/openai/start", async (req, reply) => {
    const { url, state, verifier } = buildAuthUrl();
    const label = req.body?.label || "ChatGPT / Codex";
    oauthError = null;
    pendingOAuth = "openai";
    glog(`[oauth] openai: login started (label="${label}")`);
    waitForCallback(state)
      .then(code => { glog("[oauth] openai: callback received, exchanging token..."); return exchangeCode(code, verifier); })
      .then(tokens => {
        pendingOAuth = null;
        const expiry = Date.now() + tokens.expiresIn * 1000;
        addAccount("openai", label, "oauth-official", {
          oauthToken: tokens.accessToken,
          oauthRefresh: tokens.refreshToken,
          oauthExpiry: expiry,
        });
        glog(`[oauth] openai: ??account added (label="${label}")`);
      })
      .catch((err: Error) => {
        pendingOAuth = null;
        oauthError = err.message;
        gerr(`[oauth] openai: ??failed ??${err.message}`);
      });
    return reply.send({ authUrl: url });
  });

  // ?�?� Antigravity OAuth ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { label?: string } }>("/api/oauth/antigravity/start", async (req, reply) => {
    const { url, state } = buildAntigravityAuthUrl();
    const label = req.body?.label || "Antigravity";
    oauthError = null;
    pendingOAuth = "antigravity";
    glog(`[oauth] antigravity: login started (label="${label}")`);
    waitForAntigravityCallback(state)
      .then(code => { glog("[oauth] antigravity: callback received, exchanging token..."); return exchangeAntigravityCode(code); })
      .then(async tokens => {
        const expiry = Date.now() + tokens.expiresIn * 1000;
        const account = addAccount("antigravity", label, "oauth-official", {
          oauthToken: tokens.accessToken,
          oauthRefresh: tokens.refreshToken,
          oauthExpiry: expiry,
        });
        pendingOAuth = null;
        glog(`[oauth] antigravity: ??account added (label="${label}")`);
        loadAntigravityProject(tokens.accessToken)
          .then(projectId => {
            updateAccountProjectId(account.id, projectId);
            glog(`[oauth] antigravity: fetched projectId=${projectId}`);
          })
          .catch((e: Error) => {
            gerr(`[oauth] antigravity: could not fetch projectId ??${e.message}`);
          });
      })
      .catch((err: Error) => {
        pendingOAuth = null;
        oauthError = err.message;
        gerr(`[oauth] antigravity: ??failed ??${err.message}`);
      });
    return reply.send({ authUrl: url });
  });

  // ?�?� GitHub Copilot OAuth (Device Code) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { label?: string } }>("/api/oauth/copilot/start", async (req, reply) => {
    const label = req.body?.label || "GitHub Copilot";
    oauthError = null;
    pendingOAuth = "copilot";
    try {
      const device = await startCopilotDeviceAuth();
      glog(`[oauth] copilot: device login started (label="${label}", code="${device.userCode}")`);
      pollCopilotDeviceToken(device)
        .then(async tokens => {
          // Validate the account can mint Copilot API tokens before saving it.
          await getCopilotToken(tokens.accessToken);
          addAccount("copilot", label, "oauth-official", {
            oauthToken: tokens.accessToken,
          });
          pendingOAuth = null;
          glog(`[oauth] copilot: ??account added (label="${label}")`);
        })
        .catch((err: Error) => {
          pendingOAuth = null;
          oauthError = err.message;
          gerr(`[oauth] copilot: ??failed ??${err.message}`);
        });
      return reply.send({
        authUrl: device.verificationUri,
        userCode: device.userCode,
        expiresIn: device.expiresIn,
      });
    } catch (err) {
      pendingOAuth = null;
      const msg = err instanceof Error ? err.message : String(err);
      oauthError = msg;
      gerr(`[oauth] copilot: ??failed ??${msg}`);
      return reply.code(502).send({ error: msg });
    }
  });

  // ?�?� Antigravity models ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.get<{ Params: { id: string } }>("/api/accounts/:id/antigravity-models", async (req, reply) => {
    const config = loadConfig();
    const account = config.accounts.find(a => a.id === req.params.id && a.provider === "antigravity");
    if (!account) return reply.status(404).send({ error: "Account not found" });
    return reply.send({ models: ANTIGRAVITY_DEFAULT_MODELS });
  });

  // ?�?� Models (only from connected accounts, filtered by selectedModel) ?�?�?�?�?�?�?�?�
  fastify.get("/v1/models", async () => {
    const config = loadConfig();
    const models: { id: string; object: "model"; owned_by: string }[] = [];

    for (const account of config.accounts.filter(a => a.connectedToOut)) {
      if (account.selectedModel) {
        models.push({ id: account.selectedModel, object: "model", owned_by: account.provider });
      } else {
        const accountModels = await loadModelsForAccount(account, config.ollamaBaseUrl);
        accountModels.forEach(id => models.push({ id, object: "model", owned_by: account.provider }));
      }
    }

    // Ollama connected directly (special case for nodes without account entry)
    return { object: "list", data: models };
  });

  // ?�?� Responses API proxy ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: Record<string, unknown> }>("/v1/responses", async (req, reply) => {
    const config = loadConfig();
    const rawBody = req.body;
    const responsesReq = rawBody as unknown as ResponsesRequest;
    const streaming = rawBody.stream === true;

    // Non-streaming: single call, return JSON
    if (!streaming) {
      try {
        const result = await proxyRequest(responsesReq, config);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.code(502).send({ error: { message: msg, type: "gateway_error" } });
      }
    }

    // Streaming: single streaming call ??no prior non-streaming call to avoid double billing
    const raw = reply.raw;
    raw.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", "connection": "keep-alive" });
    let seqNum = 0;
    const sse = (event: string, data: unknown) => {
      const payload = typeof data === "object" && data !== null
        ? { ...(data as object), sequence_number: seqNum++ }
        : data;
      raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    // ?�?� Codex OAuth transparent passthrough ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
    // Forwards the full request body (including tools, previous_response_id) so
    // Codex-native models (gpt-5.5 etc.) can execute shell/file tools normally.
    const passthrough = await tryCodexPassthrough(rawBody, config);
    if (passthrough) {
      const t0 = Date.now();
      const usage: { inputTokens?: number; outputTokens?: number } = {};
      const decoder = new TextDecoder();
      let textBuf = "";
      let logged = false;
      try {
        if (passthrough.res.body) {
          const reader = passthrough.res.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!logged) {
                pushLog({ ts: Date.now(), requestedModel: responsesReq.model, provider: "openai", usedModel: passthrough.model, fallback: false, ms: Date.now() - t0, status: "ok" } as RequestLogEntry);
                logged = true;
              }
              // Extract usage from response.completed while piping bytes
              textBuf += decoder.decode(value, { stream: true });
              const lines = textBuf.split("\n");
              textBuf = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                try {
                  const evt = JSON.parse(line.slice(6).trim()) as Record<string, unknown>;
                  if (evt.type === "response.completed") {
                    const resp = (evt as { response?: { usage?: { input_tokens?: number; output_tokens?: number } } }).response;
                    if (resp?.usage?.input_tokens) usage.inputTokens = resp.usage.input_tokens;
                    if (resp?.usage?.output_tokens) usage.outputTokens = resp.usage.output_tokens;
                  }
                } catch { /* skip malformed */ }
              }
              raw.write(value);
            }
          } finally {
            reader.releaseLock();
          }
        }
        // Update log entry with final usage/latency
        const lastEntry = requestLog[requestLog.length - 1];
        if (lastEntry && lastEntry.provider === "openai" && lastEntry.usedModel === passthrough.model) {
          lastEntry.ms = Date.now() - t0;
          if (usage.inputTokens) lastEntry.inputTokens = usage.inputTokens;
          if (usage.outputTokens) lastEntry.outputTokens = usage.outputTokens;
        }
        flushLog();
      } catch (err) {
        gerr(`[gateway] Codex passthrough pipe error: ${err instanceof Error ? err.message : String(err)}`);
      }
      raw.end();
      return reply;
    }
    // ?�?� End transparent passthrough ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

    const responseId = `resp_${Date.now()}`;
    const reasoningItemId = `rs_${Date.now()}`;
    let msgItemId = `msg_${Date.now() + 1}`;
    // Only send response.created upfront ??Codex shows "?�각�? while waiting.
    // output_item.added is deferred until the first real delta arrives so that
    // "?�업�? only appears when content actually starts streaming.
    sse("response.created", { type: "response.created", response: { id: responseId, object: "response", model: req.body.model, status: "in_progress", output: [] } });

    let fullText = "";
    let reasoningStarted = false;
    let reasoningClosed = false;
    let textItemOpened = false;
    let textItemClosed = false;
    let nextOutputIdx = 0;
    let msgOutIdx = 0;
    const toolCallMap = new Map<string, { name: string; arguments: string; outputIdx: number }>();
    const completedToolCalls: { id: string; name: string; arguments: string; outputIdx: number }[] = [];
    const webFetchUrls: string[] = [];
    const streamErrorDetails = (message: string): { code: string; message: string } => {
      if (message.includes("Anthropic error 429") || message.includes("rate_limit_error")) {
        return {
          code: "rate_limit_exceeded",
          message: "Claude Code ?�용???�한??걸려???�번 ?�청????진행?????�습?�다. Anthropic??rate limit(429)??반환?�습?�다. ?�시 ???�시 ?�도?�거??Claude ?�용?�이 ?�복?????�어???�청?�주?�요.",
        };
      }
      if (message.includes("Google error 429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded")) {
        const retry = message.match(/retryDelay":\s*"([^"]+)"/)?.[1] ??
          message.match(/Please retry in ([^.\n]+(?:\.\d+)?s)/)?.[1];
        const retryText = retry ? ` ${retry} ???�시 ?�도?�주?�요.` : " ?�시 ???�시 ?�도?�주?�요.";
        return {
          code: "rate_limit_exceeded",
          message: `Gemini ?�용???�한??걸려???�번 ?�청????진행?????�습?�다. Google??quota/rate limit(429)??반환?�습?�다.${retryText}`,
        };
      }
      return { code: "server_error", message };
    };
    const failStream = (message: string) => {
      if (reasoningStarted && !reasoningClosed) {
        sse("response.reasoning.done", { type: "response.reasoning.done", item_id: reasoningItemId, output_index: 0, content_index: 0, text: "" });
        sse("response.output_item.done", { type: "response.output_item.done", output_index: 0, item: { type: "reasoning", id: reasoningItemId, status: "completed", summary: [] } });
        reasoningClosed = true;
      }
      if (textItemOpened && !textItemClosed) {
        sse("response.output_text.done", { type: "response.output_text.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, text: fullText });
        sse("response.content_part.done", { type: "response.content_part.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, part: { type: "output_text", text: fullText } });
        sse("response.output_item.done", { type: "response.output_item.done", output_index: msgOutIdx, item: { type: "message", id: msgItemId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText }] } });
        textItemClosed = true;
      }

      const completedOutput: unknown[] = [];
      if (reasoningStarted) completedOutput.push({ type: "reasoning", id: reasoningItemId, status: "completed", summary: [] });
      if (textItemOpened) completedOutput.push({ type: "message", id: msgItemId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText }] });
      for (const tc of completedToolCalls) completedOutput.push({ type: "function_call", id: tc.id, call_id: tc.id, name: tc.name, arguments: tc.arguments, status: "completed" });
      const error = streamErrorDetails(message);
      sse("response.failed", { type: "response.failed", response: { id: responseId, object: "response", model: req.body.model, status: "failed", output: completedOutput, error } });
    };
    // Abort Ollama when Codex disconnects (prevents stacking multiple Ollama calls on reconnect)
    const abortController = new AbortController();
    raw.on("close", () => abortController.abort());
    // Use response.reasoning.delta as keepalive when reasoning item is open ??this is a real
    // Responses API event that resets Codex's idle timer. Heartbeat/comment events do not.
    const keepaliveTimer = setInterval(() => {
      if (reasoningStarted && !reasoningClosed) {
        raw.write(`event: response.reasoning.delta\ndata: ${JSON.stringify({ type: "response.reasoning.delta", item_id: reasoningItemId, output_index: 0, content_index: 0, delta: { type: "reasoning_text_delta", text: "" } })}\n\n`);
      }
    }, 3_000);
    try {
      for await (const chunk of streamProxyRequest(responsesReq, config, abortController.signal, responseId)) {
        if (chunk.type === 'reasoning') {
          if (!reasoningStarted) {
            sse("response.output_item.added", { type: "response.output_item.added", output_index: nextOutputIdx++, item: { type: "reasoning", id: reasoningItemId, status: "in_progress", summary: [] } });
            reasoningStarted = true;
          }
          // Capture web fetch URLs emitted by proxy as "?�� <url>" in reasoning
          if (chunk.content.includes("?�� ")) {
            const urlMatch = chunk.content.match(/https?:\/\/\S+/);
            if (urlMatch) webFetchUrls.push(urlMatch[0]);
          }
          sse("response.reasoning.delta", { type: "response.reasoning.delta", item_id: reasoningItemId, output_index: 0, content_index: 0, delta: { type: "reasoning_text_delta", text: chunk.content } });
        } else if (chunk.type === 'text') {
          if (reasoningStarted && !reasoningClosed) {
            sse("response.reasoning.done", { type: "response.reasoning.done", item_id: reasoningItemId, output_index: 0, content_index: 0, text: "" });
            sse("response.output_item.done", { type: "response.output_item.done", output_index: 0, item: { type: "reasoning", id: reasoningItemId, status: "completed", summary: [] } });
            reasoningClosed = true;
          }
          // If a function_call closed the text item, open a new message item for the continuation text.
          if (textItemClosed) {
            msgItemId = `msg_${Date.now() + nextOutputIdx}`;
            textItemOpened = false;
            textItemClosed = false;
          }
          if (!textItemOpened) {
            msgOutIdx = nextOutputIdx++;
            sse("response.output_item.added", { type: "response.output_item.added", output_index: msgOutIdx, item: { type: "message", id: msgItemId, status: "in_progress", role: "assistant", content: [] } });
            sse("response.content_part.added", { type: "response.content_part.added", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, part: { type: "output_text", text: "" } });
            textItemOpened = true;
          }
          fullText += chunk.content;
          sse("response.output_text.delta", { type: "response.output_text.delta", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, delta: chunk.content });
        } else if (chunk.type === 'tool_call_start') {
          // Keep reasoning open ??the full command will be appended to reasoning at tool_call_end
          // so the user can see it in the gray "Thought" section in Codex UI.
          if (textItemOpened && !textItemClosed) {
            sse("response.output_text.done", { type: "response.output_text.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, text: fullText });
            sse("response.content_part.done", { type: "response.content_part.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, part: { type: "output_text", text: fullText } });
            sse("response.output_item.done", { type: "response.output_item.done", output_index: msgOutIdx, item: { type: "message", id: msgItemId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText }] } });
            textItemClosed = true;
          }
          const toolOutIdx = nextOutputIdx++;
          toolCallMap.set(chunk.id, { name: chunk.name, arguments: "", outputIdx: toolOutIdx });
          sse("response.output_item.added", { type: "response.output_item.added", output_index: toolOutIdx, item: { type: "function_call", id: chunk.id, call_id: chunk.id, name: chunk.name, arguments: "", status: "in_progress" } });
        } else if (chunk.type === 'tool_call_delta') {
          const tc = toolCallMap.get(chunk.id);
          if (tc) {
            tc.arguments += chunk.delta;
            sse("response.function_call_arguments.delta", { type: "response.function_call_arguments.delta", item_id: chunk.id, output_index: tc.outputIdx, delta: chunk.delta });
          }
        } else if (chunk.type === 'tool_call_end') {
          const tc = toolCallMap.get(chunk.id);
          if (tc) {
            tc.arguments = chunk.arguments;
            completedToolCalls.push({ id: chunk.id, name: tc.name, arguments: chunk.arguments, outputIdx: tc.outputIdx });
            // Append executed command to reasoning (gray "Thought" section) so user can see it
            if (reasoningStarted && !reasoningClosed) {
              let cmdLine = `\n??${chunk.name}`;
              try {
                const parsed = JSON.parse(chunk.arguments) as Record<string, unknown>;
                const cmd = (parsed.cmd ?? parsed.command ?? parsed.script) as string | undefined;
                if (cmd) cmdLine += `\n$ ${cmd}`;
                else cmdLine += `(${chunk.arguments})`;
              } catch { cmdLine += `(${chunk.arguments})`; }
              sse("response.reasoning.delta", { type: "response.reasoning.delta", item_id: reasoningItemId, output_index: 0, content_index: 0, delta: { type: "reasoning_text_delta", text: cmdLine } });
            }
            sse("response.function_call_arguments.done", { type: "response.function_call_arguments.done", item_id: chunk.id, output_index: tc.outputIdx, arguments: chunk.arguments });
            sse("response.output_item.done", { type: "response.output_item.done", output_index: tc.outputIdx, item: { type: "function_call", id: chunk.id, call_id: chunk.id, name: tc.name, arguments: chunk.arguments, status: "completed" } });
          }
        }
      }
    } catch (streamErr) {
      clearInterval(keepaliveTimer);
      const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
      gerr(`[gateway] stream failed with protocol error event: ${msg}`);
      failStream(msg);
      raw.end();
      return reply;
    }
    clearInterval(keepaliveTimer);

    // Close text item if still open after stream ends
    if (textItemOpened && !textItemClosed) {
      sse("response.output_text.done", { type: "response.output_text.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, text: fullText });
      sse("response.content_part.done", { type: "response.content_part.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, part: { type: "output_text", text: fullText } });
      sse("response.output_item.done", { type: "response.output_item.done", output_index: msgOutIdx, item: { type: "message", id: msgItemId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText }] } });
      textItemClosed = true;
    }
    // Close reasoning if it was opened but never closed (model output was reasoning-only).
    // An unclosed reasoning item before response.completed confuses Codex and causes blank UI.
    if (reasoningStarted && !reasoningClosed) {
      sse("response.reasoning.done", { type: "response.reasoning.done", item_id: reasoningItemId, output_index: 0, content_index: 0, text: "" });
      sse("response.output_item.done", { type: "response.output_item.done", output_index: 0, item: { type: "reasoning", id: reasoningItemId, status: "completed", summary: [] } });
      reasoningClosed = true;
    }
    // If nothing was emitted at all, open+close empty message so Codex doesn't hang
    if (!textItemOpened && completedToolCalls.length === 0) {
      msgOutIdx = nextOutputIdx++;
      sse("response.output_item.added", { type: "response.output_item.added", output_index: msgOutIdx, item: { type: "message", id: msgItemId, status: "in_progress", role: "assistant", content: [] } });
      sse("response.content_part.added", { type: "response.content_part.added", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, part: { type: "output_text", text: "" } });
      sse("response.output_text.done", { type: "response.output_text.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, text: "" });
      sse("response.content_part.done", { type: "response.content_part.done", item_id: msgItemId, output_index: msgOutIdx, content_index: 0, part: { type: "output_text", text: "" } });
      sse("response.output_item.done", { type: "response.output_item.done", output_index: msgOutIdx, item: { type: "message", id: msgItemId, status: "completed", role: "assistant", content: [{ type: "output_text", text: "" }] } });
    }
    // Build response.completed output array (reasoning + message + function_calls)
    const completedOutput: unknown[] = [];
    if (reasoningStarted) completedOutput.push({ type: "reasoning", id: reasoningItemId, status: "completed", summary: [] });
    if (textItemOpened || completedToolCalls.length === 0) {
      completedOutput.push({ type: "message", id: msgItemId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText }] });
    }
    for (const tc of completedToolCalls) completedOutput.push({ type: "function_call", id: tc.id, call_id: tc.id, name: tc.name, arguments: tc.arguments, status: "completed" });
    // Populate detail fields on the most-recent log entry
    const lastLogEntry = requestLog[requestLog.length - 1];
    if (lastLogEntry) {
      if (fullText) lastLogEntry.outputPreview = fullText.slice(0, 300);
      if (completedToolCalls.length) {
        lastLogEntry.toolCalls = completedToolCalls.map(tc => tc.name);
        lastLogEntry.toolCallDetails = completedToolCalls.map(tc => ({ name: tc.name, args: tc.arguments }));
      }
      if (webFetchUrls.length) lastLogEntry.webFetches = webFetchUrls;
      // inputPreview: extract user text from req.body.input
      try {
        const inputArr = Array.isArray(responsesReq.input) ? responsesReq.input as {type?:string;role?:string;content?:unknown}[] : [];
        const userMsg = [...inputArr].reverse().find((i: {type?:string;role?:string}) => i.type === "message" && i.role === "user");
        if (userMsg) {
          const c = userMsg.content;
          const txt = typeof c === "string" ? c : Array.isArray(c) ? (c as {text?:string}[]).map(x=>x.text??'').join('') : '';
          if (txt) lastLogEntry.inputPreview = txt.slice(0, 200);
        }
      } catch { /* ignore */ }
      flushLog();
    }
    sse("response.completed", { type: "response.completed", response: { id: responseId, object: "response", model: req.body.model, status: "completed", output: completedOutput } });
    raw.end();
    return reply;
  });

  // ?�?� Chat completions fallback ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  fastify.post<{ Body: { model: string; messages: { role: string; content: string }[]; stream?: boolean } }>(
    "/v1/chat/completions",
    async (req, reply) => {
      const config = loadConfig();
      const { model, messages, stream = false } = req.body;
      const systemMsg = messages.find(m => m.role === "system");
      const userMessages = messages.filter(m => m.role !== "system");
      const responsesReq: ResponsesRequest = {
        model,
        input: userMessages.map(m => ({ type: "message", role: m.role, content: m.content })),
        instructions: systemMsg?.content,
        stream,
      };
      try {
        const result = await proxyRequest(responsesReq, config);
        const text = result.output[0]?.content[0]?.text ?? "";
        return {
          id: result.id, object: "chat.completion", model,
          choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
          usage: result.usage ? { prompt_tokens: result.usage.input_tokens, completion_tokens: result.usage.output_tokens, total_tokens: result.usage.total_tokens } : undefined,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.code(502).send({ error: { message: msg } });
      }
    }
  );

  return {
    async start(): Promise<number> {
      const config = loadConfig();
      const port = await findFreePort(config.port);
      await fastify.listen({ port, host: "127.0.0.1" });
      if (port !== config.port) { config.port = port; saveConfig(config); }
      saveGatewayPid(process.pid);
      glog(`[gateway] ??started on port ${port} (pid=${process.pid}, accounts=${config.accounts.length})`);
      return port;
    },
    async stop(): Promise<void> {
      glog("[gateway] stopping...");
      clearGatewayPid();
      await fastify.close();
    },
  };
}
