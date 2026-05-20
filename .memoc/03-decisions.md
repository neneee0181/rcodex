# Decisions

Durable project decisions live here. Keep entries short, dated, and useful to future agents.

## Decision Log

- **2026-05-20: Dynamic Windows Codex Desktop App Detection**: Modified `getCodexExePath()` in `src/core/codex.ts` to dynamically search under `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe` to support users installing the desktop client on Windows, which resolves failure to detect installed Codex.
- **2026-05-20: Cross-platform build script**: Replaced standard Linux/macOS `chmod` command in `package.json` with a conditional Node.js execution step (`process.platform !== 'win32'`) to prevent build failures on Windows machines.
- **2026-05-20: Global installation UX improvements**: Added `"prepare": "npm run build"` to ensure automatic compilation when cloning the project locally and running `npm install -g .`. Added `"postinstall": "node scripts/postinstall.cjs"` to verify and alert users if their global npm binary path is missing from the environment `PATH`.
- **2026-05-20: Prioritize Codex Store GUI Launch on Windows**: Modified `openCodexApp()` in `src/core/codex.ts` to detect the Microsoft Store version of Codex (`OpenAI.Codex`) and launch its GUI using its App User Model ID (AUMID) `OpenAI.Codex_2p2nqsd0c76g0!App` via explorer shell, rather than launching the CLI executable inside a command window.
- **2026-05-20: Suppress browser open console windows**: Fixed missing `windowsHide: true` option in `openai-oauth-flow.ts`'s `openBrowser` function on Windows to prevent flashing command windows.
- **2026-05-20: Fix Canvas Blurry Text on FHD Screens**: Removed forced webkit-font-smoothing antialiased and GPU transform/will-change rendering layer caching on the main workspace canvas in `ui.ts` to allow standard sharp ClearType font rasterization and vector rendering when zooming/panning.
