# Vibe Pilot Repository Instructions

## Purpose

Vibe Pilot is a Bun and TypeScript autopilot for vibe-kanban plus a distributable agent plugin. Keep the deterministic Bun process separate from the AI-facing skills and commands.

## Agent Sync

- `AGENTS.md` is the canonical repository instruction file.
- `.agents/agents.json` is the source of truth for `agents` CLI integration settings.
- Run `agents sync --path .` after changing `.agents/agents.json` when you want local tool config.
- Do not commit generated outputs such as root `CLAUDE.md`, `.codex/`, `.claude/`, `.cursor/`, `.gemini/`, `.windsurf/`, `.opencode/`, or `.agents/generated/`.
- Do not commit `.agents/intel/`; it is local generated repo intelligence.
- Do not add Superpowers docs or planning docs to this public repo.

## Development Rules

- Use `bun` and `bunx` consistently.
- Use TypeScript for JavaScript-platform code. Do not create `.js` or `.jsx` source files.
- Use `oxlint --type-aware --type-check`, not `tsc`.
- Use `oxlint`, not ESLint.
- Use `oxfmt`, not Prettier.
- Use Husky for git hooks. Do not introduce `.githooks` or ad hoc hook folders.
- Any commits must use Conventional Commit format.
- Do not modify `package.json` scripts unless explicitly asked.
- Do not edit files whose names start with `.env`.
- Treat `autopilot.config.json`, `oxfile.toml`, live vibe-kanban data, and workspace launches as user-owned runtime state.
- Do not run `bun run clean`, `bun run start`, or `bun run dev` unless the user asks, because they can mutate live boards and workspaces.
- Prefer static checks for docs and manifest changes.

## Plugin Layout

- `plugins/vibe-pilot/.claude-plugin/plugin.json` is the Claude Code manifest.
- `plugins/vibe-pilot/.codex-plugin/plugin.json` is the Codex plugin manifest.
- `plugins/vibe-pilot/gemini-extension.json` is the Gemini CLI extension manifest.
- `plugins/vibe-pilot/skills/` contains agent-facing workflows that should remain provider-neutral where possible.
- `plugins/vibe-pilot/commands/` contains Claude slash command entry points.
