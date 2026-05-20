import { homedir } from "os";
import { join } from "path";
import { mkdirSync, writeFileSync, existsSync } from "fs";

export function getCodexConfigDir(): string {
  return join(homedir(), ".codex");
}

export function getCodexConfigPath(): string {
  const dir = getCodexConfigDir();
  const configPath = join(dir, "config.toml");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(configPath)) {
    writeFileSync(configPath, "", "utf-8");
  }

  return configPath;
}

export function displayPath(p: string): string {
  const home = homedir();
  return p.startsWith(home) ? p.replace(home, "~") : p;
}
