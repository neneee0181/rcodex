#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { runSync } from "./commands/sync.js";
import { runDoctor } from "./commands/doctor.js";
import { runSwitch } from "./commands/switch.js";
import { runMigrate } from "./commands/migrate.js";
import { runStop } from "./commands/stop.js";
import { runSetup } from "./commands/setup.js";
import { runLaunch } from "./commands/launch.js";
import { runGatewayDaemon } from "./commands/gateway-daemon.js";
import { enforceAcceptedLatestVersion } from "./utils/updates.js";

function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const program = new Command();

program
  .name("rcodex")
  .description("rcodex - manage AI providers for Codex")
  .version(getPackageVersion());

program.action(async () => {
  await enforceAcceptedLatestVersion();
  await runLaunch();
});

program
  .command("setup")
  .description("Run first-time setup in the foreground")
  .action(async () => {
    await runSetup();
    process.exit(0);
  });

program
  .command("stop")
  .description("Stop the background gateway process")
  .action(async () => {
    await runStop();
    process.exit(0);
  });

program
  .command("gateway")
  .description("Switch Codex to use rcodex Gateway (Claude / GPT / Gemini / Ollama)")
  .action(async () => {
    await runSwitch("gateway");
    process.exit(0);
  });

program
  .command("openai")
  .description("Switch Codex to native OpenAI (bypasses gateway)")
  .action(async () => {
    await runSwitch("openai");
    process.exit(0);
  });

program
  .command("sync")
  .description("Register rcodex Gateway in Codex config and migrate existing threads")
  .option("--dry-run", "Preview changes without writing to config", false)
  .action(async (opts: { dryRun: boolean }) => {
    await runSync({ dryRun: opts.dryRun });
    process.exit(0);
  });

program
  .command("doctor")
  .description("Check installation and gateway status")
  .action(async () => {
    await runDoctor();
    process.exit(0);
  });

program
  .command("migrate")
  .description("Migrate existing Codex threads to rcodex provider (close Codex first)")
  .option("--dry-run", "Preview changes without modifying DB", false)
  .action(async (opts: { dryRun: boolean }) => {
    await runMigrate(opts.dryRun);
    process.exit(0);
  });

program
  .command("_gateway", { hidden: true })
  .action(async () => {
    await runGatewayDaemon();
  });

program.parse(process.argv);
