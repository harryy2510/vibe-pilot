<p align="center">
  <h1 align="center">Vibe Pilot</h1>
  <p align="center">
    <strong>Zero-touch kanban autopilot for <a href="https://github.com/BloopAI/vibe-kanban">vibe-kanban</a>.</strong>
  </p>
  <p align="center">
    Code does code work. AI does AI work.
  </p>
  <p align="center">
    <code>11 modules</code> · <code>4 skills</code> · <code>3 commands</code> · <code>3 model tiers</code> · <code>1 dependency</code>
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
+--------------------------------------------------------------------------+
|                                                                          |
|   A deterministic Bun process that discovers your repos, sets up         |
|   kanban boards, classifies tasks, triages complex work, picks           |
|   what to build next, and launches AI workspaces -- all on autopilot.    |
|                                                                          |
|   You add tasks to Backlog. Vibe Pilot does the rest.                    |
|                                                                          |
+--------------------------------------------------------------------------+
```

---

## The Philosophy

```
  +---------------------------------------------------------------------+
  |                                                                     |
  |   DETERMINISTIC CODE              AI AGENTS                        |
  |   ----------------                ----------                        |
  |   Project discovery               Classify: simple or complex?     |
  |   Board setup & tags              Triage: break down complex tasks  |
  |   Slot counting                   Implement: write code & PR        |
  |   Dependency resolution           Report: weekly status updates     |
  |   Round-robin routing                                               |
  |   Stacked PR orchestration                                          |
  |                                                                     |
  |   Code does code work.            AI does AI work.                  |
  |                                                                     |
  +---------------------------------------------------------------------+
```

---

## How It Works

```
                    +----------+
                    | Backlog  |  You drop tasks here
                    +----+-----+
                         |
                    +----v-----+
                    | Classify |  Haiku: "simple or complex?"
                    +--+----+--+
                       |    |
              simple   |    |   complex
                       |    |
                 +-----v+  +v------+
                 | To Do|  |Triage |  Opus brainstorms,
                 +--+---+  +---+---+  breaks into subtasks
                    |          |
                    |   +------+
                    |   |
              +-----v---v----+
              |  In Progress  |  Workspace launched,
              |               |  agent writes code
              +------+--------+
                     |
              +------v--------+
              |   In Review   |  PR created,
              |               |  ready for you
              +------+--------+
                     |
              +------v--------+
              |     Done      |  Merged
              +---------------+
```

---

## Multi-Executor Round Robin

Not locked to one AI. Three tiers, round-robin across providers.

```
  HIGH  ----------------------------------------------------------
  Triage, brainstorming, architecture decisions

    Claude Opus  ->  Gemini Pro  ->  Codex GPT-5.4  ->  repeat

  MEDIUM  --------------------------------------------------------
  Implementation, feature work, bug fixes

    Claude Sonnet  ->  Gemini Pro  ->  Codex GPT-5.2  ->  repeat

  LOW  -----------------------------------------------------------
  Classification, simple tasks, quick fixes

    Claude Haiku  ->  Gemini Flash  ->  Codex Fast  ->  repeat
```

---

## Stacked PRs

Dependent tasks don't wait. They branch off the blocker's working branch.

```
  main ---------------------------------------------------------->
         \
          +--- vk/auth-middleware ------------------------------>  Task A (blocker)
                  \
                   +--- vk/user-profile ----------------------->  Task B (blocked by A)
                           \
                            +--- vk/profile-tests ------------->  Task C (blocked by B)
```

When A merges, GitHub auto-retargets B to main. No idle slots.

---

## Workspace Dedup

The autopilot fetches active workspaces once per cycle. If a workspace is already running for a task, it skips -- no duplicate agents, no wasted compute.

```
  Cycle N:   Classify "Add auth" -> workspace started
  Cycle N+1: Classify "Add auth" -> workspace exists, skip
```

---

## Plugin

Skills and commands are distributed as a Claude Code plugin via the
[claude-toolkit](https://github.com/harryy2510/claude-toolkit) marketplace.

```bash
# Install the plugin
claude plugin marketplace add harryy2510/claude-toolkit
claude plugin install vibe-pilot@claude-toolkit
```

### Skills

Loaded into AI workspaces. Each skill is a focused instruction set.

| Skill | Tier | User-invocable | What happens |
|---|---|---|---|
| `classify` | Low | Yes | Haiku reads task, decides simple->To Do or complex->Triage |
| `triage` | High | Yes | Opus brainstorms in workspace chat, breaks into subtasks with dependencies |
| `implement` | Medium | No | Agent writes code, runs tests, creates PR, links to issue |
| `status-report` | High | Yes | Technical Writer generates weekly HTML report from git + board data |

### Commands

Slash commands that invoke skills directly.

| Command | Skill | Description |
|---|---|---|
| `/classify` | classify | Classify a backlog task as simple or complex |
| `/triage` | triage | Break down a complex task into subtasks |
| `/status-report` | status-report | Generate a weekly status report |

---

## Project Structure

```
vibe-pilot/
├── src/
│   ├── index.ts           Entry point -- load config, start cycle timer
│   ├── cycle.ts           Main loop -- orchestrates all steps per project
│   ├── config.ts          Load + validate autopilot.config.json
│   ├── discover.ts        Recursive scan for git repos (up to scan_depth)
│   ├── setup.ts           Create projects, statuses, tags, link default repos
│   ├── classifier.ts      Start Haiku workspaces for backlog tasks
│   ├── picker.ts          Pick To Do tasks, resolve deps, start workspaces
│   ├── reporter.ts        Saturday check -- create weekly status report tasks
│   ├── api.ts             VkApi client (local + remote with auth)
│   ├── types.ts           All TypeScript types
│   └── logger.ts          Structured logger with timestamps
├── scripts/
│   └── clean.ts           Full reset -- delete all projects, repos, workspaces
├── plugins/               Claude Code plugin (distributable skills + commands)
│   └── vibe-pilot/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/
│       │   ├── classify/
│       │   ├── triage/
│       │   ├── implement/
│       │   └── status-report/
│       └── commands/
│           ├── classify.md
│           ├── triage.md
│           └── status-report.md
├── autopilot.config.sample.json  Sample config (copy to autopilot.config.json)
├── oxfile.sample.toml            Sample oxfile config (copy to oxfile.toml)
├── test-api.ts                   25-test E2E suite against live vibe-kanban
└── package.json
```

---

## Setup

```bash
# 1. Clone
git clone git@github.com:harryy2510/vibe-pilot.git
cd vibe-pilot
bun install

# 2. Configure
cp autopilot.config.sample.json autopilot.config.json
cp oxfile.sample.toml oxfile.toml
# Edit autopilot.config.json:
#   - Set "workspace" to your projects directory
#   - Set "org_id" to your vibe-kanban org ID
#   - Set "vk_shared_api_base" to your server URL
# Edit oxfile.toml:
#   - Set VK_SHARED_API_BASE / VK_SHARED_RELAY_API_BASE to your server URLs

# 3. Install the Claude Code plugin (optional -- for workspace skills)
claude plugin marketplace add harryy2510/claude-toolkit
claude plugin install vibe-pilot@claude-toolkit

# 4. Run with oxfile (recommended)
ox start                              # starts vibe-kanban + autopilot

# Or run directly
bun run start                         # autopilot only (vibe-kanban must be running)
bun run dev                           # autopilot with --watch

# Reset everything
bun run clean                         # deletes all projects, repos, workspaces
```

---

## Config

```jsonc
{
  "workspace": "/home/user/projects",     // scan for git repos here
  "vk_api": "http://localhost:4040",       // local vibe-kanban server
  "vk_shared_api_base": "https://...",     // remote API for mutations
  "org_id": "...",                         // your organization ID
  "scan_depth": 2,                         // directory depth to scan (default: 2)
  "interval": 60,                          // seconds between cycles

  "defaults": {
    "concurrency": 3,                      // max parallel workspaces per project
    "stack_prs": true,                     // branch off blockers instead of waiting
    "target_branch": "main",               // default base branch
    "copy_files": [".env.keys"],           // files copied into workspaces
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
       |
       v
  Discover git repos in workspace (recursive, up to scan_depth)
       |
       v
  Setup/fix -- ensure project, statuses, tags, default repos exist
       |
       v
  Classify -- start Haiku workspace for 1 backlog task
       |
       v
  Triage -- start Opus workspace for 1 triage task
       |
       v
  Reports -- Saturday? create weekly status report task
       |
       v
  Pick -- fill open slots from To Do, resolve deps, start workspaces
       |
       v
  Sleep 60s -> repeat
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
