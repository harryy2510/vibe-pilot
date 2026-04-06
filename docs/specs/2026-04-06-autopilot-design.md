# vibe-pilot Autopilot — Design Spec

**Date:** 2026-04-06
**Status:** Approved

## Core Principle

Code does code work. AI does AI work.

A deterministic Bun process handles all orchestration — project discovery, setup, task picking, stacking, workspace launching. AI is only invoked where judgment is genuinely needed: classifying tasks, brainstorming specs, writing code.

## System Architecture

```
oxfile.toml (oxmgr)
├── vibe-kanban (existing MCP server + UI)
└── autopilot (Bun cron process)
      │
      ├── Pure code (no AI, no tokens)
      │   ├── Discover git repos in workspace
      │   ├── Create/sync projects, repos, tags, boards in vibe-kanban
      │   ├── Write/fix vibe-kanban.json per project
      │   ├── Pick tasks from To Do based on rules
      │   └── Start workspaces via HTTP API
      │
      └── Starts workspaces (AI work)
          ├── Classify (low tier) — backlog sorting
          ├── Triage (high tier) — brainstorm + breakdown
          └── Implement (medium/high tier) — code + PR
```

## Board Flow

Six statuses in order:

```
Backlog → Triage → To Do → In Progress → In Review → Done
```

### Backlog → Triage / To Do

User creates a task. It lands in Backlog. The cron starts a Haiku workspace with the `classify` skill.

Haiku reads title + description and decides:
- **Simple** — adds tags, embeds model tier + agent type in description, moves to To Do
- **Complex** — moves to Triage

### Triage → To Do

The cron starts an Opus workspace linked to the Triage issue. The user opens the workspace in vibe-kanban UI and chats with Opus directly. Opus uses the `triage` skill:

- Asks questions, understands scope
- Breaks down into To Do tasks (meaningful chunks, 10-20 files per PR, not micro-tasks)
- Each created task gets: tags, `blocked_by` relationships, model tier + agent type in description
- References `model-agent-ref` skill for assignment decisions

Triage workspaces do NOT count against concurrency — they're interactive, mostly idle, waiting on the user.

### To Do → In Progress

The cron picks tasks based on:

1. Count active slots (In Progress only)
2. Under concurrency limit? Pick next from To Do (**board order is the priority** — top of the list = first picked)
3. Skip `blocked` tagged tasks
4. Skip tasks whose `blocked_by` dependencies aren't resolved (behavior depends on `stack_prs`)
5. Read model tier + agent type from task description
6. Pick executor + model from the config pool (round-robin)
7. Start workspace via HTTP API with prompt referencing the `implement` skill

**The cron never re-sorts the board.** Board order is controlled entirely by the user via drag-and-drop in the vibe-kanban UI. Dragging a task to the top means it gets picked next.

### In Progress → In Review

The implementation workspace skill always ends with:

1. Code is done
2. Vibe-kanban runs cleanup script (fix, check, build)
3. Create PR via `gh pr create` (or equivalent)
4. Link PR to issue via vibe-kanban MCP

Vibe-kanban automatically moves the task to In Review when a PR is linked. This is non-negotiable — every implementation workspace must create and link a PR.

### In Review → Done

Vibe-kanban handles this automatically when the PR is merged. The cron does not manage this transition.

## Stacked PRs

### When `stack_prs: true` (default)

Dependent tasks can start before their blocker is merged. They branch off the blocker's branch instead of main.

```
Task A (In Progress) → branches off main
Task B (blocked_by A) → branches off A's branch
Task C (blocked_by B) → branches off B's branch

PR A targets main
PR B targets A's branch
PR C targets B's branch

A merges → GitHub auto-retargets B to main
B merges → GitHub auto-retargets C to main
```

Applies to:
- `blocked_by` relationships
- Migration tasks (always sequential by nature)
- Tasks touching the same files

The cron determines the base branch by:
1. Check `blocked_by` relationships via vibe-kanban API
2. Find blocker's workspace → get its branch name
3. Pass that branch as base when starting the new workspace

### When `stack_prs: false`

- Blocked tasks wait until blocker is **merged** (Done status)
- Only 1 migration task active at a time, must be merged before next starts
- No stacking, strict sequential execution

### Config

`stack_prs` defaults to `true` in `autopilot.config.json`. Can be overridden per-project in `vibe-kanban.json`.

## Project Discovery & Setup

### Every cron cycle:

1. Scan `workspace` folder at configured `scan_depth` (top-level only by default)
2. For each folder with a `.git` directory:
   - Has `vibe-kanban.json`? → read it, validate, fix if incomplete
   - No `vibe-kanban.json`? → check vibe-kanban for existing project

### If project exists in vibe-kanban but config is missing/incomplete:

- Create/update `vibe-kanban.json` with org/project/repo IDs + defaults
- Fix any missing or outdated fields
- Goes through a setup task + PR for visibility

### If project doesn't exist in vibe-kanban:

The cron creates everything via HTTP API (pure code, no AI):

1. Create project in vibe-kanban
2. Create/link repository
3. Set repo scripts:
   - Dev server: `bun vibe-dev`
   - Setup: `bun vibe-setup`
   - Cleanup: `bun vibe-cleanup`
4. Default target branch: `main`
5. Copy files: `.env.keys`
6. Create Triage status/board
7. Create standard tags (remove any defaults first):
   - `migration`, `brainstorm`, `blocked`, `bug`, `feature`, `enhancement`, `frontend`, `backend`, `setup`
8. Enable backlog
9. Write `vibe-kanban.json` to the project repo

## Skills

Four skill files, loaded by the AI executor (not injected into prompts):

### `classify.md` — Backlog Sorting

- **Loaded by:** low-tier model (Haiku or equivalent)
- **Input:** backlog task
- **Decision:** simple or complex
- **If simple:** add tags, embed model tier + agent type in task description, move to To Do
- **If complex:** move to Triage
- **References:** `model-agent-ref.md` for tier/agent assignment

### `triage.md` — Brainstorm & Breakdown

- **Loaded by:** high-tier model (Opus or equivalent)
- **Input:** Triage task
- **Process:** chat with user in vibe-kanban workspace, ask questions, understand scope
- **Output:** broken-down To Do tasks with:
  - Title, description with spec
  - Tags
  - `blocked_by` relationships
  - Model tier + agent type embedded in description
- **Constraint:** tasks must be meaningful chunks (10-20 files per PR)
- **Priority:** triage sets the priority field (urgent/high/medium/low) and inserts tasks into To Do in priority order. After creation, board order is fully user-controlled — the cron never re-sorts.
- **References:** `model-agent-ref.md` for tier/agent assignment

### `implement.md` — Code & PR

- **Loaded by:** assigned model (from task description)
- **Input:** To Do task with spec, tags, model/agent already decided
- **Process:** read repo-map, implement the work
- **Finish (non-negotiable):**
  1. Create PR via `gh pr create`
  2. Link PR to issue via vibe-kanban MCP
  3. Vibe-kanban moves to In Review automatically

### `model-agent-ref.md` — Lookup Table

Not a standalone skill. Referenced by `classify` and `triage` to decide:
- Task characteristics → tier (low / medium / high)
- Task type → agent type (Frontend Developer, Database Optimizer, Backend Architect, etc.)

Maps to the installed agent types available in the system.

## Sub-Agent Driven Execution

Implementation tasks are not generic "write code" jobs. Each task is routed to a specialized agent type based on what the work requires. The classify and triage skills assign the agent type, and the `implement` skill's prompt tells the AI which agent persona to adopt.

### Available Agent Types

These map to the specialized agents installed in the system:

| Agent Type | When Used |
|---|---|
| Frontend Developer | UI components, pages, layouts, responsive/accessibility |
| Backend Architect | APIs, server functions, microservices, system design |
| Database Optimizer | Migrations, schema design, query optimization, RLS |
| Software Architect | Cross-cutting architecture, domain modeling |
| Senior Developer | Complex full-stack features spanning multiple domains |
| Security Engineer | Auth flows, RLS policies, vulnerability fixes |
| DevOps Automator | CI/CD, deployment config, infrastructure |
| UX Architect | Design systems, component hierarchies, layout architecture |
| Technical Writer | Documentation, API references, README |
| Rapid Prototyper | MVPs, proof-of-concepts, quick validations |
| Code Reviewer | (future) QA/verification layer |
| E2E Test Writer | (future) Playwright test creation |

### How It Works

1. **Classify/triage** decides the agent type based on task content and tags
2. Agent type + model tier are embedded in the task description as a metadata block:
   ```
   <!-- autopilot
   tier: medium
   agent: Frontend Developer
   -->
   ```
3. The cron reads the agent type when starting the workspace
4. The workspace prompt includes: "You are the {agent_type}. Follow the implement skill."
5. The AI adopts the agent persona — its system prompt, expertise, and focus areas match the work

### Why Sub-Agents Matter

- A Frontend Developer agent knows component patterns, accessibility, responsive design — it doesn't waste tokens fumbling with migration syntax
- A Database Optimizer agent knows indexing strategies, RLS patterns, migration ordering — it doesn't guess at UI layout
- Each agent type brings domain expertise that a generic "code this" prompt lacks
- The agent type also influences model selection — a Database Optimizer doing a complex migration might need a higher tier than a Frontend Developer building a standard form

## Model Routing

### Tier-based pools

The config defines three tiers, each with an array of executor + model pairs:

- **high** — triage/brainstorm, architecturally complex tasks
- **medium** — standard implementation (frontend, backend, features)
- **low** — classification, simple fixes, setup tasks

### Multi-executor rotation

Each tier has multiple executors (Claude Code, Gemini, Codex, etc.). The cron picks from the pool using round-robin. This distributes load across providers and avoids lock-in.

### Assignment flow

1. **Backlog → classify:** always uses `low` tier
2. **Triage → brainstorm:** always uses `high` tier
3. **To Do → implement:** tier is embedded in the task description by classify or triage. The cron reads it and picks from the corresponding pool.

### Example config

```json
{
  "models": {
    "high": [
      { "executor": "CLAUDE_CODE", "model": "opus" },
      { "executor": "GEMINI", "model": "gemini-3.1-pro-preview" },
      { "executor": "CODEX", "model": "gpt-5.4" }
    ],
    "medium": [
      { "executor": "CLAUDE_CODE", "model": "sonnet" },
      { "executor": "GEMINI", "model": "gemini-3-pro-preview" },
      { "executor": "CODEX", "model": "gpt-5.2-codex" }
    ],
    "low": [
      { "executor": "CLAUDE_CODE", "model": "haiku" },
      { "executor": "GEMINI", "model": "gemini-3-flash-preview" },
      { "executor": "CODEX", "model": "gpt-5.4-fast" }
    ]
  }
}
```

## Configuration

### `autopilot.config.json` (global, one per machine)

```json
{
  "workspace": "/Users/harryy/Desktop",
  "vk_api": "http://localhost:4040",
  "org_id": "your-org-uuid",
  "scan_depth": 1,
  "interval": 60,
  "defaults": {
    "concurrency": 3,
    "stack_prs": true,
    "dev_script": "bun vibe-dev",
    "setup_script": "bun vibe-setup",
    "cleanup_script": "bun vibe-cleanup",
    "target_branch": "main",
    "copy_files": [".env.keys"],
    "tags": [
      "migration", "brainstorm", "blocked", "bug",
      "feature", "enhancement", "frontend", "backend", "setup"
    ]
  },
  "models": {
    "high": [...],
    "medium": [...],
    "low": [...]
  }
}
```

### `vibe-kanban.json` (per project, lives in repo root)

```json
{
  "org_id": "...",
  "project_id": "...",
  "repo_id": "...",
  "concurrency": 3,
  "stack_prs": true
}
```

Per-project values override global defaults.

### `oxfile.toml` (process management)

```toml
version = 1

[defaults]
restart_policy = "on_failure"
max_restarts = 10
stop_timeout_secs = 5

[[apps]]
name = "vibe-kanban"
command = "bunx vibe-kanban@..."
health_cmd = "curl -fsS http://localhost:4040"

[apps.env]
VK_SHARED_API_BASE = "https://server-vibe.hariom.cc"
VK_SHARED_RELAY_API_BASE = "https://relay-vibe.hariom.cc"
PORT = "4040"
HOST = "0.0.0.0"

[[apps]]
name = "autopilot"
command = "bun run src/index.ts"
health_cmd = "curl -fsS http://localhost:4040"

[apps.env]
AUTOPILOT_CONFIG = "./autopilot.config.json"
```

## Project Structure

```
vibe-pilot/
├── oxfile.toml
├── autopilot.config.json
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # entry point — setInterval loop
│   ├── config.ts         # load + validate config
│   ├── api.ts            # vibe-kanban HTTP API client
│   ├── discover.ts       # scan workspace, find git repos
│   ├── setup.ts          # create project, tags, repo, vibe-kanban.json
│   ├── picker.ts         # pick tasks from To Do, handle stacking
│   ├── classifier.ts     # start classify workspace for backlog tasks
│   └── workspace.ts      # start implementation/triage workspaces
└── skills/
    ├── classify.md
    ├── triage.md
    ├── implement.md
    └── model-agent-ref.md
```

## Platform Independence

- **Runtime:** Bun (Mac, Windows, Linux)
- **Process management:** oxmgr (Mac, Windows, Linux)
- **AI executors:** any supported by vibe-kanban (Claude Code, Gemini, Codex, Qwen Code, Opencode, Cursor Agent, Droid, Copilot, Amp)
- **No OS-specific dependencies** — no systemd, no launchd, no tmux
- **No AI-specific dependencies** — cron never imports or calls any AI SDK
- **HTTP only** — all vibe-kanban interaction via REST API (native fetch)

## Future Work (not in scope)

- **Verification/QA layer** — code review agent, browser testing, Playwright. Hook point exists (between code done and PR creation). Separate skill, separate design.
- **Cross-executor skill loading** — how skills get installed globally for all executors. Separate tooling (agents, vsync).
- **Notifications** — Slack/Discord alerts on task completion, failures, triage questions.
- **Analytics** — track model performance, cost per task, success rates.
