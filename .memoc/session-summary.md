# Session Summary
Last: 2026-05-20T18:30:00+0900
Keep each section <=3 bullets. Agent-owned; updated by you, not by `memoc update`.

## Status
- `rcodex` is a Node/TypeScript CLI plus local Fastify Responses-compatible gateway for routing Codex desktop/CLI through OpenAI/Codex, Anthropic Claude, Google Gemini, Ollama, Antigravity, and WIP GitHub Copilot.
- npm package name is scoped as `@kevin0181/rcodex` because unscoped `rcodex` was blocked by npm similarity policy; installed binary remains `rcodex`.
- `rcodex` checks npm latest and requires user-approved global update before launch when a newer version is available.

## Changed
- Updated `package.json` and `package-lock.json` name to `@kevin0181/rcodex` while preserving `bin.rcodex`.
- Updated README install/update/publish commands to use `npm install -g @kevin0181/rcodex` and `npm publish --access public`.
- Verified `npm run build`, `npm pack --dry-run`, and `npm view @kevin0181/rcodex` returns 404/not found.

## Open Tasks
- Copilot real OAuth login/API flow has not been smoke-tested.
- No automated test script exists; use `npm run build` as the baseline verification for source edits.
- This workspace currently has no `.git/` directory; user plans to create a new GitHub repo for `rcodex`.

## Resume
- If git metadata is restored, inspect `git status` and recent commits first.
- For provider work, inspect `src/gateway/proxy.ts`, `src/gateway/server.ts`, `src/gateway/auth.ts`, `src/gateway/ui.ts`, and relevant `src/gateway/providers/*.ts`.