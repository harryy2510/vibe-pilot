---
name: documentation-and-adrs
description: "Use when documenting architectural decisions, public APIs, migrations, operational runbooks, or user-requested durable technical docs."
---

# Documentation And ADRs

Document durable decisions and operational knowledge without adding process noise. This skill is inspired by addyosmani/agent-skills and adapted for DotAgent public-repo hygiene.

## When to Apply

- The user asks for docs, a runbook, an ADR, migration notes, API docs, or a reusable workflow.
- A change creates a lasting architecture decision that future maintainers will need.
- A public API, command, plugin behavior, or deployment process changes.
- Release or handoff needs concrete instructions.

Skip it for implementation details already clear from code, throwaway planning, or public repos where the user did not ask for planning/spec docs.

## Workflow

1. Identify the audience: future maintainer, user, operator, integrator, or agent.
2. Choose the smallest durable artifact: README section, inline comment, ADR, migration note, command docs, or runbook.
3. Document why the decision exists, what changed, how to use it, and what not to do.
4. Link to the source of truth instead of duplicating long procedures.
5. Keep examples executable or copy-pasteable when the doc is operational.
6. Remove stale docs touched by the change.

## ADR Shape

Use this only when the repo already has ADRs or the user asks for one:

- Title
- Status
- Context
- Decision
- Consequences
- Alternatives considered
- Date

## Rules

- Do not add Superpowers planning/spec docs to public repos unless the user explicitly asks.
- Do not maintain duplicate instruction files when a canonical tracker, README, or `AGENTS.md` exists.
- Do not write docs that promise behavior not enforced by code or checks.
- Do not add full code dumps when a short example or link is enough.

## Output

- Artifact created or updated.
- Source of truth linked.
- Stale docs removed or left untouched intentionally.
- Checks skipped or run.
