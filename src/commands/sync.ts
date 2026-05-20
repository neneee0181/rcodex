import { createInterface } from "readline";
import type { SyncOptions } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { getCodexConfigPath, displayPath } from "../utils/paths.js";
import { isCodexInstalled, isCodexRunning } from "../core/codex.js";
import { readCodexConfig, writeCodexConfig, backupCodexConfig, removeLegacyProviders } from "../core/config.js";
import { MANAGED_PROVIDER_KEY } from "../core/constants.js";
import { loadConfig } from "../gateway/auth.js";
import { runMigrate } from "./migrate.js";

async function waitUntilCodexClosed(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (): Promise<void> =>
    new Promise((resolve) => {
      rl.question("", async () => {
        if (await isCodexRunning()) {
          logger.warn("Codex is still running. Close it completely, then press Enter.");
          resolve(ask());
        } else {
          rl.close();
          resolve();
        }
      });
    });
  return ask();
}

export async function runSync(options: SyncOptions): Promise<void> {
  if (options.showHeader !== false) logger.header();

  if (!(await isCodexInstalled())) {
    logger.warn("Codex not found in PATH. Install it first: https://github.com/openai/codex");
    logger.warn("Continuing setup; gateway config will be written but Codex will not launch automatically.");
  } else {
    logger.success("Codex detected");
  }

  let configPath: string;
  try {
    configPath = getCodexConfigPath();
  } catch (err) {
    logger.error(`Could not resolve Codex config path: ${err}`);
    return;
  }
  logger.success(`Config found: ${displayPath(configPath)}`);

  try {
    const backupPath = backupCodexConfig(configPath);
    logger.success(`Backup created: ${displayPath(backupPath)}`);
  } catch (err) {
    logger.error(`Config backup failed: ${err}`);
    return;
  }

  let config;
  try {
    config = readCodexConfig(configPath);
  } catch (err) {
    logger.error(`Config parse failed: ${err}`);
    return;
  }

  removeLegacyProviders(config, MANAGED_PROVIDER_KEY);

  const gatewayConfig = loadConfig();
  const gatewayUrl = `http://localhost:${gatewayConfig.port}/v1`;

  if (!config.model_providers) config.model_providers = {};
  const existed = MANAGED_PROVIDER_KEY in config.model_providers;
  config.model_providers[MANAGED_PROVIDER_KEY] = {
    name: "rcodex Gateway",
    base_url: gatewayUrl,
    wire_api: "responses",
  };
  config.model_provider = MANAGED_PROVIDER_KEY;

  logger.success(`Gateway provider ${existed ? "updated" : "registered"}: ${MANAGED_PROVIDER_KEY} -> ${gatewayUrl}`);
  logger.info("Run 'rcodex' to launch the gateway and configure providers.");

  if (options.dryRun) {
    logger.separator();
    logger.info("[DRY RUN] No changes written.");
    logger.info(`  ${existed ? "Update" : "Add"}: provider:${MANAGED_PROVIDER_KEY} -> ${gatewayUrl}`);
    logger.done();
    return;
  }

  try {
    writeCodexConfig(configPath, config);
    logger.success(`Config saved: ${displayPath(configPath)}`);
  } catch (err) {
    logger.error(`Config save failed: ${err}`);
    return;
  }

  logger.separator();
  if (await isCodexRunning()) {
    logger.warn("Codex is running. Close it before migration can continue.");
    logger.info("Close Codex, then press Enter to migrate threads.");
    await waitUntilCodexClosed();
    logger.success("Codex closed");
  }
  await runMigrate(false, false);
}