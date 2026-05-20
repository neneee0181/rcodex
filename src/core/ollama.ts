import { run, commandExists } from "../utils/shell.js";

export async function isOllamaInstalled(): Promise<boolean> {
  if (await commandExists("ollama")) return true;
  const result = await run("ollama --version");
  return result.exitCode === 0;
}

export async function getOllamaModels(): Promise<string[]> {
  const result = await run("ollama list", 15_000);
  if (result.exitCode !== 0) return [];
  const lines = result.stdout.split("\n");
  return lines
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\s+/)[0])
    .filter((name): name is string => !!name && name.length > 0);
}
