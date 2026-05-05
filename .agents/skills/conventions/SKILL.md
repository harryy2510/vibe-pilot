---
name: conventions
description: "Use once per project to install repo-level agent conventions, hooks, and deterministic checks through Agent Toolkit."
---

# Conventions

Use Agent Toolkit as the convention gate. Do not install separate lint-staged, ESLint, or Prettier enforcement.

## Setup

```bash
bunx @harryy/agent-toolkit repo bootstrap
bunx @harryy/agent-toolkit repo intel
bunx @harryy/agent-toolkit repo check
```

This creates:

```text
AGENTS.md
.agents/agents.json
.agents/README.md
scripts/agent-check
.husky/pre-commit
.husky/pre-push
.husky/commit-msg
```

When the repo is a git checkout, bootstrap configures:

```bash
git config core.hooksPath .husky
```

## What This Enforces

| Convention | Enforced By |
|---|---|
| `AGENTS.md` exists | `agent-toolkit repo check` |
| `.agents/agents.json` exists | `agent-toolkit repo check` |
| New JS-platform code is TypeScript | `agent-toolkit repo check` |
| No `.js` or `.jsx` source files | `agent-toolkit repo check` |
| No `tsc` check workflow | `agent-toolkit repo check` |
| Use `oxlint --type-aware --type-check` | `agent-toolkit repo check` |
| Use `oxfmt` | `agent-toolkit repo check` |
| Debug statements, placeholders, empty catches, likely secrets | `agent-toolkit repo check` |
| Conventional Commit messages | `.husky/commit-msg` |
| No hook bypassing | Global rules |

## Completion

Run:

```bash
bunx @harryy/agent-toolkit repo check
agents sync --check
```

Run `agents sync --check` only when `AGENTS.md` or `.agents/` changed.
