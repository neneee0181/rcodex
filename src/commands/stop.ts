import { logger } from "../utils/logger.js";
import { killExistingGateway, loadConfig } from "../gateway/auth.js";

export async function runStop(): Promise<void> {
  logger.header();

  const config = loadConfig();
  if (!config.pid) {
    logger.warn("No gateway process recorded. Nothing to stop.");
    logger.info("If a gateway is still running, kill it manually.");
    return;
  }

  const killed = killExistingGateway();
  if (killed) {
    logger.success("Gateway stopped.");
  } else {
    logger.warn("Gateway process was already gone (cleared stale PID).");
  }
  process.exit(0);
}
