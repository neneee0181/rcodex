# memoc Usage

This project uses `memoc` to maintain agent-readable project memory.

## Commands

```bash
# Optional: put the project-local wrapper first in PATH for this shell
# PowerShell: . .\.memoc\env.ps1
# sh/bash:    . ./.memoc/env.sh

# First-time setup (or re-run to update managed sections)
memoc init

# Explicitly update managed sections based on current project state
memoc update

# Tiny status overview
memoc summary

# Search memory first; add --snippets only when needed
memoc search "<query>" --limit 12
memoc search "<query>" --snippets --limit 5

# Search project source/text files when memory is not enough
memoc grep "<query>" --limit 12
memoc grep "<query>" --snippets --limit 5
```

If `memoc` is not on PATH, use `.\.memoc\bin\memoc.cmd <command>` on Windows or `.memoc/bin/memoc <command>` in sh. If that is unavailable, use `npx @kevin0181/memoc <command>`.

## Agent Read Order

1. Entry-file managed block.
2. `.memoc/session-summary.md` only.
3. Search memory first: `memoc search "<query>"`.
4. If memory is not enough, search project files: `memoc grep "<query>" --limit 5`.
5. Use `--snippets` only when file names are not enough.

## When To Run Memory Updates

Use `memoc update` or `skills/project-memory-maintainer/SKILL.md` when:

- Requirements, acceptance criteria, user preferences, or project rules changed.
- Source code, config, data, content, or package scripts changed.
- Architecture, data flow, routing, auth, or deployment behavior changed.
- A decision was made that future agents should not revisit blindly.
- Work is partial, multi-step, blocked, or likely to be resumed by another agent.
- New durable knowledge belongs in `.memoc/wiki/` or a subsystem doc.

Usually skip for pure Q&A, throwaway exploration, or tiny edits with no future impact.

## Updating The Wiki

Create a new Markdown file under `.memoc/wiki/` when synthesized knowledge should compound across sessions.

- `.memoc/wiki/sources/`: provenance records.
- `.memoc/wiki/topics/`: synthesized topic pages.
- `.memoc/wiki/global/`: project-wide principles.

After creating or editing wiki pages:
1. Update `.memoc/wiki/index.md`.
2. Append `.memoc/log.md`.

## Updating System Docs

Create or update `.memoc/systems/*.md` when a subsystem needs durable detail.

Examples: `frontend.md`, `deployment.md`, `data-sources.md`, `auth.md`
