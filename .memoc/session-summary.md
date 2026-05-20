# Session Summary
Last: 2026-05-20T18:45:00+0900
Keep each section <=3 bullets. Agent-owned; updated by you, not by `memoc update`.

## Status
- `rcodex` is a Node/TypeScript CLI plus local Fastify Responses-compatible gateway for routing Codex desktop/CLI through OpenAI/Codex, Anthropic Claude, Google Gemini, Ollama, Antigravity, and WIP GitHub Copilot.
- npm package name is scoped as `@kevin0181/rcodex`; installed binary remains `rcodex`.
- User preference: commit when useful, but do not push unless explicitly asked in that turn.

## Changed
- Cleaned CLI logger output to ASCII `[ok]`, `[warn]`, `[error]`, and dashed separators to avoid Windows console mojibake.
- Rewrote command-facing sync messages and cleaned launch/switch/migrate/doctor messages that printed broken arrows or Korean mojibake.
- Fixed dev daemon spawn to use `node --import tsx src/index.ts _gateway` instead of recursive `npm run dev`, and verified `npm run build` plus `node --import tsx src/index.ts --help`.

## Open Tasks
- Copilot real OAuth login/API flow has not been smoke-tested.
- No automated test script exists; use `npm run build` as the baseline verification for source edits.
- If `0.0.3` was already published with broken output, next npm publish must bump to `0.0.4`.

## Resume
- If git metadata is restored, inspect `git status` and recent commits first.
- For provider work, inspect `src/gateway/proxy.ts`, `src/gateway/server.ts`, `src/gateway/auth.ts`, `src/gateway/ui.ts`, and relevant `src/gateway/providers/*.ts`.