import { execSync } from "child_process";
import { logger } from "../utils/logger.js";
import { runSync } from "./sync.js";
import { createGatewayServer } from "../gateway/server.js";
import { loadConfig, killExistingGateway } from "../gateway/auth.js";
import { getCodexConfigPath } from "../utils/paths.js";
import { readCodexConfig, writeCodexConfig, backupCodexConfig } from "../core/config.js";
import { MANAGED_PROVIDER_KEY } from "../core/constants.js";
import { openCodexApp } from "../core/codex.js";

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? `open "${url}"` :
    process.platform === "win32" ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  try { execSync(cmd, { windowsHide: true }); } catch { /* ignore */ }
}


export async function runSetup(): Promise<void> {
  logger.header();
  logger.info("Setup: sync config + migrate threads + start gateway");
  logger.separator();

  // 1. Kill any existing gateway process so we always start fresh
  const killed = killExistingGateway();
  if (killed) {
    logger.info("Stopped existing gateway process.");
    await new Promise((r) => setTimeout(r, 600)); // let the port free up
  }

  // 2. Register gateway in Codex config + auto-migrate threads
  await runSync({ dryRun: false, showHeader: false });

  logger.separator();
  logger.info("Starting rcodex Gateway...");

  // 3. Capture the port runSync registered before the server might change it
  const registeredPort = loadConfig().port;

  const server = createGatewayServer();
  let port: number;
  try {
    port = await server.start();
  } catch (err) {
    logger.error(`Failed to start gateway: ${err}`);
    return;
  }

  // If the server ended up on a different port than what was registered,
  // update Codex config to match the actual port
  if (port !== registeredPort) {
    const configPath = getCodexConfigPath();
    backupCodexConfig(configPath);
    const config = readCodexConfig(configPath);
    if (!config.model_providers) config.model_providers = {};
    config.model_providers[MANAGED_PROVIDER_KEY] = {
      name: "rcodex Gateway",
      base_url: `http://localhost:${port}/v1`,
      wire_api: "responses",
    };
    config.model_provider = MANAGED_PROVIDER_KEY;
    writeCodexConfig(configPath, config);
    logger.success(`Config updated to actual port :${port}`);
  }

  const url = `http://localhost:${port}`;
  logger.success(`Gateway running: ${url}`);

  // 4. Open browser to management UI
  openBrowser(url);

  // 5. Open Codex app
  logger.info("Opening Codex...");
  await openCodexApp();

  logger.separator();
  logger.success("Ready. Configure providers at: " + url);
  logger.info("Press Ctrl+C to stop the gateway.");

  process.on("SIGINT", async () => {
    logger.info("\nShutting down gateway...");
    await server.stop();
    process.exit(0);
  });

  setInterval(() => {}, 1000);
}
