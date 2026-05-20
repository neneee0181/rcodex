# Project Brief

This is the shortest project summary for a fresh agent. Keep it factual and easy to scan.

## Identity

<!-- memoc:identity:start -->
- Project name: `rcodex`
- Detected stack: Node.js, Fastify, TypeScript
<!-- memoc:identity:end -->

## Current Direction

- Local Codex provider gateway and manager shipped as the `rcodex` CLI / `rcodex` npm package.
- `rcodex` starts a local Fastify gateway, registers it in `~/.codex/config.toml`, launches Codex, and exposes a browser UI for provider routing.
- Supported provider paths in source: OpenAI/Codex OAuth or API key, Anthropic Claude OAuth or API key, Google Gemini API key, and local Ollama.
- The user is actively using this to connect the Codex desktop app to rcodex as an endpoint and experiment with alternate models, especially Claude Code / Anthropic OAuth behavior.

## How To Approach

- Start from `session-summary.md`; search before opening more files.
- Open status, handoff, rules, map, systems, or wiki docs only when the task needs them.
- After durable work, update the smallest relevant memory set.
- Do not treat generated output folders as source unless the user explicitly asks.

## Next Useful Work

- Keep README, package metadata, and memory docs aligned when command behavior or provider support changes.
- Run `npm run build` after source edits; there are no test scripts currently defined.

## Important Notes

- Gateway runtime data lives outside the repo under `~/.rcodex/`; Codex provider config is managed under `~/.codex/config.toml`.
- The project uses `.memoc/` for agent memory, with `AGENTS.md`, `CLAUDE.md`, and `llms.txt` as entry maps.
