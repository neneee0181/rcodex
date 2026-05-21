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

// rollout .jsonl 파일에서 (session_meta)의 model_provider를 업데이트한다.
function patchRolloutFile(filePath: string, targetProvider: string, dryRun: boolean): boolean {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length === 0) return false;

    const firstLine = JSON.parse(lines[0]);
    if (firstLine.type !== "session_meta") return false;

    if (!firstLine.payload || typeof firstLine.payload !== "object") return false;
    const currentProvider = firstLine.payload.model_provider;
    if (currentProvider === targetProvider) return false;

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

// sessions 디렉토리 내의 모든 .jsonl 파일 목록을 조회한다.
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

function hasUnmigratedRolloutFiles(targetProvider: string): boolean {
  for (const f of findRolloutFiles(SESSIONS_DIR)) {
    try {
      const first = readFileSync(f, "utf-8").split("\n", 1)[0];
      if (!first) continue;
      const item = JSON.parse(first);
      if (item.type !== "session_meta") continue;
      if (item.payload?.model_provider !== targetProvider) return true;
    } catch {
      // ignore malformed or unreadable rollout files
    }
  }
  return false;
}

// Returns true if any threads exist that are not already on targetProvider
export function hasUnmigratedThreads(targetProvider: string): boolean {
  let dbHasUnmigrated = false;
  try {
    if (existsSync(DB_PATH)) {
      const db = new Database(DB_PATH, { readonly: true });
      try {
        const row = db
          .prepare(`SELECT COUNT(*) as n FROM threads WHERE model_provider IS NULL OR model_provider != ?`)
          .get(targetProvider) as { n: number };
        dbHasUnmigrated = row.n > 0;
      } finally {
        db.close();
      }
    }
  } catch {
    // If DB detection fails, still check rollout files below.
  }
  return dbHasUnmigrated || hasUnmigratedRolloutFiles(targetProvider);
}

// Core migration logic: moves all threads to targetProvider (SQLite + .jsonl)
// Caller must ensure Codex is not running before calling this.
export async function migrateThreads(targetProvider: string, dryRun: boolean): Promise<void> {
  let dbChanged = 0;
  if (!existsSync(DB_PATH)) {
    logger.warn(`DB not found: ${displayPath(DB_PATH)}`);
    logger.info("Continuing with session file migration.");
  } else {
    // 단계 1. SQLite 마이그레이션
    if (!dryRun) {
      copyFileSync(DB_PATH, `${DB_PATH}.backup-${Date.now()}`);
    }

    let db: InstanceType<typeof Database> | null = null;
    try {
      db = new Database(DB_PATH, { readonly: dryRun });
      const targets = db
        .prepare(`SELECT id, model_provider, title FROM threads WHERE model_provider IS NULL OR model_provider != ?`)
        .all(targetProvider) as { id: string; model_provider: string | null; title: string }[];

      if (targets.length > 0) {
        if (!dryRun) {
          const res = db
            .prepare(`UPDATE threads SET model_provider = ? WHERE model_provider IS NULL OR model_provider != ?`)
            .run(targetProvider, targetProvider);
          dbChanged = res.changes;
        } else {
          dbChanged = targets.length;
        }
      }
    } catch (err) {
      logger.warn(`DB migration skipped: ${err}`);
    } finally {
      db?.close();
    }
  }

  // 단계 2. Rollout .jsonl 마이그레이션
  const rolloutFiles = findRolloutFiles(SESSIONS_DIR);
  let fileChanged = 0;
  for (const f of rolloutFiles) {
    if (patchRolloutFile(f, targetProvider, dryRun)) fileChanged++;
  }

  logger.success(`Threads migrated -> "${targetProvider}": ${dbChanged} DB rows, ${fileChanged} session files`);
}

export async function runMigrate(dryRun = false, showHeader = true): Promise<void> {
  if (showHeader) logger.header();
  logger.info(`Migrating Codex threads -> "${MANAGED_PROVIDER_KEY}"...`);
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