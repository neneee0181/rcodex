# Current Project State

Last synced: 2026-05-21T12:14:08+0900

## Current Status

- This repo is `rcodex`, a TypeScript Node CLI plus local Fastify Responses-compatible gateway for routing Codex requests through multiple AI providers.
- The default `rcodex` command checks npm for a newer `rcodex` version and requires user approval to update before launch when one exists; then it restarts the gateway, syncs Codex config, migrates threads if needed, launches Codex, and opens the UI.
- The gateway UI/API manages accounts, OAuth/API-key flows, model slots, provider ordering/fallback, monitor logs/requests/usage, quota checks, duplicate account labels, hidden canvas slots, and Codex provider switching.
- Gateway runtime logs now avoid emoji/mojibake prefixes in active log lines, and Ollama tool fallback file search uses a Node-based command instead of Unix `find ... 2>/dev/null`.
- OpenAI quota refresh treats ChatGPT usage API 401/403 as unavailable for the Codex OAuth token rather than a fatal UI error.
- Copilot requests sanitize OpenAI-format chat history before calling GitHub Copilot, dropping dangling assistant tool calls and orphan tool outputs that can appear after interrupted tool turns.

## Project Snapshot

<!-- memoc:snapshot:start -->
- Last synced: 2026-05-21T10:20:00+0900
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

- `build`: `tsc && node -e "if(process.platform!=='win32')require('child_process').execSync('chmod +x dist/index.js')" && node -e "const{existsSync}=require('fs');if(!existsSync('dist/antigravity-credentials.json'))console.warn('[rcodex] dist/antigravity-credentials.json missing; Antigravity OAuth requires ~/.rcodex/antigravity-app.json');"`
- `start`: `node dist/index.js`
- `dev`: `tsx src/index.ts`
- `prepublishOnly`: `npm run build`
- `prepare`: `npm run build`
- `postinstall`: `node scripts/postinstall.cjs`
<!-- memoc:snapshot:end -->

## Open Tasks

- No automated test script exists; use `npm run build` as the baseline verification for source edits.
- Copilot real GitHub device OAuth and provider API calls have not been smoke-tested after the strict tool-history fix.
- Current package version is `0.0.14`; publish with `npm publish --access public` after review.

## Completed Tasks

See `.memoc/log.md` for full history.

## Commands

- `npm run dev`: run the CLI directly with `tsx src/index.ts`.
- `npm run build`: compile TypeScript into `dist/`.
- `npm start`: run the built CLI from `dist/index.js`.
- `rcodex`: package binary that enforces accepted npm updates, then starts gateway + launches Codex.
- `rcodex --version`: reads the installed package version from `package.json`.
- `rcodex setup`: first-time setup in foreground mode.

## Notes

- Main runtime config: `~/.rcodex/gateway.json`; logs: `~/.rcodex/gateway.log`; request history: `~/.rcodex/requests.jsonl`.
- Default gateway port is `3141`; Codex provider key managed by this project is `rcodex`; base URL is `http://localhost:<port>/v1` with `wire_api = "responses"`.
- Package dependencies include Fastify/CORS for the gateway, Commander for CLI commands, `@iarna/toml` for Codex config edits, and `better-sqlite3` for Codex thread migration support.
- Current package version is `0.0.14`; npm package name is `@kevin0181/rcodex`, binary/runtime directory/README/provider key are `rcodex`.
- Ollama can now receive image payloads when Codex sends `input_image` parts or text containing local image paths; those are converted into OpenAI-compatible `image_url` data URLs. A vision-capable Ollama model is still required.
- If Ollama returns `missing data required for image input`, the stream now completes with a clear text error instead of surfacing a protocol error that makes Codex reconnect repeatedly.
- If an Ollama model returns `does not support tools` (for example `llama3.2-vision`), rcodex retries that stream without function tools instead of failing the stream.
- Antigravity credentials search order: user override `~/.rcodex/antigravity-app.json`, bundled private `dist/antigravity-credentials.json` when available, then built-in public desktop OAuth client fallback.
- Antigravity OAuth uses 9router-aligned Cloud Code Assist scopes (`cclog` and `experimentsandconfigs`) and should work from npm install without local app credentials.
- Antigravity models are fetched dynamically from `cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels` when available, with the old default/probe list as fallback; usage monitor can show per-model Antigravity remaining/reset quota.
- Usage monitor includes Anthropic, OpenAI, and Antigravity OAuth accounts; output-node disconnect now removes the local canvas node and marks it hidden so browser refresh does not resurrect it.
- Antigravity provider subtitle is `Google Code Assist`; the old `Google (Daily)` wording came from Google's daily-cloudcode internal endpoint naming.
- Dynamic Windows Codex App Detection searches `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe` dynamically to cover dynamic hash/version subfolders from local app installations.
- Copilot GPT-5 mini can reject histories with `assistant.tool_calls` lacking matching `tool` responses; `src/gateway/proxy.ts` now sanitizes those histories before both streaming and non-streaming Copilot calls.

## Change Log

See `.memoc/log.md`.
