# Claude Toolkit — Marketplace Restructuring

**Date:** 2026-04-07
**Status:** Approved

---

## Problem

Skills in vibe-pilot only exist inside the vibe-pilot repo. They can't be installed as a Claude Code plugin, so workspaces launched by the daemon rely on the skill being magically available. Meanwhile, dotclaude acts as both a plugin AND a marketplace (`dotclaude@dotclaude` — redundant naming). There's no shared registry for multiple plugins.

## Solution

Three repos, clear separation of concerns:

| Repo | Purpose |
|---|---|
| `harryy2510/claude-toolkit` | Pure marketplace registry — no code, just an index pointing to plugin repos |
| `harryy2510/dotclaude` | Plugin: coding conventions, 19 agents, 16 skills, 6 commands |
| `harryy2510/vibe-pilot` | Autopilot daemon + plugin: 3 portable skills, 3 slash commands |

Install experience:

```bash
claude plugin marketplace add harryy2510/claude-toolkit
claude plugin install claude-toolkit@dotclaude
claude plugin install claude-toolkit@vibe-pilot
```

---

## Repo 1: `harryy2510/claude-toolkit` (new)

Already created at `git@github.com:harryy2510/claude-toolkit.git`.

### Structure

```
claude-toolkit/
├── .claude-plugin/
│   └── marketplace.json
└── README.md
```

No `plugin.json` at root — this is a marketplace, not a plugin.

### marketplace.json

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "claude-toolkit",
  "description": "Curated Claude Code plugins by Hariom Sharma",
  "owner": {
    "name": "Hariom Sharma",
    "email": "harryy2510@gmail.com"
  },
  "plugins": [
    {
      "name": "dotclaude",
      "description": "Code conventions, 19 agents, 16 skills, and tooling for all projects",
      "source": { "source": "github", "repo": "harryy2510/dotclaude" },
      "category": "development"
    },
    {
      "name": "vibe-pilot",
      "description": "AI kanban autopilot skills — classify, triage, and status reports",
      "source": { "source": "github", "repo": "harryy2510/vibe-pilot" },
      "category": "development"
    }
  ]
}
```

### README.md

Storefront README covering:
- What is claude-toolkit (curated plugin collection by Hariom Sharma)
- Quick install (marketplace add + per-plugin install)
- Plugin catalog table (name, description, skills/agents/commands count, install command)
- Per-plugin detail sections with what you get
- Links to each plugin's own repo/README for full docs

---

## Repo 2: `harryy2510/dotclaude` (existing — changes)

### Changes

1. **Delete** `.claude-plugin/marketplace.json` — marketplace responsibility moves to claude-toolkit
2. **Update** `README.md`:
   - Install instructions: `harryy2510/dotclaude` -> `harryy2510/claude-toolkit`, `dotclaude@dotclaude` -> `claude-toolkit@dotclaude`
   - Remove "Private. Not for distribution outside the team." footer
   - Add note that this plugin is part of the claude-toolkit marketplace

### No other changes

Plugin structure (`plugins/dotclaude/`) stays exactly as-is. The plugin.json at `plugins/dotclaude/.claude-plugin/plugin.json` is unchanged.

---

## Repo 3: `harryy2510/vibe-pilot` (existing — changes)

### Changes

1. **Delete** `skills/` directory (5 files) — the 3 portable skills move into the plugin structure; `implement.md` and `model-agent-ref.md` are daemon-only and not needed as plugin skills (the daemon's workspace prompts say "Follow the X skill" and rely on the globally installed plugin)
2. **Add** plugin structure at `plugins/vibe-pilot/`
3. **Update** `README.md` — add plugin section, update project structure diagram

### New plugin structure

```
plugins/
└── vibe-pilot/
    ├── .claude-plugin/
    │   └── plugin.json
    ├── skills/
    │   ├── classify/
    │   │   └── SKILL.md
    │   ├── triage/
    │   │   └── SKILL.md
    │   ├── implement/
    │   │   └── SKILL.md
    │   └── status-report/
    │       └── SKILL.md
    └── commands/
        ├── classify.md
        ├── triage.md
        └── status-report.md
```

### plugin.json

```json
{
  "name": "vibe-pilot",
  "version": "1.0.0",
  "description": "Kanban autopilot skills — task classification, triage breakdown, and weekly status reports"
}
```

### Skills

Four skills moved from `skills/*.md` to `plugins/vibe-pilot/skills/*/SKILL.md` (Claude Code plugin format requires SKILL.md inside a named directory):

| Skill | Source | User-invocable |
|---|---|---|
| `vibe-pilot:classify` | `skills/classify.md` -> `plugins/vibe-pilot/skills/classify/SKILL.md` | Yes |
| `vibe-pilot:triage` | `skills/triage.md` -> `plugins/vibe-pilot/skills/triage/SKILL.md` | Yes |
| `vibe-pilot:implement` | `skills/implement.md` -> `plugins/vibe-pilot/skills/implement/SKILL.md` | No |
| `vibe-pilot:status-report` | `skills/status-report.md` -> `plugins/vibe-pilot/skills/status-report/SKILL.md` | Yes |

**Why implement is in the plugin but not user-invocable:** The daemon's picker.ts prompt says `"Follow the vibe-pilot:implement skill"` — the workspace needs this skill available via the globally installed plugin. But it's not useful to invoke manually, so `user_invocable: false`.

Skills NOT included in the plugin:
- `model-agent-ref.md` — reference table, not a skill; content is already embedded in classify and triage skills. Deleted from the repo.

### Commands

Three slash commands — thin wrappers that invoke the corresponding skill:

| Command | Purpose |
|---|---|
| `/vibe-pilot:classify` | Manually classify a backlog task |
| `/vibe-pilot:triage` | Manually triage a complex task |
| `/vibe-pilot:status-report` | Generate a weekly status report on demand |

Command format follows dotclaude's pattern (frontmatter + instruction).

### README changes

- Update header stats: `5 skills` -> `4 skills · 3 commands`
- Add "Plugin" section explaining the distributable skills and commands
- Add install instructions referencing `claude-toolkit@vibe-pilot`
- Update project structure diagram to show `plugins/` directory instead of `skills/`
- Note that `vibe-pilot:implement` and `model-agent-ref` are no longer standalone files

---

## What does NOT change

- The daemon code (`src/`) is untouched
- `autopilot.config.sample.json`, `oxfile.sample.toml`, `test-api.ts` unchanged
- `vibe-kanban.json` unchanged
- `package.json` unchanged
- The daemon's workspace prompts (e.g. `"Follow the vibe-pilot:classify skill"`) work because the plugin is installed globally via `claude plugin install claude-toolkit@vibe-pilot`

---

## Implementation order

1. Create `harryy2510/claude-toolkit` repo contents (marketplace.json + README)
2. Add plugin structure to vibe-pilot (plugins/, delete old skills/)
3. Update dotclaude (delete marketplace.json, update README)
4. Update vibe-pilot README
