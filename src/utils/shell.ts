import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function run(command: string, timeoutMs = 10_000): Promise<ShellResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeoutMs,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      windowsHide: true,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: (e.stdout ?? "").trim(),
      stderr: (e.stderr ?? "").trim(),
      exitCode: e.code ?? 1,
    };
  }
}

export async function commandExists(cmd: string): Promise<boolean> {
  const checkCmd =
    process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`;
  const result = await run(checkCmd);
  return result.exitCode === 0;
}
