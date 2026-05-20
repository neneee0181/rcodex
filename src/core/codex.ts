import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { run, commandExists } from "../utils/shell.js";

const MAC_FALLBACK_PATHS = [
  "/Applications/Codex.app/Contents/Resources/codex",
  "/usr/local/bin/codex",
  "/opt/homebrew/bin/codex",
];

// Windows: `where` searches PATH + registry App Paths ??covers both npm CLI and desktop app
async function whereFirst(names: string[]): Promise<string | null> {
  for (const name of names) {
    const result = await run(`where ${name}`);
    if (result.exitCode === 0) {
      const found = result.stdout.split(/\r?\n/)[0].trim();
      if (found) return found;
    }
  }
  return null;
}

export async function isCodexInstalled(): Promise<boolean> {
  if (process.platform === "win32") {
    return (await getCodexExePath()) !== null;
  }
  if (await commandExists("codex")) return true;
  if (MAC_FALLBACK_PATHS.some((p) => existsSync(p))) return true;
  const result = await run("codex --version");
  return result.exitCode === 0;
}

// Returns the actual exe path to launch the Codex app (Windows only)
export async function getCodexExePath(): Promise<string | null> {
  if (process.platform !== "win32") return null;

  // 1. Check system PATH
  const pathExe = await whereFirst(["Codex.exe", "codex.exe", "codex.cmd", "codex"]);
  if (pathExe) return pathExe;

  // 2. Dynamic check in local AppData (OpenAI Codex installs in a dynamic version subfolder)
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const openAiCodexBinDir = join(localAppData, "OpenAI", "Codex", "bin");
    if (existsSync(openAiCodexBinDir)) {
      try {
        const subdirs = readdirSync(openAiCodexBinDir, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        for (const subdir of subdirs) {
          const exePath = join(openAiCodexBinDir, subdir, "codex.exe");
          if (existsSync(exePath)) {
            return exePath;
          }
        }
      } catch {
        // ignore read errors
      }
    }
  }

  // 3. Check other common standard installation paths
  const standardPaths = [
    join(process.env.ProgramFiles || "C:\\Program Files", "Codex", "Codex.exe"),
    join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Codex", "Codex.exe"),
    join(process.env.APPDATA || "", "OpenAI", "Codex", "codex.exe"),
  ];

  for (const p of standardPaths) {
    if (existsSync(p)) return p;
  }

  return null;
}

export async function isCodexRunning(): Promise<boolean> {
  let result;
  if (process.platform === "win32") {
    result = await run('tasklist /FI "IMAGENAME eq Codex.exe" /NH');
    return result.stdout.toLowerCase().includes("codex.exe");
  } else if (process.platform === "darwin") {
    result = await run('pgrep -f "Codex.app/Contents/MacOS"');
  } else {
    result = await run("pgrep -f codex");
  }
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}

export async function killCodex(): Promise<boolean> {
  if (!(await isCodexRunning())) return false;
  if (process.platform === "win32") {
    await run("taskkill /F /IM Codex.exe");
  } else if (process.platform === "darwin") {
    await run('pkill -f "Codex.app/Contents/MacOS"');
  } else {
    await run("pkill -f codex");
  }
  return true;
}

export async function openCodexApp(): Promise<void> {
  if (process.platform === "darwin") {
    await run("open -a Codex");
  } else if (process.platform === "win32") {
    // 1. Try launching the Windows Store App first using AUMID via explorer
    const checkStoreApp = await run('powershell -Command "Get-AppxPackage OpenAI.Codex"');
    if (checkStoreApp.exitCode === 0 && checkStoreApp.stdout.includes("OpenAI.Codex_2p2nqsd0c76g0")) {
      await run("explorer.exe shell:AppsFolder\\OpenAI.Codex_2p2nqsd0c76g0!App");
    } else {
      // 2. Fallback to CLI executable
      const exePath = await getCodexExePath();
      if (exePath) {
        await run(`start "" "${exePath}"`);
      } else {
        await run("start Codex");
      }
    }
  }
}
