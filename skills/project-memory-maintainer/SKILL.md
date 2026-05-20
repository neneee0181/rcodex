---
name: project-memory-maintainer
description: Maintain this project's LLM-wiki memory files after durable context changes.
---

# Project Memory Maintainer

Use this local skill after meaningful project work so future agents can continue without rediscovering context.

## Required Reads

1. `.memoc/session-summary.md`
2. `memoc summary` or `memoc search "<query>"`; use `memoc grep "<query>"` only when source/text search is needed
3. Open only files you will use or update.

## Maintenance Checklist

- Keep `llms.txt` and `.memoc/00-agent-index.md` as concise maps.
- Keep `.memoc/00-project-brief.md` as the shortest project summary.
- Update `.memoc/02-current-project-state.md` with new status, tasks, commands, and change log entries.
- Update `.memoc/03-decisions.md` when a durable decision is made.
- Update `.memoc/04-handoff.md` before ending substantial work.
- Check `.memoc/05-done-checklist.md` before saying substantial work is complete.
- Update `.memoc/06-project-rules.md` when the user gives durable preferences.
- Append `.memoc/log.md` for meaningful changes, decisions, and handoffs.
- Create or update `.memoc/systems/*.md` when a subsystem needs durable explanation.
- Create or update `.memoc/wiki/*.md` when synthesized knowledge should compound over time.
- Keep completed history in `.memoc/log.md`; keep current-state files short.
- Keep tool output small; prefer `summary`, file-only search, `--limit`, and targeted reads.

## Concrete Triggers

Use this skill before finishing when any of these are true:

- The user gives a durable preference, project rule, changed requirement, or acceptance criterion.
- The agent edits code, config, package scripts, env, data, assets, routes, or deployment files.
- A subsystem's behavior, architecture, data flow, or API contract changes.
- A future agent would need to know why an approach was chosen or rejected.
- The work is partial, blocked, risky, multi-step, or likely to be resumed later.

Usually skip for pure Q&A, tiny edits with no future impact, or throwaway exploration.
