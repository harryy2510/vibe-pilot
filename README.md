<p align="center">
  <h1 align="center">Vibe Pilot</h1>
  <p align="center">
    <strong>Drop tasks in Backlog. AI does the rest.</strong>
  </p>
  <p align="center">
    <code>4 skills</code> &middot; <code>3 commands</code> &middot; <code>11 modules</code> &middot; <code>3 model tiers</code>
  </p>
</p>

<p align="center">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://claude.ai"><img src="https://img.shields.io/badge/Claude-CC785C?style=flat-square&logo=anthropic&logoColor=white" alt="Claude"></a>
  <a href="https://gemini.google.com"><img src="https://img.shields.io/badge/Gemini-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini"></a>
  <a href="https://openai.com/codex"><img src="https://img.shields.io/badge/Codex-412991?style=flat-square&logo=openai&logoColor=white" alt="Codex"></a>
</p>

---

```bash
claude plugin marketplace add harryy2510/claude-toolkit
claude plugin install vibe-pilot@claude-toolkit
```

---

## How It Works

A deterministic Bun process discovers repos, sets up kanban boards, and runs an autonomous cycle:

```
Backlog  ──  Classify  ──  To Do / Triage  ──  In Progress  ──  In Review  ──  Done
               │                │                    │
            simple?          complex?           launch agent
            → To Do          → break down       → write code
                             → create subtasks   → create PR
```

### The philosophy

```
DETERMINISTIC CODE              AI AGENTS
──────────────────              ──────────
Project discovery               Classify: simple or complex?
Board setup & tags              Triage: break down complex tasks
Slot counting                   Implement: write code & PR
Dependency resolution           Report: weekly status updates
Round-robin routing
Stacked PR orchestration

Code does code work.            AI does AI work.
```

---

## Skills

| Skill | What | Tier |
|---|---|---|
| **classify** | Scan repos, classify backlog tasks by complexity and domain | Haiku |
| **triage** | Break complex tasks into actionable subtasks with specs and dependencies | Opus |
| **implement** | Pick next task, launch workspace, write code, create PR | Medium |
| **status-report** | Generate weekly HTML report from git commits + kanban data | High |

## Commands

| Command | What |
|---|---|
| `/vibe-pilot:classify` | Classify a task |
| `/vibe-pilot:triage` | Triage a complex task |
| `/vibe-pilot:status-report` | Generate status report |

---

## Cycle

Each cycle the autopilot:

1. **Discovers** repos via config
2. **Sets up** projects, boards, tags if missing
3. **Classifies** backlog tasks (Haiku -- fast, cheap)
4. **Triages** complex tasks into subtasks (Opus -- thorough)
5. **Picks** next ready task (respects dependencies, slots, priority)
6. **Launches** AI workspace to implement (round-robin across executors)
7. **Reports** weekly status (git + kanban + PR data)

### Multi-executor

Round-robin across Claude Code, Gemini CLI, and Codex. Each executor gets tasks matched to its tier. Workspace dedup prevents duplicate agents on the same task.

### Stacked PRs

Dependent tasks create stacked PRs -- each PR branches from its dependency's branch, not main. Merge order is enforced.

---

## Setup

```bash
# 1. Start vibe-kanban (Docker)
docker compose up -d

# 2. Configure
cp autopilot.config.sample.json autopilot.config.json
# Edit: add org, repos, executor paths

# 3. Run
bun start
```

---

## Modules

| Module | What |
|---|---|
| `index.ts` | Entry point, cycle loop |
| `cycle.ts` | Main autopilot cycle |
| `config.ts` | Config loading + validation |
| `discover.ts` | Repo discovery |
| `setup.ts` | Project/board initialization |
| `classifier.ts` | Task classification (Haiku) |
| `picker.ts` | Task selection + workspace launch |
| `reporter.ts` | Status report generation |
| `api.ts` | Vibe-kanban API client |
| `types.ts` | Type definitions |
| `logger.ts` | Structured logging |

---

## Author

**Hariom Sharma** -- [github.com/harryy2510](https://github.com/harryy2510)

## License

MIT
