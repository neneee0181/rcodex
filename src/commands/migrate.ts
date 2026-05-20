import Database from "better-sqlite3";
import { existsSync, copyFileSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { logger } from "../utils/logger.js";
import { displayPath } from "../utils/paths.js";
import { MANAGED_PROVIDER_KEY } from "../core/constants.js";
import { isCodexRunning } from "../core/codex.js";

const CODEX_DIR = join(homedir(), ".codex");
const DB_PATH = join(CODEX_DIR, "state_5.sqlite");
const SESSIONS_DIR = join(CODEX_DIR, "sessions");

// rollout .jsonl ?뚯씪??泥?以?session_meta)?먯꽌 model_provider瑜??⑥튂?쒕떎.
function patchRolloutFile(filePath: string, targetProvider: string, dryRun: boolean): boolean {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length === 0) return false;

    const firstLine = JSON.parse(lines[0]);
    if (firstLine.type !== "session_meta") return false;

    const currentProvider = firstLine.payload?.model_provider;
    if (!currentProvider || currentProvider === targetProvider) return false;

    if (!dryRun) {
      firstLine.payload.model_provider = targetProvider;
      lines[0] = JSON.stringify(firstLine);
      writeFileSync(filePath, lines.join("\n"), "utf-8");
    }
    return true;
  } catch {
    return false;
  }
}

// sessions ?섏쐞 紐⑤뱺 .jsonl ?뚯씪???ш? ?먯깋
function findRolloutFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findRolloutFiles(full));
    } else if (entry.endsWith(".jsonl")) {
      results.push(full);
    }
  }
  return results;
}

// Returns true if any threads exist that are not already on targetProvider
export function hasUnmigratedThreads(targetProvider: string): boolean {
  if (!existsSync(DB_PATH)) return false;
  try {
    const db = new Database(DB_PATH, { readonly: true });
    try {
      const row = db
        .prepare(`SELECT COUNT(*) as n FROM threads WHERE model_provider != ?`)
        .get(targetProvider) as { n: number };
      return row.n > 0;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

// Core migration logic ??moves all threads to targetProvider (SQLite + .jsonl)
// Caller must ensure Codex is not running before calling this.
export async function migrateThreads(targetProvider: string, dryRun: boolean): Promise<void> {
  if (!existsSync(DB_PATH)) {
    logger.warn(`DB not found: ${displayPath(DB_PATH)}`);
    logger.info("Run Codex once to create the database, then try again.");
    return;
  }

  // ?? 1. SQLite ????????????????????????????????????????????????
  if (!dryRun) {
    copyFileSync(DB_PATH, `${DB_PATH}.backup-${Date.now()}`);
  }

  let db: InstanceType<typeof Database>;
  try {
    db = new Database(DB_PATH, { readonly: dryRun });
  } catch (err) {
    logger.error(`DB open failed: ${err}`);
    return;
  }

  let dbChanged = 0;
  try {
    const targets = db
      .prepare(`SELECT id, model_provider, title FROM threads WHERE model_provider != ?`)
      .all(targetProvider) as { id: string; model_provider: string; title: string }[];

    if (targets.length > 0) {
      if (!dryRun) {
        const res = db
          .prepare(`UPDATE threads SET model_provider = ? WHERE model_provider != ?`)
          .run(targetProvider, targetProvider);
        dbChanged = res.changes;
      } else {
        dbChanged = targets.length;
      }
    }
  } finally {
    db.close();
  }

  // ?? 2. Rollout .jsonl ?뚯씪 ?⑥튂 ?????????????????????????????
  const rolloutFiles = findRolloutFiles(SESSIONS_DIR);
  let fileChanged = 0;
  for (const f of rolloutFiles) {
    if (patchRolloutFile(f, targetProvider, dryRun)) fileChanged++;
  }

  logger.success(`Threads migrated ??"${targetProvider}": ${dbChanged} DB rows, ${fileChanged} session files`);
}

export async function runMigrate(dryRun = false, showHeader = true): Promise<void> {
  if (showHeader) logger.header();
  logger.info(`Migrating Codex threads ??"${MANAGED_PROVIDER_KEY}"...`);
  logger.separator();

  if (await isCodexRunning()) {
    logger.error("Codex is running. Close it completely and try again.");
    return;
  }

  await migrateThreads(MANAGED_PROVIDER_KEY, dryRun);

  logger.separator();
  if (dryRun) {
    logger.info("[DRY RUN] No changes written. Run 'rcodex migrate' to apply.");
  }
  logger.done();
}
