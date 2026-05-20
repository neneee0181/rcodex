# rcodex

A local AI gateway that lets [Codex](https://github.com/openai/codex) talk to Claude, OpenAI, Gemini, Ollama, Antigravity, and GitHub Copilot through one local Responses-compatible proxy with a visual routing UI.

![Node graph UI](https://raw.githubusercontent.com/neneee0181/rcodex/main/docs/ui-preview.png)

## Features

- Multi-provider routing for Anthropic Claude, OpenAI, Google Gemini, Ollama, Antigravity, and GitHub Copilot.
- Visual node graph for selecting models and ordering fallback chains.
- Automatic fallback when a provider fails, rate-limits, or returns an error.
- Local request monitor with logs, request history, token usage, latency, and fallback details.
- Automatic Codex config sync using the stable provider key `rcodex`.
- Thread migration helper for existing Codex conversations.
- Update gate on `rcodex`: if a newer npm version exists, rcodex asks the user to approve the global update before launching.

## Requirements

- Node.js 20 or newer.
- Codex CLI or Codex desktop app installed.
- Provider credentials for the services you want to use.

## Installation

```bash
npm install -g @kevin0181/rcodex
```

Then launch rcodex:

```bash
rcodex
```

The first launch starts the gateway, updates `~/.codex/config.toml`, launches Codex, and opens the gateway UI. The default gateway port is `3141`; if that port is busy, rcodex picks the next free port and updates Codex config automatically.

## Updates

When users run `rcodex`, the CLI checks the latest published npm version. If a newer version is available, rcodex prompts:

```text
rcodex 0.0.2 is available (installed: 0.0.1). Update now? [y/N]
```

If the user accepts, rcodex runs:

```bash
npm install -g @kevin0181/rcodex@latest
```

After the update completes, run `rcodex` again. If the user declines, rcodex exits instead of launching the older version. If the npm registry cannot be reached, rcodex allows the installed version to run so offline users are not blocked.

## Gateway UI

Open the UI at the URL printed by `rcodex`, usually:

```text
http://localhost:3141
```

Use the sidebar to add accounts and model slots. Drag model slots onto the canvas, connect them from the `Out` node, and order multiple slots to create fallback chains.

Supported account types:

- Claude with Anthropic API key.
- OpenAI API key or OAuth flow.
- Google Gemini API key.
- Antigravity OAuth, using Gemini / Cloud Code routing.
- GitHub Copilot OAuth device login.
- Ollama local endpoint, defaulting to `http://localhost:11434`.

## Commands

| Command | Description |
| --- | --- |
| `rcodex` | Start/restart the gateway, sync Codex config, launch Codex, and open the UI |
| `rcodex setup` | Run first-time setup in foreground mode |
| `rcodex stop` | Stop the background gateway |
| `rcodex gateway` | Switch Codex config to rcodex gateway mode |
| `rcodex openai` | Switch Codex config back to native OpenAI |
| `rcodex doctor` | Check installation, gateway status, and provider setup |
| `rcodex sync` | Re-register the gateway in Codex config and migrate threads |
| `rcodex migrate` | Migrate existing Codex threads to the `rcodex` provider |

## Provider Notes

### Claude

rcodex supports Anthropic API-key accounts. Older unofficial Claude.ai session auth is not supported for direct inference; use an Anthropic API key for Claude model access.

### Ollama

Start Ollama before adding an Ollama account:

```bash
ollama serve
```

rcodex discovers local models from `http://localhost:11434/v1/models`.

### GitHub Copilot

Copilot uses GitHub device-code OAuth. After approval, rcodex stores the GitHub OAuth token locally and exchanges it for short-lived Copilot API tokens when requests are sent.

### Antigravity

Antigravity OAuth needs app credentials. If bundled credentials are not available in the package, place credentials at:

```text
~/.rcodex/antigravity-app.json
```

Run `rcodex doctor` to diagnose and auto-fix supported setup issues.

## Data and Privacy

- Gateway config is stored at `~/.rcodex/gateway.json`.
- Request history is stored at `~/.rcodex/requests.jsonl`.
- Gateway logs are stored at `~/.rcodex/gateway.log`.
- API keys and OAuth tokens stay local and are only sent to their corresponding provider APIs.

## Publishing

npm is the distribution channel for the `rcodex` command. GitHub Releases are useful for release notes and source archives, but users receive updates from npm because they install the package with `npm install -g @kevin0181/rcodex`.

For the first release:

```bash
npm login
npm run build
npm publish --access public
git tag v0.0.1
git push origin v0.0.1
```

Then create a GitHub Release from tag `v0.0.1` and paste the release notes. For later versions:

```bash
npm version patch
npm publish --access public
git push origin main --tags
```

Use `npm version minor` or `npm version major` when the change is larger than a patch release.

## Development

```bash
git clone https://github.com/neneee0181/rcodex.git
cd rcodex
npm install
npm run dev
npm run build
```

There is no automated test script yet; use `npm run build` as the baseline verification.

## License

MIT
