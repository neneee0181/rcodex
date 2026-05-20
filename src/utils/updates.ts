import { spawnSync } from "child_process";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { readFileSync } from "fs";

interface PackageInfo {
  name: string;
  version: string;
}

interface NpmLatestResponse {
  version?: string;
}

function readPackageInfo(): PackageInfo {
  const packageUrl = new URL("../../package.json", import.meta.url);
  const parsed = JSON.parse(readFileSync(packageUrl, "utf8")) as Partial<PackageInfo>;
  return {
    name: parsed.name ?? "rcodex",
    version: parsed.version ?? "0.0.0",
  };
}

function compareSemver(a: string, b: string): number {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

async function getLatestNpmVersion(packageName: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json() as NpmLatestResponse;
    return data.version ?? null;
  } catch {
    return null;
  }
}

async function confirmUpdate(packageName: string, currentVersion: string, latestVersion: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      `rcodex ${latestVersion} is available, but this shell is not interactive. ` +
      `Run "npm install -g ${packageName}@latest" and then run "rcodex" again.`
    );
    return false;
  }

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      `rcodex ${latestVersion} is available (installed: ${currentVersion}). Update now? [y/N] `
    );
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

function installLatest(packageName: string, latestVersion: string): boolean {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["install", "-g", `${packageName}@${latestVersion}`], {
    stdio: "inherit",
    windowsHide: true,
  });
  return result.status === 0;
}

export async function enforceAcceptedLatestVersion(): Promise<void> {
  const { name, version } = readPackageInfo();
  const latestVersion = await getLatestNpmVersion(name);

  if (!latestVersion || compareSemver(latestVersion, version) <= 0) {
    return;
  }

  const accepted = await confirmUpdate(name, version, latestVersion);
  if (!accepted) {
    console.error("Update required before launching rcodex.");
    process.exit(1);
  }

  const installed = installLatest(name, latestVersion);
  if (!installed) {
    console.error(`rcodex update failed. Please run: npm install -g ${name}@latest`);
    process.exit(1);
  }

  console.log("rcodex updated successfully. Run \"rcodex\" again to launch the new version.");
  process.exit(0);
}
