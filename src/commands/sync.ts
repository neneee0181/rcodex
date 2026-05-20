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
          logger.warn("?„ì§ Codexê°€ ?¤í–‰ ì¤‘ì…?ˆë‹¤. ?„ì „??ì¢…ë£Œ ??Enterë¥??ŒëŸ¬ì£¼ì„¸??");
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

  // 1. Codex ?¤ì¹˜ ?•ì¸ (ë¯¸ê°ì§€ ??ê²½ê³ ë§? ?¤ì •?€ ê³„ì† ì§„í–‰)
  if (!(await isCodexInstalled())) {
    logger.warn("Codex not found in PATH. Install it first: https://github.com/openai/codex");
    logger.warn("Continuing setup ??gateway config will be written but Codex won't launch automatically.");
  } else {
    logger.success("Codex detected");
  }

  // 2. Config ê²½ë¡œ ?•ì¸
  let configPath: string;
  try {
    configPath = getCodexConfigPath();
  } catch (err) {
    logger.error(`Config ê²½ë¡œë¥??•ì¸?????†ìŠµ?ˆë‹¤: ${err}`);
    return;
  }
  logger.success(`Config found: ${displayPath(configPath)}`);

  // 3. Config ë°±ì—…
  try {
    const backupPath = backupCodexConfig(configPath);
    logger.success(`Backup created: ${displayPath(backupPath)}`);
  } catch (err) {
    logger.error(`Config ë°±ì—…???¤íŒ¨?ˆìŠµ?ˆë‹¤: ${err}`);
    return;
  }

  // 4. Config ?½ê¸°
  let config;
  try {
    config = readCodexConfig(configPath);
  } catch (err) {
    logger.error(`Config ?Œì‹±???¤íŒ¨?ˆìŠµ?ˆë‹¤: ${err}`);
    return;
  }

  // ?´ì „ ë²„ì „ ?ˆê±°??provider ???•ë¦¬
  removeLegacyProviders(config, MANAGED_PROVIDER_KEY);

  // 5. ê²Œì´?¸ì›¨??endpointë¥??¨ì¼ providerë¡??±ë¡
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

  logger.success(
    `Gateway provider ${existed ? "updated" : "registered"}: ${MANAGED_PROVIDER_KEY} ??${gatewayUrl}`
  );
  logger.info("Run 'rcodex' to launch the gateway and configure providers.");

  // 6. Dry-run ì²˜ë¦¬
  if (options.dryRun) {
    logger.separator();
    logger.info("[DRY RUN] ?¤ì œë¡??€?¥ë˜ì§€ ?Šì•˜?µë‹ˆ??");
    logger.info(`  ${existed ? "?…ë°?´íŠ¸" : "ì¶”ê?"}????ª©: provider:${MANAGED_PROVIDER_KEY} ??${gatewayUrl}`);
    logger.done();
    return;
  }

  // 7. Config ?€??
  try {
    writeCodexConfig(configPath, config);
    logger.success(`Config saved: ${displayPath(configPath)}`);
  } catch (err) {
    logger.error(`Config ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤: ${err}`);
    return;
  }

  // 8. Migrate ?ë™ ?¤í–‰
  logger.separator();
  if (await isCodexRunning()) {
    logger.warn("Codex ?±ì´ ?¤í–‰ ì¤‘ì…?ˆë‹¤. migrateë¥?ì§„í–‰?˜ë ¤ë©??±ì„ ì¢…ë£Œ?´ì£¼?¸ìš”.");
    logger.info("ì¢…ë£Œ ??Enterë¥??„ë¥´ë©??ë™?¼ë¡œ migrateê°€ ì§„í–‰?©ë‹ˆ??");
    await waitUntilCodexClosed();
    logger.success("Codex ??ì¢…ë£Œ ?•ì¸");
  }
  await runMigrate(false, false);
}
