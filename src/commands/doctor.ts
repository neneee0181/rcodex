import { logger } from "../utils/logger.js";
import { displayPath, getCodexConfigPath } from "../utils/paths.js";
import { isCodexInstalled } from "../core/codex.js";
import { isOllamaInstalled, getOllamaModels } from "../core/ollama.js";
import { readCodexConfig } from "../core/config.js";
import { loadConfig } from "../gateway/auth.js";
import { MANAGED_PROVIDER_KEY } from "../core/constants.js";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { hasAppCredentials, getAppCredentials } from "../gateway/providers/antigravity-oauth-flow.js";

export async function runDoctor(): Promise<void> {
  logger.header();
  logger.info("Doctor: checking installation and configuration...");
  logger.separator();

  // Codex
  const codexOk = await isCodexInstalled();
  if (codexOk) logger.success("Codex installed");
  else logger.warn("Codex NOT found: https://github.com/openai/codex");

  // Gateway
  const gw = loadConfig();
  try {
    const res = await fetch(`http://localhost:${gw.port}/api/status`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json() as { port: number; accountCount?: number };
      logger.success(`rcodex Gateway running on :${data.port} (${data.accountCount ?? 0} accounts)`);
    } else {
      logger.warn(`rcodex Gateway not running (port: ${gw.port}); run: rcodex`);
    }
  } catch {
    logger.warn(`rcodex Gateway not running (port: ${gw.port}); run: rcodex`);
  }

  // Connected accounts
  const accounts = gw.accounts ?? [];
  if (accounts.length === 0) {
    logger.warn("No accounts connected; open the Gateway UI to add providers");
  } else {
    logger.success(`Accounts: ${accounts.map(a => `${a.provider}(${a.label})`).join(", ")}`);
  }

  // Ollama
  const ollamaOk = await isOllamaInstalled();
  if (ollamaOk) {
    const models = await getOllamaModels();
    if (models.length === 0) logger.warn("Ollama installed but no models; run: ollama pull <model>");
    else logger.success(`Ollama: ${models.length} model(s): ${models.slice(0, 3).join(", ")}${models.length > 3 ? "..." : ""}`);
  } else {
    logger.warn("Ollama NOT found: https://ollama.com (optional)");
  }

  // Antigravity credentials check + auto-fix
  logger.separator();
  logger.info("Checking Antigravity (Google Cloud Code) credentials...");
  const rcodexDir = join(homedir(), ".rcodex");
  const userCredsPath = join(rcodexDir, "antigravity-app.json");

  if (hasAppCredentials()) {
    logger.success("Antigravity credentials available");
  } else {
    logger.warn("Antigravity credentials not found; attempting auto-fix...");
    // Try to extract bundled credentials and write to user path
    try {
      const creds = getAppCredentials(); // will throw if bundled also missing
      mkdirSync(rcodexDir, { recursive: true });
      writeFileSync(userCredsPath, JSON.stringify(creds, null, 2), "utf-8");
      logger.success(`Created ${userCredsPath}`);
    } catch {
      logger.warn(
        "Could not auto-fix. Manually create ~/.rcodex/antigravity-app.json:\n" +
        '  { "clientId": "<your-client-id>", "clientSecret": "<your-client-secret>" }'
      );
    }
  }

  // Codex config
  logger.separator();
  let configPath: string;
  try {
    configPath = getCodexConfigPath();
    logger.success(`Codex config: ${displayPath(configPath)}`);
  } catch {
    logger.warn("Codex config path not found");
    logger.done();
    return;
  }

  if (!existsSync(configPath)) {
    logger.warn("config.toml not found; run: rcodex to create it");
    logger.done();
    return;
  }

  try {
    const config = readCodexConfig(configPath);
    const activeProvider = config.model_provider ?? "(none)";
    const providers = Object.keys(config.model_providers ?? {});
    const gatewayRegistered = providers.includes(MANAGED_PROVIDER_KEY);
    logger.info(`  Active provider: ${activeProvider}`);
    if (gatewayRegistered) logger.success("  Gateway registered in Codex config");
    else logger.warn("  Gateway NOT registered; run: rcodex");
  } catch {
    logger.warn("config.toml parse failed; file may be corrupted");
  }

  logger.done();
}
