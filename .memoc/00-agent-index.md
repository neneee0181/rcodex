# Agent Index

This is the fast entry map for agents. Start here, then open only the docs relevant to the task.

## Read Order

1. Entry file managed block.
2. `.memoc/session-summary.md`.
3. Search first, then open only task-relevant files.

## Project Snapshot

<!-- memoc:snapshot:start -->
- Last synced: 2026-05-20T07:59:44
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

- `build`: `tsc && node -e "if(process.platform!=='win32')require('child_process').execSync('chmod +x dist/index.js')" && node -e "const{existsSync}=require('fs');if(!existsSync('dist/antigravity-credentials.json'))console.warn('??dist/antigravity-credentials.json missing ??Antigravity OAuth will fail. Copy from ~/.rcodex/antigravity-app.json');"`
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
- [Project Log](log.md)
- [Wiki Index](wiki/index.md)
- [Systems Index](systems/README.md)

## System Docs

_None yet. Add entries when subsystems are documented._

## Wiki

_None yet. Add entries when wiki pages are created._
