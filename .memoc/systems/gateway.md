---
memoc: true
type: system
scope: project-memory
created: 2026-05-21T06:39:07
updated: 2026-05-21T06:39:07
status: active
tags:
  - memoc
  - memoc/system
---
# Gateway and CLI

## Purpose

`rcodex` ships the `rcodex` binary. It lets Codex use a local Responses-compatible gateway instead of talking directly only to the built-in OpenAI provider.

The gateway can route requests through OpenAI/Codex, Anthropic Claude, Google Gemini, local Ollama, Antigravity, and WIP GitHub Copilot accounts. The browser UI lets the user add accounts, choose models, create active model slots, and order slots as a fallback chain.

## Main Files

- `src/index.ts`: Commander CLI entrypoint. Default action runs `runLaunch()`.
- `src/commands/launch.ts`: normal `rcodex` flow; starts/restarts the detached gateway daemon, waits for health, syncs Codex config port, migrates threads if needed, launches Codex, and opens the UI.
- `src/commands/sync.ts`: registers the gateway provider in `~/.codex/config.toml`, backs up config, removes legacy provider keys, and runs thread migration.
- `src/commands/switch.ts`: switches Codex between rcodex gateway mode and native OpenAI mode.
- `src/commands/migrate.ts`: updates existing Codex threads to the target provider key in both `state_5.sqlite` and `.codex/sessions/**/*.jsonl`; launch uses its detector before opening Codex.
- `src/gateway/server.ts`: Fastify HTTP server for UI, status, logs, request history, quota, account/model management, OAuth callbacks, provider switching, and `/v1/responses` proxy endpoints.
- `src/gateway/proxy.ts`: normalizes Responses API input, tracks conversation state, forwards or converts requests to provider APIs, logs request outcomes, and handles fallback.
- `src/gateway/auth.ts`: owns `~/.rcodex/gateway.json`, account records, model slot state, migration from older config formats, PID handling, and provider auth conversion.
- `src/gateway/providers/*.ts`: provider-specific model listing and request/OAuth helpers.
- `src/gateway/providers/antigravity*.ts`: Google/Antigravity OAuth and Gemini/Cloud Code provider helpers, including project-id loading, dynamic model discovery, quota checks, and thoughtSignature preservation across tool turns.
- `src/gateway/providers/copilot.ts`: GitHub device-code OAuth, Copilot token exchange/cache, model listing, and chat completions calls.
- `src/gateway/ui.ts`: Copilot device OAuth shows a sidebar code screen with copy/open actions while polling `/api/accounts`.
- Provider model discovery should fail closed where possible: do not show static fallback models after API discovery errors, except for backends with no discovery API and known constrained support.
- `src/core/config.ts`: reads/writes/backups Codex TOML config and removes legacy provider keys.

## Runtime State

- Gateway config: `~/.rcodex/gateway.json`
- Gateway log: `~/.rcodex/gateway.log`
- Request log: `~/.rcodex/requests.jsonl`
- Antigravity app credentials: user override `~/.rcodex/antigravity-app.json`; bundled npm package copy `dist/antigravity-credentials.json` when available.
- Codex config: `~/.codex/config.toml`
- Managed Codex provider key: `rcodex`
- Default gateway config port: `3141`; README/user-facing default may refer to the active runtime port and should be kept aligned when behavior changes.

## Commands

- `npm run dev`: run the CLI through `tsx src/index.ts`.
- `npm run build`: compile TypeScript into `dist/` and chmod `dist/index.js`; this is the baseline verification command because no test script is defined.
- `npm start`: run the built CLI from `dist/index.js`.
- `rcodex`: start gateway + launch Codex when installed/built.
- `rcodex stop`: stop the background gateway.
- `rcodex gateway`: switch Codex to rcodex gateway mode.
- `rcodex openai`: switch Codex back to native OpenAI mode.
- `rcodex doctor`: inspect installation and gateway status.
- `rcodex sync`: re-register gateway provider and migrate threads.
- `rcodex migrate`: migrate existing Codex threads to the target provider.

## Notes For Future Agents

- Be careful with files under `~/.codex/` and `~/.rcodex/`; they are user runtime/config state, not repo fixtures.
- Provider credentials are local runtime data and must not be copied into docs, tests, or commits.
- After changing CLI command behavior or provider support, update README and this file together; README currently mentions Antigravity and WIP Copilot.
- After changing TypeScript source, run `npm run build`; add tests only after introducing a test framework/script.
- Antigravity model discovery attempts `cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels` first, then falls back to default/probed model support and caches results for 10 minutes.
- First `rcodex` launch should auto-migrate existing conversations. Do not rely only on SQLite presence for this path; JSONL session metadata may be the only migration source on some installs.
