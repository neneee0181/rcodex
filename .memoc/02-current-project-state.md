# Current Project State

Last synced: 2026-05-20T18:25:00+0900

## Current Status

- This repo is `rcodex`, a TypeScript Node CLI plus local Fastify Responses-compatible gateway for routing Codex requests through multiple AI providers.
- The default `rcodex` command checks npm for a newer `rcodex` version and requires user approval to update before launch when one exists; then it restarts the gateway, syncs Codex config, migrates threads if needed, launches Codex, and opens the UI.
- The gateway UI/API in `src/gateway/server.ts` manages accounts, OAuth/API-key flows, model slots, provider ordering/fallback, monitor logs/requests/usage, quota checks, and Codex provider switching.

## Project Snapshot

<!-- memoc:snapshot:start -->
- Last synced: 2026-05-20T18:25:00+0900
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
- Copilot real GitHub device OAuth and provider API calls have not been smoke-tested.
- This workspace currently has no `.git/` directory, so git status/diff is unavailable until repo metadata is restored or recloned.

## Completed Tasks

See `.memoc/log.md` for full history.

## Commands

- `npm run dev`: run the CLI directly with `tsx src/index.ts`.
- `npm run build`: compile TypeScript into `dist/`.
- `npm start`: run the built CLI from `dist/index.js`.
- `rcodex`: package binary that enforces accepted npm updates, then starts gateway + launches Codex.
- `rcodex setup`: first-time setup in foreground mode.

## Notes

- Main runtime config: `~/.rcodex/gateway.json`; logs: `~/.rcodex/gateway.log`; request history: `~/.rcodex/requests.jsonl`.
- Default gateway port is `3141`; Codex provider key managed by this project is `rcodex`; base URL is `http://localhost:<port>/v1` with `wire_api = "responses"`.
- Package dependencies include Fastify/CORS for the gateway, Commander for CLI commands, `@iarna/toml` for Codex config edits, and `better-sqlite3` for Codex thread migration support.
- Package version is prepared as `0.0.1`; npm name, binary, runtime directory, README, and provider key are all `rcodex`.
- Antigravity credentials search order: user override `~/.rcodex/antigravity-app.json`, then bundled `dist/antigravity-credentials.json`; package warns when bundled credentials are absent.
- Dynamic Windows Codex App Detection searches `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe` dynamically to cover dynamic hash/version subfolders from local app installations.

## Change Log

See `.memoc/log.md`.
