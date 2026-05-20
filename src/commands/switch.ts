import { logger } from "../utils/logger.js";
import { getCodexConfigPath, displayPath } from "../utils/paths.js";
import { readCodexConfig, writeCodexConfig, backupCodexConfig, removeLegacyProviders } from "../core/config.js";
import { MANAGED_PROVIDER_KEY, OPENAI_PROVIDER_KEY, DEFAULT_OPENAI_BASE_URL } from "../core/constants.js";
import { loadConfig } from "../gateway/auth.js";
import { isCodexRunning, killCodex, openCodexApp } from "../core/codex.js";
import { migrateThreads } from "./migrate.js";

type SwitchTarget = "gateway" | "openai";

export async function runSwitch(target: SwitchTarget): Promise<void> {
  logger.header();

  const configPath = getCodexConfigPath();
  logger.success(`Config: ${displayPath(configPath)}`);

  let config;
  try {
    config = readCodexConfig(configPath);
  } catch (err) {
    logger.error(`Config ?Œì‹± ?¤íŒ¨: ${err}`);
    return;
  }

  backupCodexConfig(configPath);
  removeLegacyProviders(config, MANAGED_PROVIDER_KEY);

  if (target === "gateway") {
    const gatewayConfig = loadConfig();
    const gatewayUrl = `http://localhost:${gatewayConfig.port}/v1`;

    if (!config.model_providers) config.model_providers = {};
    config.model_providers[MANAGED_PROVIDER_KEY] = {
      name: "rcodex Gateway",
      base_url: gatewayUrl,
      wire_api: "responses",
    };
    config.model_provider = MANAGED_PROVIDER_KEY;
    // Clear top-level model so Codex picks from /v1/models
    delete config.model;

    logger.success(`Provider: ${MANAGED_PROVIDER_KEY} ??rcodex Gateway (${gatewayUrl})`);
    logger.info("Models are managed at the gateway web UI. Run 'rcodex' if not already running.");

  } else if (target === "openai") {
    // Remove gateway provider ??let Codex use its built-in OpenAI
    if (config.model_providers) {
      delete config.model_providers[MANAGED_PROVIDER_KEY];
      if (Object.keys(config.model_providers).length === 0) {
        delete config.model_providers;
      }
    }
    delete config.model_provider;
    config.model = "gpt-5.5";

    logger.success(`Provider: native OpenAI (${DEFAULT_OPENAI_BASE_URL})`);
    logger.success(`Model: gpt-5.5`);
    logger.info("Bypassing rcodex Gateway ??using Codex built-in OpenAI auth.");
  }

  try {
    writeCodexConfig(configPath, config);
    logger.success(`Config saved: ${displayPath(configPath)}`);
  } catch (err) {
    logger.error(`?€???¤íŒ¨: ${err}`);
    return;
  }

  // Kill Codex (if running) before migrating ??DB must not be locked
  const wasRunning = await isCodexRunning();
  if (wasRunning) {
    logger.info("Stopping Codex...");
    await killCodex();
    await new Promise((r) => setTimeout(r, 800));
  }

  // Migrate all threads to the new provider
  logger.separator();
  const migrateTarget = target === "gateway" ? MANAGED_PROVIDER_KEY : OPENAI_PROVIDER_KEY;
  await migrateThreads(migrateTarget, false);

  // Reopen Codex if it was running before
  if (wasRunning) {
    await openCodexApp();
    logger.success("Codex restarted.");
  }

  logger.done();
}
