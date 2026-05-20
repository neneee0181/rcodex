import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { mkdirSync } from "fs";
import TOML from "@iarna/toml";
import type { CodexConfig } from "../types/index.js";
import { getCodexConfigDir } from "../utils/paths.js";

export function readCodexConfig(configPath: string): CodexConfig {
  if (!existsSync(configPath)) {
    return {};
  }
  const raw = readFileSync(configPath, "utf-8");
  if (!raw.trim()) {
    return {};
  }
  return TOML.parse(raw) as unknown as CodexConfig;
}

export function writeCodexConfig(configPath: string, config: CodexConfig, dryRun = false): void {
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const tomlStr = TOML.stringify(config as Parameters<typeof TOML.stringify>[0]);
  if (!dryRun) {
    writeFileSync(configPath, tomlStr, "utf-8");
  }
}

export function backupCodexConfig(configPath: string): string {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const backupPath = join(getCodexConfigDir(), `config.toml.backup-${ts}`);
  if (existsSync(configPath)) {
    copyFileSync(configPath, backupPath);
  } else {
    writeFileSync(backupPath, "", "utf-8");
  }
  return backupPath;
}

// ?¥Ï†Ñ Î≤ÑÏ†Ñ?êÏÑú ?òÎ™ª ?±Î°ù??provider ?§Îì§???ïÎ¶¨?úÎã§.
// MANAGED_PROVIDER_KEY(rcodex)Îß??®Í∏∞Í≥??òÎ®∏ÏßÄ ?àÍ±∞?????úÍ±∞.
export function removeLegacyProviders(config: CodexConfig, keepKey: string): void {
  // Íµ?model_providers ???úÍ±∞
  if (config.model_providers) {
    const legacyKeys = ["ollama", "ollama-local", "pi"];
    for (const key of legacyKeys) {
      if (key !== keepKey && key in config.model_providers) {
        delete config.model_providers[key];
      }
    }
  }

  // Íµ?providerÎ•?Ï∞∏Ï°∞?òÎäî profile??model_providerÎ•?keepKeyÎ°??ÖÎç∞?¥Ìä∏
  if (config.profiles && keepKey) {
    const legacyProviders = new Set(["ollama", "ollama-local", "pi"]);
    for (const profile of Object.values(config.profiles)) {
      if (legacyProviders.has(profile.model_provider)) {
        profile.model_provider = keepKey;
      }
    }
  }
}

