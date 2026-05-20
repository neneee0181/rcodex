# Project Log

Append-only chronological log for project memory updates.

## [2026-05-18T10:38:34] init | Initialized memoc memory structure.

## [2026-05-18T10:39:45] update | Re-scanned: Node.js, Fastify, TypeScript

## [2026-05-18T19:39:56+0900] memory | Clarified project identity and architecture

- Confirmed the repo is the `rcodex` / `rcodex` TypeScript CLI and local Fastify gateway for routing Codex through OpenAI/Codex, Anthropic, Gemini, and Ollama.
- Updated project brief, current state, session summary, handoff, LLM map, systems index, and added `.memoc/systems/gateway.md`.
- Verified `npm run build`.

## [2026-05-18T19:46:58+0900] investigation | Claude OAuth stream reconnect / 429

- User clarified the project is for connecting the Codex desktop app to rcodex as an endpoint and experimenting with alternate models.
- Inspected `~/.rcodex/gateway.log`, `~/.rcodex/requests.jsonl`, and streaming code; Claude tool-use turns succeeded repeatedly, then Anthropic returned 429 rate-limit errors.
- Noted likely UX bug: rcodex error path sends SSE `error` and closes before `response.completed`, so Codex reports reconnecting / stream closed before completion.

## [2026-05-18T19:52:39+0900] fix | Complete stream with usage-limit message

- Updated `src/gateway/server.ts` streaming catch path to emit an assistant message and `response.completed` instead of closing after SSE `error`.
- Anthropic 429 / `rate_limit_error` now becomes a Korean Claude Code usage-limit message inside Codex.
- Verified `npm run build`.

## [2026-05-18T19:55:30+0900] fix | Use response.failed for provider errors

- Replaced assistant-visible error completion with protocol-level `response.failed` so provider failures do not look like model-authored text.
- Anthropic 429 is still mapped to a Korean usage-limit message in the response error payload.
- Verified `npm run build`.

## [2026-05-18T20:17:41+0900] fix | Capture Gemini token usage

- Added Google `usageMetadata` parsing for non-stream and streaming Gemini proxy paths.
- Request logs now receive Gemini input/output token counts, so UI token totals and per-model rows include Gemini.
- Verified `npm run build`.

## [2026-05-18T20:31:03+0900] fix | Bridge Gemini tool calls

- Added Google `functionDeclarations` support from Codex tool definitions.
- Gemini `functionCall` parts now stream as Codex `function_call` events; tool outputs are sent back as Gemini `functionResponse` contents.
- Added Gemini system guard against writing XML/tool-code markup as plain text.
- Verified `npm run build`.

## [2026-05-18T20:56:42+0900] fix | Parse Gemini text tool markup

- Added fallback parser for Gemini text outputs containing `default_api.<tool>(...)` inside `<tool_code>` / `<function_calls>` markup.
- Parsed text tool calls now become Codex `function_call` stream events instead of visible chat text.
- Verified `npm run build`.

## [2026-05-18T21:42:39+0900] fix | Surface Gemini quota failures

- Added Google 429 / `RESOURCE_EXHAUSTED` mapping to a Korean Gemini usage-limit `response.failed` message.
- Includes retry delay from Google error text or `RetryInfo` when available.
- Verified `npm run build`.

## [2026-05-18T21:54:07+0900] fix | Parse Ollama text tool markup

- Added OpenAI-format stream buffering for raw `default_api.<tool>(...)` / `<tool_code>` markup from local models.
- Parsed Ollama text tool calls now become Codex `function_call` events instead of visible chat text.
- Verified `npm run build`.

## [2026-05-18T22:06:13+0900] fix | Parse bare Ollama tool_code blocks

- Extended text-tool parser for Gemma-style `tool_code\n<command>\ntool_output...` output.
- Bare command blocks now become Codex `exec_command` tool calls, hiding fake tool output text.
- Verified `npm run build`.

## [2026-05-18T22:23:43+0900] fix | Show text-tool status as reasoning

- Added synthetic `reasoning` chunks for parsed raw text-tool calls before emitting Codex `function_call` events.
- `exec_command` searches for `SimpleGame.cpp` now surface as a grey-style status message (`SimpleGame.cpp 찾아보는 �?) instead of plain assistant text.
- Verified `npm run build`.

## [2026-05-18T22:41:23+0900] fix | Repair Ollama native tool calls and final text

- Fixed Ollama native `tool_calls` with missing ids by generating stable `call_...` ids and preserving first-chunk arguments.
- Normalized Codex tool definitions into OpenAI function-tool schema before sending them to Ollama so arguments are generated correctly.
- Stripped Gemma `thought...<channel|>` text from visible output and added a fallback final answer from `function_call_output` when local models return no final text.
- Verified `npm run build`; SSE smoke test showed `function_call` with `{"cmd":"find . -name \"SimpleGame.cpp\""}` and a final `SimpleGame.cpp 찾음` response.

## [2026-05-18T22:48:50+0900] fix | Preserve Ollama Codex and skill prompt

- Restored the original Codex/skill instructions for Ollama instead of replacing them with a generic no-tool-markup prompt.
- Added Ollama bridge rules for same-language replies, using function tools for filesystem/skill requests, and preferring targeted `find` / `rg --files` commands for filename checks.
- Verified `npm run build`; SSE smoke test for the Korean `SimpleGame.cpp` prompt emitted an `exec_command` call with `find . -name SimpleGame.cpp`.

## [2026-05-20T12:44:55+0900] memory | Refresh project state from commits

- Checked current git log through `72d40ec feat(ux): improve UX for distribution and multi-user deployments` and `2f74df8 feat(gateway): add antigravity provider`.
- Captured current dirty worktree: Copilot provider WIP plus monitor log/request clear UI/API changes.
- Updated session summary, current state, gateway system doc, and handoff notes; verified `npm run build`.

## [2026-05-20T12:47:35+0900] rule | Default to distribution-ready work

- User set a durable rule: future instructions should be implemented for other users and deployment/distribution by default, not local-only personal fixes.

## [2026-05-20T12:56:35+0900] feat | Switch Copilot WIP to OAuth

- Replaced Copilot key-entry design with GitHub device-code OAuth using the 9router-style flow: device login, GitHub OAuth token, Copilot internal token exchange.
- Gateway UI now offers Copilot "Login with GitHub", copies/shows the device code, waits longer for OAuth completion, routes Copilot models/requests via the stored OAuth token, and README/package metadata mention Copilot for distribution.
- Verified `npm run build`; real GitHub Copilot login/API flow remains untested.

## [2026-05-20T13:03:50+0900] fix | Improve OAuth completion UX

- Added a Copilot device-code sidebar screen with selectable code, copy button, Open GitHub button, and polling until account appears.
- Changed Antigravity OAuth to save the account immediately after token exchange; `loadAntigravityProject` now fills `projectId` asynchronously.
- Verified `npm run build`; real Copilot/Antigravity browser login smoke tests remain manual.

## [2026-05-20T13:23:02+0900] fix | Prefer usable provider models

- Gemini now filters `supportedGenerationMethods` for generate/stream generate content and excludes embedding/TTS/audio/image/robotics/computer-use models.
- OpenAI API key model listing filters `/v1/models` to chat-style ids; Copilot uses live `/models` and only enabled `/chat/completions` models after removing invalid GitHub API-version header.
- Antigravity now probes known candidates with minimal non-stream `generateContent` and caches usable results for 10 minutes; verified build, gateway restart, and `/api/accounts`.

## [2026-05-20T14:56:57+0900] fix | Limit monitor clear action

- Monitor Clear button now renders only for Logs and Requests tabs.
- `clearMonitor()` now only deletes gateway log or in-memory request history; Terminal and Usage clear behavior removed.
- Verified `npm run build` and restarted gateway via `node dist/index.js`.

## [2026-05-20T15:32:26+0900] fix | Parse Copilot XML tool markup

- Extended OpenAI-format text-tool parser to recognize Claude/Copilot XML `<function_calls><invoke name="...">` blocks.
- Maps shell/bash/terminal invocations with command/cmd/shell parameter to `exec_command`; maps browser navigate/open/visit with url to `web_search`.
- Verified `npm run build` and restarted gateway via `node dist/index.js`.

## [2026-05-20T15:40:35+0900] fix | Strip malformed function_call remnants

- Broadened OpenAI-format text-tool marker detection to catch `function_calls>`, `</function_calls>`, `<invoke>`, and `<parameter>` remnants.
- Final stream flush now strips unparsed tool markup blocks instead of emitting raw malformed tags.
- Verified `npm run build` and restarted gateway via `node dist/index.js`.

## [2026-05-20T15:44:32+0900] fix | Parse browser/file pseudo XML

- Added OpenAI-format text-tool parsing for `<browser>` blocks; navigate/open/visit with target/url maps to `web_search`.
- Added parsing for `<file>` create/write/save blocks; path/content maps to `exec_command` heredoc creation.
- Verified `npm run build` and restarted gateway via `node dist/index.js`.

## [2026-05-20T16:09:16+0900] fix | Send tools to Copilot

- Investigated Gemini API-key failures: Google returned `UNAVAILABLE` 503 high demand, then `RESOURCE_EXHAUSTED` 429 free-tier RPM quota for `gemini-2.5-flash`.
- Found Copilot `gpt-5-mini` said `hello7.md` was created without any request-log `toolCalls`; Copilot calls were not receiving `req.tools`.
- Added Copilot OpenAI function-tool forwarding, anti-hallucination bridge instructions, and Responses tool-result history reconstruction; verified `npm run build`.

## [2026-05-20T07:59:44] upgrade | Re-scanned: Node.js, Fastify, TypeScript

## [2026-05-20T19:18:00+0900] fix | Restore gateway dashboard UI

- Repaired `src/gateway/ui.ts` after rcodex rename/encoding corruption broke rendered HTML/JS strings.
- Replaced broken dashboard icon/control text with ASCII-safe labels so node rendering, sidebar buttons, monitor tabs, output controls, and request details can initialize.
- Verified rendered dashboard script parses and `npm run build` succeeds.

## [2026-05-20T19:35:00+0900] fix | Polish dashboard logs and quota UI

- Replaced broken `??` gateway log markers for account/slot add/remove messages with ASCII text and arrows.
- Restored icon-based dashboard controls for provider nav, monitor node, OAuth/login, close buttons, provider fallbacks, and quota refresh.
- Fixed quota reset display to parse epoch seconds/milliseconds and relative reset fields; duplicate same-provider labels now show `#1`, `#2` in sidebar, nodes, and output order.

## [2026-05-20T19:44:00+0900] fix | Keep removed canvas nodes hidden

- Widened provider canvas nodes and added a separate duplicate-account `#N` badge so account identity remains visible when labels are long.
- Added `rcodex-hidden-slots-v1` localStorage tracking; removed active slots no longer auto-reappear when `fetchStatus()` syncs server `activeModels` on restart.
- Verified rendered dashboard script parses and `npm run build` succeeds.
