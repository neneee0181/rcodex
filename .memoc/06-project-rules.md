---
memoc: true
type: state
scope: project-memory
created: 2026-05-21T06:39:07
updated: 2026-05-21T06:39:07
status: active
tags:
  - memoc
  - memoc/state
---
# Project Rules

Durable user and project preferences live here. Update when the user gives a rule that should persist across sessions.

## Operating Rules

- Keep `AGENTS.md` and `CLAUDE.md` as short entry files; durable context belongs under `.memoc/`.
- Do not track generated output folders such as `out/`, `.next/`, `dist/`, `build/` unless the user explicitly asks.
- Update `.memoc/04-handoff.md` after substantial work so the next agent can resume quickly.
- Use `.memoc/05-done-checklist.md` before saying substantial work is complete.

## Agent Behavior Preferences

- Be factual and operational in memory docs.
- Keep logs concise; do not paste temporary command output unless it changes future work.
- Preserve user changes and avoid reverting unrelated work.
- State unverified parts honestly in the final answer and handoff.
- Commit when useful, but do not push unless the user explicitly asks for push in that turn.

## Project-Specific Rules

- Treat future user requests as distribution/multi-user work by default. Prefer npm/package-ready behavior, clean first-run setup, portable paths, clear errors, and docs that help other users, not one-off local-only fixes.
