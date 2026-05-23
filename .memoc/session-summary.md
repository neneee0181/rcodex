---
memoc: true
type: state
scope: project-memory
created: 2026-05-21T17:12:48
updated: 2026-05-23T23:15:00
status: active
tags:
  - memoc
  - memoc/state
---
# Session Summary
Last: 2026-05-23T23:15:00
Replace, keep <800B. History: worklog. Risks: 04-handoff.

## Status
- Pi terminal is a canvas node with PTY auto-install/launch.
- macOS spawn-helper/PATH fixes and Antigravity native tool history are in main.
- Pi image paste shows inline `[이미지#N]`; Enter sends real paths.

## Recent Work (2026-05-23)
- Replaced Pi paste overlay with inline tokens + Ctrl/Cmd+V interception.
- Fixed Korean IME input after image tokens by buffering xterm onData.

## Open Tasks
- Windows Pi terminal test pending (user to verify).
- Smoke test Pi image paste in running app after dev-server restart.
