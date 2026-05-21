---
memoc: true
type: core
scope: project-memory
created: 2026-05-21T06:39:07
updated: 2026-05-21T06:39:07
status: active
tags:
  - memoc
  - memoc/core
---
# Agent Index

This is the fast entry map for agents. Start here, then open only the docs relevant to the task.

## Read Order

1. Entry file managed block.
2. `.memoc/session-summary.md`.
3. Search first, then open only task-relevant files.

## Project Snapshot

<!-- memoc:snapshot:start -->
- Last synced: 2026-05-21T06:39:07
- Detected stack: Node.js, Fastify, TypeScript

### Config Files

- `package.json`
- `tsconfig.json`

### Source Directories

- `.claude`
- `.codex`
- `scripts`
- `src`

### Package Scripts

- `build`: `tsc && node -e "if(process.platform!=='win32')require('child_process').execSync('chmod +x dist/index.js')"`
- `start`: `node dist/index.js`
- `dev`: `tsx src/index.ts`
- `prepublishOnly`: `npm run build`
- `prepare`: `npm run build`
- `postinstall`: `node scripts/postinstall.cjs`
<!-- memoc:snapshot:end -->

## Core Docs

- [Boot](boot.md)
- [Project Brief](00-project-brief.md)
- [memoc Usage](memoc-usage.md)
- [Agent Workflow](01-agent-workflow.md)
- [Current Project State](02-current-project-state.md)
- [Decisions](03-decisions.md)
- [Handoff](04-handoff.md)
- [Done Checklist](05-done-checklist.md)
- [Project Rules](06-project-rules.md)
- [Session Summary](session-summary.md)
- [Activity](activity.md)
- [Actors](actors/README.md)
- [Worklog](worklog/README.md)
- [Wiki Index](wiki/index.md)
- [Raw Sources](raw/README.md)
- [Systems Index](systems/README.md)

## System Docs

_None yet. Add entries when subsystems are documented._

## Wiki

- [Wiki Index](wiki/index.md) — hub for every synthesized wiki page.
- [Sources](wiki/sources.md) — source provenance and ingest notes.
- [Glossary](wiki/glossary.md) — project terms and aliases.
- [Open Questions](wiki/questions.md) — unresolved knowledge gaps.
- [Wiki Lint](wiki/lint.md) — orphan, stale, and contradiction checks.
