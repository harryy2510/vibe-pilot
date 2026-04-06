<p align="center">
  <h1 align="center">Vibe Pilot</h1>
  <p align="center">
    <strong>Zero-touch kanban autopilot for <a href="https://github.com/BloopAI/vibe-kanban">vibe-kanban</a>.</strong>
  </p>
  <p align="center">
    Code does code work. AI does AI work.
  </p>
  <p align="center">
    <code>11 modules</code> · <code>5 skills</code> · <code>3 model tiers</code> · <code>0 dependencies</code>
  </p>
</p>

<p align="center">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://github.com/BloopAI/vibe-kanban"><img src="https://img.shields.io/badge/vibe--kanban-8B5CF6?style=flat-square&logoColor=white" alt="vibe-kanban"></a>
  <a href="https://claude.ai"><img src="https://img.shields.io/badge/Claude-CC785C?style=flat-square&logo=anthropic&logoColor=white" alt="Claude"></a>
  <a href="https://gemini.google.com"><img src="https://img.shields.io/badge/Gemini-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini"></a>
  <a href="https://openai.com/codex"><img src="https://img.shields.io/badge/Codex-412991?style=flat-square&logo=openai&logoColor=white" alt="Codex"></a>
</p>

---

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│   A deterministic Bun process that discovers your repos, sets up           │
│   kanban boards, classifies tasks, triages complex work, picks             │
│   what to build next, and launches AI workspaces — all on autopilot.       │
│                                                                            │
│   You add tasks to Backlog. Vibe Pilot does the rest.                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## The Philosophy

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                     │
  │   DETERMINISTIC CODE              AI AGENTS                        │
  │   ────────────────                ──────────                        │
  │   Project discovery               Classify: simple or complex?     │
  │   Board setup & tags              Triage: break down complex tasks  │
  │   Slot counting                   Implement: write code & PR        │
  │   Dependency resolution           Report: weekly status updates     │
  │   Round-robin routing                                               │
  │   Stacked PR orchestration                                          │
  │                                                                     │
  │   Code does code work.            AI does AI work.                  │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

```
                    ┌──────────┐
                    │ Backlog  │  You drop tasks here
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ Classify │  Haiku: "simple or complex?"
                    └──┬────┬──┘
                       │    │
              simple   │    │   complex
                       │    │
                 ┌─────▼┐  ┌▼──────┐
                 │ To Do│  │Triage │  Opus brainstorms,
                 └──┬───┘  └───┬───┘  breaks into subtasks
                    │          │
                    │   ┌──────┘
                    │   │
              ┌─────▼───▼────┐
              │  In Progress  │  Workspace launched,
              │               │  agent writes code
              └──────┬────────┘
                     │
              ┌──────▼────────┐
              │   In Review   │  PR created,
              │               │  ready for you
              └──────┬────────┘
                     │
              ┌──────▼────────┐
              │     Done      │  Merged
              └───────────────┘
```

---

## Multi-Executor Round Robin

Not locked to one AI. Three tiers, round-robin across providers.

```
  HIGH  ──────────────────────────────────────────────────────
  Triage, brainstorming, architecture decisions

    Claude Opus  →  Gemini Pro  →  Codex GPT-5.4  →  ↻

  MEDIUM  ────────────────────────────────────────────────────
  Implementation, feature work, bug fixes

    Claude Sonnet  →  Gemini Pro  →  Codex GPT-5.2  →  ↻

  LOW  ───────────────────────────────────────────────────────
  Classification, simple tasks, quick fixes

    Claude Haiku  →  Gemini Flash  →  Codex Fast  →  ↻
```

---

## Stacked PRs

Dependent tasks don't wait. They branch off the blocker's working branch.

```
  main ─────────────────────────────────────────────────►
         \
          └─── vk/auth-middleware ──────────────────────►  Task A (blocker)
                  \
                   └─── vk/user-profile ───────────────►  Task B (blocked by A)
                           \
                            └─── vk/profile-tests ─────►  Task C (blocked by B)
```

When A merges, GitHub auto-retargets B to main. No idle slots.

---

## Workspace Dedup

The autopilot fetches active workspaces once per cycle. If a workspace is already running for a task, it skips — no duplicate agents, no wasted compute.

```
  Cycle N:   Classify "Add auth" → workspace started ✓
  Cycle N+1: Classify "Add auth" → workspace exists, skip ⏭
```

---

## Skills

Loaded into AI workspaces. Each skill is a focused instruction set.

| Skill | Tier | What happens |
|---|---|---|
| `classify` | Low | Haiku reads task, decides simple→To Do or complex→Triage |
| `triage` | High | Opus brainstorms in workspace chat, breaks into subtasks with dependencies |
| `implement` | Medium | Agent writes code, runs tests, creates PR, links to issue |
| `status-report` | High | Technical Writer generates weekly HTML report from git + board data |
| `model-agent-ref` | — | Lookup table mapping tiers to specialist agents |

---

## Project Structure

```
vibe-pilot/
├── src/
│   ├── index.ts           Entry point — load config, start cycle timer
│   ├── cycle.ts           Main loop — orchestrates all steps per project
│   ├── config.ts          Load + validate autopilot.config.json
│   ├── discover.ts        Scan workspace for git repos with vibe-kanban.json
│   ├── setup.ts           Create projects, statuses, tags in vibe-kanban
│   ├── classifier.ts      Start Haiku workspaces for backlog tasks
│   ├── picker.ts          Pick To Do tasks, resolve deps, start workspaces
│   ├── reporter.ts        Saturday check — create weekly status report tasks
│   ├── api.ts             VkApi client (local + remote with auth)
│   ├── types.ts           All TypeScript types
│   └── logger.ts          Structured logger with timestamps
├── skills/                AI workspace instruction sets
│   ├── classify.md
│   ├── triage.md
│   ├── implement.md
│   ├── status-report.md
│   └── model-agent-ref.md
├── autopilot.config.json  Model pools, defaults, workspace path
├── oxfile.toml            Process manager config (vibe-kanban + autopilot)
├── test-api.ts            25-test E2E suite against live vibe-kanban
└── package.json           Zero runtime dependencies
```

---

## Setup

```bash
# 1. Clone
git clone git@github.com:harryy2510/vibe-pilot.git
cd vibe-pilot
bun install

# 2. Configure
# Edit autopilot.config.json:
#   - Set "workspace" to your projects directory
#   - Set "org_id" to your vibe-kanban org ID
#   - Set "vk_shared_api_base" to your server URL

# 3. Run with oxmgr (recommended)
ox start                  # starts vibe-kanban + autopilot

# Or standalone
bun run start             # just the autopilot
bun run dev               # with --watch
```

---

## Config

```jsonc
{
  "workspace": "/home/user/projects",     // scan for git repos here
  "vk_api": "http://localhost:4040",       // local vibe-kanban server
  "vk_shared_api_base": "https://...",     // remote API for mutations
  "org_id": "...",                         // your organization ID
  "scan_depth": 1,                         // directory depth to scan
  "interval": 60,                          // seconds between cycles

  "defaults": {
    "concurrency": 3,                      // max parallel workspaces per project
    "stack_prs": true,                     // branch off blockers instead of waiting
    "target_branch": "main",               // default base branch
    "tags": ["migration", "blocked", ...]  // auto-created on each project
  },

  "models": {
    "high":   [/* opus, gemini-pro, gpt-5.4 */],
    "medium": [/* sonnet, gemini-pro, gpt-5.2 */],
    "low":    [/* haiku, gemini-flash, gpt-5.4-fast */]
  }
}
```

---

## Testing

```bash
# Full E2E against a live vibe-kanban instance
bun run test-api.ts

# Skip workspace launch (non-destructive)
bun run test-api.ts --no-workspace

# Keep resources for manual inspection
bun run test-api.ts --no-cleanup
```

25 tests covering: org lookup, project CRUD, repo registration, status creation, tag creation, issue CRUD, issue tagging, workspace start, workspace linking, status transitions, full state verification, cleanup.

---

## The Cycle

Every 60 seconds, for each discovered project:

```
  Health check
       │
       ▼
  Discover git repos in workspace
       │
       ▼
  Setup/fix — ensure project, statuses, tags exist
       │
       ▼
  Classify — start Haiku workspace for 1 backlog task
       │
       ▼
  Triage — start Opus workspace for 1 triage task
       │
       ▼
  Reports — Saturday? create weekly status report task
       │
       ▼
  Pick — fill open slots from To Do, resolve deps, start workspaces
       │
       ▼
  Sleep 60s → repeat
```

---

## Autopilot Metadata

Embed tier + agent routing in task descriptions:

```html
<!-- autopilot
tier: medium
agent: Frontend Developer
-->
```

The picker reads this to select the right model tier and specialist agent. If absent, defaults to `medium` tier + `Senior Developer`.

---

<p align="center">
  <sub>Built for <a href="https://github.com/BloopAI/vibe-kanban">vibe-kanban</a>. Powered by vibes.</sub>
</p>
