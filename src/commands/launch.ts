import { spawn } from "child_process";
import { openSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";
import { logger } from "../utils/logger.js";
import { getCodexConfigPath } from "../utils/paths.js";
import { readCodexConfig, writeCodexConfig, backupCodexConfig } from "../core/config.js";
import { MANAGED_PROVIDER_KEY } from "../core/constants.js";
import { loadConfig, killExistingGateway } from "../gateway/auth.js";
import { isCodexRunning, killCodex } from "../core/codex.js";
import { hasUnmigratedThreads, migrateThreads } from "./migrate.js";

const RCODEX_DIR = join(homedir(), ".rcodex");
const DAEMON_LOG = join(RCODEX_DIR, "gateway.log");

function getGatewayDaemonCommand(): { command: string; args: string[] } {
  const entry = process.argv[1] ?? "";
  if (entry.endsWith(".ts")) {
    return {
      command: process.execPath,
      args: ["--import", "tsx", entry, "_gateway"],
    };
  }

  return {
    command: process.execPath,
    args: [entry, "_gateway"],
  };
}

// Poll until gateway responds or timeout. Re-reads gateway.json each tick so we
// pick up the actual port if the daemon had to use a different one.
async function waitForGateway(initialPort: number, timeoutMs = 6000): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  let port = initialPort;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    port = loadConfig().port; // daemon may have updated this
    try {
      const res = await fetch(`http://localhost:${port}/api/status`, {
        signal: AbortSignal.timeout(400),
      });
      if (res.ok) return port;
    } catch { /* keep waiting */ }
  }
  return null;
}

function getCodexConfigPort(configPath: string): number | null {
  try {
    const config = readCodexConfig(configPath);
    const baseUrl = config.model_providers?.[MANAGED_PROVIDER_KEY]?.base_url;
    if (!baseUrl) return null;
    const match = baseUrl.match(/:(\d+)\/v1/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

function syncCodexConfigPort(configPath: string, port: number): void {
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
}


export async function runLaunch(): Promise<void> {
  logger.header();

  // 1. Stop any existing gateway and restart fresh
  const killed = killExistingGateway();
  if (killed) {
    logger.info("Restarting gateway...");
    await new Promise((r) => setTimeout(r, 600));
  }

  const configuredPort = loadConfig().port;

  // 2. Spawn gateway as a detached background daemon
  logger.info("Starting gateway in background...");
  if (!existsSync(RCODEX_DIR)) mkdirSync(RCODEX_DIR, { recursive: true });
  const stdoutFd = openSync(DAEMON_LOG, "a");
  const stderrFd = openSync(DAEMON_LOG, "a");
  const daemon = getGatewayDaemonCommand();
  const child = spawn(daemon.command, daemon.args, {
    detached: true,
    stdio: ["ignore", stdoutFd, stderrFd],
    windowsHide: true,
  });
  child.unref();

  // 3. Wait until the gateway responds
  const port = await waitForGateway(configuredPort);
  if (port === null) {
    logger.error("Gateway did not start in time. Run 'rcodex setup' to reconfigure.");
    return;
  }
  const actualPort = port;

  // 4. Keep Codex config in sync with the actual running port
  const configPath = getCodexConfigPath();
  const codexPort = getCodexConfigPort(configPath);

  if (codexPort !== actualPort) {
    syncCodexConfigPort(configPath, actualPort);
    logger.success(
      `Config updated: ${MANAGED_PROVIDER_KEY} -> http://localhost:${actualPort}/v1` +
      (codexPort ? ` (was :${codexPort})` : " (new)")
    );
  } else {
    logger.success(`Config OK: ${MANAGED_PROVIDER_KEY} -> http://localhost:${actualPort}/v1`);
  }

  // 5. Migrate threads if needed (only when there's something to do)
  if (hasUnmigratedThreads(MANAGED_PROVIDER_KEY)) {
    logger.separator();
    logger.info("Unmigrated threads found; migrating to rcodex Gateway...");
    const codexRunning = await isCodexRunning();
    if (codexRunning) {
      await killCodex();
      await new Promise((r) => setTimeout(r, 800));
    }
    await migrateThreads(MANAGED_PROVIDER_KEY, false);
  }

  // Open gateway UI in the default browser
  const uiUrl = `http://localhost:${actualPort}`;
  if (platform() === "win32") {
    spawn("cmd.exe", ["/c", "start", "", uiUrl], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } else {
    const opener = platform() === "darwin" ? "open" : "xdg-open";
    spawn(opener, [uiUrl], { detached: true, stdio: "ignore" }).unref();
  }
  logger.success(`Gateway UI: ${uiUrl}`);
  logger.info("Run 'rcodex stop' to shut down the gateway.");
  process.exit(0);
}
