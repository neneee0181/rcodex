# Session Summary Archive

Older oversized startup summaries moved by `memoc trim-summary`.

## [2026-05-21T06:39:07] archived summary (5333B)

# Session Summary
Last: 2026-05-21T12:18:54+0900
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
- Replaced the dashboard `fit` text control with an icon button, added Antigravity/Copilot image provider icons, and bumped package to `0.0.6`.
- Fixed the fit icon button rendering by inlining the SVG in the toolbar HTML instead of referencing a script-local icon map.
- Changed self-update flow to run npm install in the foreground with visible output; bumped package to `0.0.7`.
- Polished dashboard icons: provider image wrapper styling, rounded/clipped provider badges, SVG zoom controls; bumped package to `0.0.8`.
- Root-caused Windows self-update failure to `spawnSync('npm.cmd')` returning `EINVAL`; switched to foreground `cmd.exe /c npm install ...` with error details and bumped package to `0.0.9`.
- Fixed Windows updater package target quoting that made npm see `""@kevin0181/rcodex@...""`; bumped package to `0.0.11`.
- Fixed Requests monitor scroll behavior so first load starts at top and refresh preserves current scroll instead of jumping to bottom.
- Added gateway lifecycle logging for parent kills, daemon signals, uncaught errors, unhandled rejections, process exits, and Fastify close.
- Cleaned remaining runtime gateway log prefixes from `??` to ASCII and replaced Ollama fallback file search commands so Windows no longer turns `2>/dev/null` into `C:\dev\null`.
- Added Ollama vision message serialization: `input_image` parts and detected local image paths in text are converted to OpenAI-compatible `image_url` data URLs for vision-capable local models.
- Handled Ollama `missing data required for image input` 500s as a normal text response so Codex stops reconnecting and tells the user to switch to a vision-capable Ollama model.
- Fixed `llama3.2-vision`/Ollama models that reject tools by retrying the same stream request without gateway function tools when Ollama returns `does not support tools`.
- Aligned Antigravity OAuth with 9router scopes (`cclog`, `experimentsandconfigs`) and restored the public desktop OAuth client fallback, while keeping user overrides in `~/.rcodex/antigravity-app.json`.
- Changed Antigravity model discovery from hardcoded probe-only to `fetchAvailableModels`, added `ag/gemini-3.5-flash` fallback, and surfaced per-model Antigravity quota rows in the usage monitor.
- Fixed usage monitor account filter to include Antigravity, made OpenAI/Claude OAuth model loading attempt dynamic fetch before fallback, and made output disconnect remove/hide the canvas node persistently.
- Made OpenAI quota 401/403 show as unavailable instead of a red refresh error, and renamed the Antigravity provider subtitle from `Google (Daily)` to `Google Code Assist`.
- Fixed Copilot chat history sanitization so dangling `assistant.tool_calls` from interrupted GPT-5 mini/Copilot tool turns are removed before sending requests to GitHub Copilot.
- Fixed Antigravity/Gemini strict tool history handling: stateless or unsigned tool turns are converted to text transcript instead of sending `functionCall` parts without `thoughtSignature`.

## Open Tasks
- Copilot real OAuth login/API flow has not been smoke-tested after the strict tool-history fix.
- Antigravity real provider flow should be smoke-tested on `ag/gemini-2.5-flash-lite`/Flash Lite if available.
- No automated test script exists; use `npm run build` as the baseline verification for source edits.
- Current package version is `0.0.14`; next npm publish can use `npm publish --access public`.

## Resume
- If git metadata is restored, inspect `git status` and recent commits first.
- For provider work, inspect `src/gateway/proxy.ts`, `src/gateway/server.ts`, `src/gateway/auth.ts`, `src/gateway/ui.ts`, and relevant `src/gateway/providers/*.ts`.

## [2026-05-21T16:43:30] archived summary (1049B)

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

## [2026-05-21T16:44:10] archived summary (874B)

---
memoc: true
type: state
scope: project-memory
created: 2026-05-21T16:43:30
updated: 2026-05-21T16:43:30
status: active
tags:
  - memoc
  - memoc/state
---
# Session Summary
Last: 2026-05-22T01:45:00+0900
Replace, do not append. Keep <800B.
History: worklog. Resume risks: 04-handoff.md.

## Status
- `rcodex` is a TypeScript Node CLI plus Fastify Responses-compatible multi-provider gateway.
- Current package version is `0.0.16`; node dependencies installed and builds successfully on Windows.

## Changed
- Installed npm packages and verified build (`npm run build`) succeeds on Windows.
- Initial memory structure synced using `memoc update`.

## Open Tasks
- Smoke-test first-install launch on Windows.
- Smoke-test tool history fixes with Claude/Gemini.
- Baseline verification via `npm run build`.

## Resume
- Test gateway functionality by running `npm run dev`.
