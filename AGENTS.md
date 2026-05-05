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

<!-- AGENT-TOOLKIT:REPO-INTEL:START -->
## Agent Toolkit Repo Intelligence

- Before broad exploration, read `.agents/intel/summary.md` if it exists.
- Use the task-specific intel files it links to (`overview.md`, `tasks.md`, `graph.md`, `database.md`, and similar) to find the relevant source files before editing.
- `.agents/intel/` is generated repo intelligence and may be committed in migrated repos.
<!-- AGENT-TOOLKIT:REPO-INTEL:END -->

<!-- AGENT-TOOLKIT:DOTAGENT:START -->
## DotAgent Project Snapshot

- This repository vendors DotAgent for shared team use; do not rely on a user-global DotAgent install for repo behavior.
- DotAgent skills live in `.agents/skills/` and are bridged to supported tools with `agents sync --path .`.
- DotAgent role profiles and command references live under `.agents/dotagent/` for agents that need file-based guidance.
- The pinned snapshot is recorded in `.agents/dotagent.lock.json`.

<!-- DOTAGENT:START -->
# Global Agent Guidelines

These rules apply to every agent session and every project unless a more specific repository instruction overrides them.

## Default Execution Mode

Default to speed mode unless the user explicitly asks for deep review, exhaustive testing, E2E validation, release readiness, or careful verification.

- Use repository instructions and existing patterns first.
- Use skills only when they materially reduce risk or the user explicitly requests them.
- For straightforward code changes, do not run skill ceremonies first.
- Use parallel subagents only for clearly independent work when supported and allowed.
- Do not use Browser Use or Computer Use unless explicitly requested or required for the task.
- Do not run full test suites unless explicitly requested, preparing a commit/PR/release, or touching broad shared behavior.
- Run the smallest targeted check that covers changed behavior.
- Skip checks only for docs-only or trivial edits, and state that checks were skipped.
- Keep tracker/doc updates to concise bullets.
- Timebox investigation to about 5 minutes before making a concrete edit plan.
- Timebox blockers to about 10 minutes, then record the blocker and move on or ask for direction.

## Speed Discipline

- Prefer the next concrete action over extra process, research, or status ceremony.
- Do not run broad checks for simple commits or narrow edits.
- Do not use Browser Use, Computer Use, full E2E, or release-style validation unless explicitly requested.
- Stop verifying once the requested operation has completed and the smallest relevant check has passed.

## Planning And Phases

- Use an explicit plan only when the task is broad, ambiguous, risky, user-requested, or benefits from independent subagents.
- For straightforward edits, skip planning and start execution after reading the relevant local context.
- For broad tasks, write a short execution plan, split independent work into native subagents when available and allowed, and begin the first concrete step immediately.
- Do not run separate research, review, or verification phases unless the user asks for them or they materially reduce risk.
- Prefer focused checks tied to changed behavior; reserve full verification for PRs, commits, releases, broad shared behavior, or explicit requests.

## Scope And Precedence

- Read repository instructions first: `AGENTS.md`, `CLAUDE.md`, `README.md`, and equivalent local guidance.
- If multiple instruction files exist, follow the most specific one first, then broader guidance.
- Local project rules override these global defaults.
- Tool-specific global files should point to this shared policy where possible.

## Startup And Routing

- For speed mode, skip agent-routing unless the user asks for role routing or the task is broad enough to need subagents.
- If agent-routing is used and the host supports native subagents, invoke the matching specialist only for self-contained work that can run independently. If native subagents are unavailable or disallowed, use the matching role profile as lightweight guidance.
- Do not spawn `agents-orchestrator` as a child subagent when it needs to call other agents; keep orchestration in the main thread and invoke specialists directly.
- Treat the `skills:` list in an agent profile as optional context unless the user asks for that role, the task is high-risk, or the skill materially reduces risk.
- Use skills only when they materially reduce risk or the user explicitly requests them.
- For speed-mode implementation, do not run skill ceremonies before straightforward code changes.
- Use repository instructions and existing patterns first.

## Host Capability Reality

- Agent Toolkit repo files such as `.agents/agents.json`, `.agents/intel/`, and `scripts/agent-check` are sync, intelligence, and enforcement files. They are not repo-local role profiles.
- DotAgent role profiles are the Markdown files in the DotAgent plugin source at `plugins/dotagent/agents/`; in an installed global package they are normally under `~/.agent-toolkit/plugins/dotagent/plugins/dotagent/agents/`.
- Claude: use native subagents only when Claude exposes the relevant DotAgent agent. If not exposed, treat DotAgent role names as lightweight guidance.
- Codex: global `AGENTS.md` rules do not automatically install DotAgent skills or native agents. Agent Toolkit setup/update registers the DotAgent checkout as a Codex local marketplace through `[marketplaces.dotagent]` in `~/.codex/config.toml`; Codex discovery should come through that marketplace and DotAgent's plugin metadata, not copied files in `~/.codex/skills`. If DotAgent skills or agents are not listed in the current Codex session, do not claim they are active; use available native subagents or accessible DotAgent profile files as reference only.
- Gemini: the DotAgent Gemini extension provides shared context, not guaranteed native subagents. Treat role profiles as guidance unless Gemini exposes them as callable agents.
- Never present `agent-routing` as mandatory runtime behavior unless the current host actually has the routing skill or agent profiles available.

## Hard Rules

### Git

- Never run `git push` unless the user explicitly asks for it in the current message.
- Permission to push expires after that one push.
- Never push to `main` or `master` unless the user says the exact words and confirms after you warn them.
- Never skip git hooks with `--no-verify`, `--no-gpg-sign`, or similar flags.
- Any commit you create must use Conventional Commit format, for example `feat: add repo intelligence` or `fix(cli): preserve user files`.
- Create git worktrees inside the same repository under `.worktrees/`.
- Keep `.worktrees/` gitignored.

### Environment Files

- Never edit, create, overwrite, or delete any file whose name starts with `.env`.
- This includes `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.keys`, `.env.vault`, `.env.example`, encrypted env files, and every other variant.
- If the user needs env changes, tell them exactly what to change themselves.

### Toolchain

- Use Bun for JavaScript and TypeScript package management and execution.
- Use TypeScript for new JavaScript-platform code. Do not create `.js` or `.jsx` source files.
- Do not use `tsc` as the project check command. Use `oxlint --type-aware --type-check`.
- Use `oxlint` instead of ESLint.
- Use `oxfmt` instead of Prettier.
- Use Husky for git hooks. Do not introduce `.githooks` or ad hoc hook folders.
- GitHub Actions workflows must use Node.js 24 with `actions/setup-node@v6` when a Node runtime is needed.
- Do not add npm, yarn, pnpm, npx, ESLint, Prettier, or `tsc --noEmit` workflows.

### Package Scripts

- Do not add, modify, or remove `package.json` scripts unless the user explicitly asks or the current task is package/tooling setup.
- Use existing scripts when they are present.
- If a needed script does not exist and the user did not ask for tooling changes, ask before adding one.

### Supabase

- Never run direct Supabase CLI commands in repos that require package scripts for Supabase.
- Use existing package scripts, such as `bun db-push-and-types`, when the repository provides them.
- Never hand-write types for Supabase tables, views, functions, or RPCs when generated database types are available.
- SQL functions must set `search_path = ''` or explicit schemas and schema-qualify references such as `public.users` and `auth.uid()`.

### Generated Files

- Do not edit generated files unless explicitly requested.
- Generated database types, Worker configuration types, route trees, and agent sync outputs should be regenerated through the owning tool.

## Common Skill Routing

- These names are routing hints when the matching DotAgent skills are installed or the profile files are accessible; otherwise use the nearest available host capability and keep moving.
- New project or tooling setup: `toolchain`, `project-setup`, `scaffold`
- Codebase exploration or reviews: `repo-intelligence`, `deslop`
- Agent delegation or role selection: `agent-routing`
- Debugging, regressions, flaky tests, incidents: `debugging`, `testing`
- Framework/library correctness: `source-driven-development`
- API contracts and public boundaries: `api-and-interface-design`
- React UI: `ui`, `shadcn`, `react-best-practices`
- Forms: `forms-rhf-zod`
- Data fetching: `react-query-mutative`
- Client state: `zustand-x-ui-state`
- Routes and server functions: `tanstack-start-cloudflare`
- Supabase auth, data, migrations, RLS: `supabase-auth-data`, `supabase-postgres-best-practices`
- Legacy cleanup, replacements, and migrations: `deprecation-and-migration`
- Security-sensitive work: `security-and-hardening`
- Performance diagnosis and optimization: `performance-optimization`
- Behavior-preserving cleanup: `code-simplification`
- Durable docs and ADRs: `documentation-and-adrs`
- Cloudflare Workers and Wrangler: `cloudflare`
- Vite: `vite`
- Testing: `testing`

## Completion

- For speed mode, run only targeted checks unless the user asks for full verification, commit, PR, or release readiness.
- Before PR/commit, run the relevant package checks. Full repo checks are optional unless requested.
- Run `/skill-lint` or `plugins/dotagent/scripts/skill-lint.sh` when agent, skill, command, or plugin instruction files change.
- Run `bunx @harryy/agent-toolkit repo check` in agentized repos once the toolkit is available.
- Run `agents sync --check` when `AGENTS.md` or `.agents/` changed.
- If checks are not run, state why.
<!-- DOTAGENT:END -->
<!-- AGENT-TOOLKIT:DOTAGENT:END -->
