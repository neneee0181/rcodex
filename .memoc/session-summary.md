---
memoc: true
type: state
scope: project-memory
created: 2026-05-21T06:39:07
updated: 2026-05-21T17:52:16+0900
status: active
tags:
  - memoc
  - memoc/state
---
# Session Summary
Last: 2026-05-21T17:52:16+0900
Replace, do not append. Keep <800B. History: worklog. Resume risks: 04-handoff.md.

## Status
- `rcodex` is a TypeScript Node CLI plus Fastify Responses-compatible multi-provider gateway.
- Current package version is `0.0.16`; gateway body limit is configurable.

## Changed
- Added `~/.rcodex/gateway.json` `bodyLimitMiB` option, default 64 and clamped 1-1024.
- Worklog/activity are the shared history path; `session-summary.md` stays compact/latest-only.

## Open Tasks
- Smoke-test Windows first-install `rcodex` launch with existing Codex sessions.
- Smoke-test large Unreal/codebase tool-result turns through Claude/Gemini providers.
- Baseline verification for source edits remains `npm run build`.

## Resume
- Start with `memoc summary` or `.memoc/bin/memoc summary`; wrapper is working on macOS.
