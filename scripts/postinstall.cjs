const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Fix missing execute permission on node-pty spawn-helper prebuilds (macOS/Linux).
// npm sometimes unpacks prebuilt binaries without the +x bit, causing posix_spawnp to fail.
if (process.platform !== "win32") {
  try {
    const prebuildsDir = path.join(__dirname, "..", "node_modules", "node-pty", "prebuilds");
    if (fs.existsSync(prebuildsDir)) {
      for (const dir of fs.readdirSync(prebuildsDir)) {
        const helper = path.join(prebuildsDir, dir, "spawn-helper");
        if (fs.existsSync(helper)) {
          const mode = fs.statSync(helper).mode;
          if (!(mode & 0o111)) fs.chmodSync(helper, mode | 0o111);
        }
      }
    }
  } catch { /* ignore */ }
}

// Patch node-pty's conpty_console_list_agent fork to use windowsHide:true.
// Without this, the fork briefly creates a visible console window on Windows
// every time a PTY process exits (page refresh, restart, tab close, etc.).
try {
  const agentFile = path.join(__dirname, "..", "node_modules", "node-pty", "lib", "windowsPtyAgent.js");
  if (fs.existsSync(agentFile)) {
    const src = fs.readFileSync(agentFile, "utf8");
    const patched = src.replace(
      /child_process_1\.fork\(path\.join\(__dirname,\s*'conpty_console_list_agent'\),\s*\[_this\._innerPid\.toString\(\)\]\)/,
      "child_process_1.fork(path.join(__dirname, 'conpty_console_list_agent'), [_this._innerPid.toString()], { windowsHide: true })"
    );
    if (patched !== src) {
      fs.writeFileSync(agentFile, patched, "utf8");
    }
  }
} catch { /* ignore patch failures */ }

function normalizePath(inputPath) {
  try {
    return path.resolve(inputPath.trim().replace(/[\\/]+/g, path.sep)).toLowerCase();
  } catch {
    return inputPath.toLowerCase();
  }
}

try {
  const prefix = execSync("npm config get prefix", { encoding: "utf8" }).trim();
  const binDir = process.platform === "win32" ? prefix : path.join(prefix, "bin");
  const normalizedBinDir = normalizePath(binDir);
  const paths = (process.env.PATH || "")
    .split(path.delimiter)
    .map((entry) => normalizePath(entry));

  const isInPath = paths.some((entry) => entry === normalizedBinDir || entry === normalizedBinDir + path.sep);

  if (!isInPath) {
    console.warn("\n======================================================================");
    console.warn("WARNING: The global npm binaries directory is not in your PATH.");
    console.warn("Please add the following directory to your PATH environment variable:");
    console.warn(`   ${binDir}`);
    console.warn("Otherwise, the 'rcodex' command will not be recognized by your terminal.");
    console.warn("======================================================================\n");
  }
} catch {
  // Do not fail installation for a PATH warning.
}
