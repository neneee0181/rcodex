#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

function normalizePath(p) {
  try {
    return path.resolve(p.trim().replace(/[\\/]+/g, path.sep)).toLowerCase();
  } catch {
    return p.toLowerCase();
  }
}

try {
  const prefix = execSync("npm config get prefix", { encoding: "utf8" }).trim();
  let binDir;
  if (process.platform === "win32") {
    binDir = prefix;
  } else {
    binDir = path.join(prefix, "bin");
  }

  const normalizedBinDir = normalizePath(binDir);
  const paths = (process.env.PATH || "")
    .split(path.delimiter)
    .map(p => normalizePath(p));

  const isInPath = paths.some(p => p === normalizedBinDir || p === normalizedBinDir + path.sep);

  if (!isInPath) {
    console.warn("\n======================================================================");
    console.warn("??WARNING: The global npm binaries directory is not in your PATH!");
    console.warn("Please add the following directory to your PATH environment variable:");
    console.warn(`   ${binDir}`);
    console.warn("Otherwise, the 'rcodex' command will not be recognized by your terminal.");
    console.warn("======================================================================\n");
  }
} catch (e) {
  // Silent fail
}
