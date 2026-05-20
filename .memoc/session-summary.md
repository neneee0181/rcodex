# Session Summary
Last: 2026-05-20T18:25:00+0900
Keep each section <=3 bullets. Agent-owned; updated by you, not by `memoc update`.

## Status
- `rcodex` is a Node/TypeScript CLI plus local Fastify Responses-compatible gateway for routing Codex desktop/CLI through OpenAI/Codex, Anthropic Claude, Google Gemini, Ollama, Antigravity, and WIP GitHub Copilot.
- Gateway UI/API manages provider accounts, OAuth/key flows, active model slots, fallback routing, monitor logs/requests/usage, Codex config switching, and request token accounting.
- Package is prepared for npm `0.0.1`; `rcodex` checks npm latest and requires user-approved global update before launch when a newer version is available.

## Changed
- Renamed package, CLI command, README, npm metadata, runtime directory, and managed Codex provider key from prior names to `rcodex`.
- Removed old `cps`/`codex-provider-sync`/`revicodex` naming from source and dist; npm pack dry-run now emits `rcodex-0.0.1.tgz`.
- Fixed broken string literals exposed by the rename pass and verified `npm run build`, `npm pack --dry-run`, `node dist\index.js --version`, and `node dist\index.js --help`.

## Open Tasks
- Copilot real OAuth login/API flow has not been smoke-tested.
- No automated test script exists; use `npm run build` as the baseline verification for source edits.
- This workspace currently has no `.git/` directory; user plans to create a new GitHub repo for `rcodex`.

## Resume
- If git metadata is restored, inspect `git status` and recent commits first.
- For provider work, inspect `src/gateway/proxy.ts`, `src/gateway/server.ts`, `src/gateway/auth.ts`, `src/gateway/ui.ts`, and relevant `src/gateway/providers/*.ts`.