# Session Summary
Last: 2026-05-20T20:16:00+0900
Keep each section <=3 bullets. Agent-owned; updated by you, not by `memoc update`.

## Status
- `rcodex` is a Node/TypeScript CLI plus local Fastify Responses-compatible gateway for routing Codex desktop/CLI through OpenAI/Codex, Anthropic Claude, Google Gemini, Ollama, Antigravity, and WIP GitHub Copilot.
- npm package name is scoped as `@kevin0181/rcodex`; installed binary remains `rcodex`.
- User preference: commit when useful, but do not push unless explicitly asked in that turn.

## Changed
- Cleaned CLI logger output to ASCII `[ok]`, `[warn]`, `[error]`, and dashed separators to avoid Windows console mojibake.
- Fixed dev daemon spawn to use `node --import tsx src/index.ts _gateway` instead of recursive `npm run dev`.
- Restored `src/gateway/ui.ts` after broken rcodex rename/encoding strings stopped dashboard JS, node rendering, and button handlers.
- Fixed remaining dashboard polish: ASCII gateway logs, icon-based UI controls, quota reset remaining-time parsing, and `#1/#2` labels for duplicate provider accounts.
- Improved canvas nodes: wider account cards with visible duplicate-account badges, and hidden/deleted slot IDs persist so active slots do not reappear on `npm run dev`.
- Audited rcodex rename fallout: fixed CLI version reporting to read `package.json`, removed unsupported Claude session option from UI, and corrected README/.gitignore rcodex details.
- Bumped npm package version from `0.0.3` to `0.0.4`; verified build, CLI version output, and npm pack dry-run.
- Fixed Windows self-update flow by starting a delayed updater process before exit; bumped package to `0.0.5` for the fix.

## Open Tasks
- Copilot real OAuth login/API flow has not been smoke-tested.
- No automated test script exists; use `npm run build` as the baseline verification for source edits.
- Current package version is `0.0.5`; next npm publish can use `npm publish --access public`.

## Resume
- If git metadata is restored, inspect `git status` and recent commits first.
- For provider work, inspect `src/gateway/proxy.ts`, `src/gateway/server.ts`, `src/gateway/auth.ts`, `src/gateway/ui.ts`, and relevant `src/gateway/providers/*.ts`.
