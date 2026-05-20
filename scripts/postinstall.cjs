const { execSync } = require("child_process");
const path = require("path");

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
