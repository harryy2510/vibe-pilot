---
name: agent-routing
description: "Use when deciding which available role profile, skill, native subagent, or agent-team pattern should handle work. Applies when the user asks for routing, the task is broad enough for subagents, or the host exposes DotAgent role profiles and routing is materially useful."
---

# Agent Routing

Route work when routing will improve the outcome. The goal is to use specialists when the current host actually exposes them, without wasting context on unavailable roles or skill ceremonies.

## Capability Boundary

- `.agents/agents.json` is agent-tool sync configuration, not a role-profile directory.
- `.agents/intel/` is generated repo intelligence, not a role-profile directory.
- `scripts/agent-check` is enforcement/check tooling, not a role profile.
- DotAgent role profiles are the Markdown files in `plugins/dotagent/agents/` or the installed DotAgent package's equivalent path.
- DotAgent skills are the directories in `plugins/dotagent/skills/` or the installed package's equivalent path.
- `agent-routing` is an active capability only when the current host exposes this skill or the role profile files are accessible. If they are unavailable, treat role names as lightweight guidance and use the host capabilities that are actually available.

## Activation Flow

Use this flow when routing is requested, when work is broad enough for subagents, or when the host exposes DotAgent profiles and routing materially reduces risk:

1. Identify the work type.
2. Confirm the host exposes DotAgent role profiles, or that the profile files are accessible locally.
3. Pick every matching role profile from the DotAgent `agents/` directory.
4. If the host supports native subagents and policy/user permissions allow delegation, invoke the matching specialist for self-contained work. Do not merely mention the specialist.
5. If native subagents are unavailable or disallowed, read the role profile and operate in that mode yourself.
6. Treat skills named in the role profile `skills:` list as optional context unless the user asks for that role, the task is high-risk, or the skill materially reduces risk.
7. Announce one routing receipt: `Active role: <agent>; skills: <skills>; mode: <native|local>; reason: <trigger>`.

## Host Rules

- Claude Code: custom agents are selected by their frontmatter `description` when the DotAgent agent files are installed or otherwise exposed to Claude. If they are not exposed, use the role descriptions as guidance only.
- Claude Code subagents cannot spawn other subagents. Keep coordination roles such as `agents-orchestrator` in the main thread when they need to invoke specialists; the main thread should call each specialist directly.
- Codex: global `AGENTS.md` rules do not install DotAgent skills or native agents. Current Codex sessions spawn subagents only when the user explicitly asks for subagents or parallel agent work; otherwise use accessible DotAgent profile files as local guidance.
- Gemini: the DotAgent Gemini extension points at shared context. Do not assume native DotAgent subagents exist unless Gemini exposes them as callable agents.
- Other hosts: use native delegation only when the tool exposes it and the current policy permits it. Otherwise treat role names as routing hints.

## Routing Matrix

| Work type | Agent | Useful skills |
|---|---|---|
| Multi-agent coordination, decomposition, specialist selection | `agents-orchestrator` | `agent-routing`, `repo-intelligence`, `toolchain` |
| Complex full-stack implementation | `engineering-senior-developer` | `toolchain`, `repo-intelligence`, `source-driven-development`, `api-and-interface-design`, stack-specific skills, `testing`, `code-simplification` |
| Architecture, domain modeling, ADRs, refactor planning | `engineering-software-architect` | `agent-routing`, `repo-intelligence`, `toolchain`, `api-and-interface-design`, `deprecation-and-migration`, `documentation-and-adrs`, stack-specific skills |
| Frontend UI, React, accessibility, responsive work | `engineering-frontend-developer` | `ui`, `shadcn`, `react-best-practices`, `performance-optimization`, `forms-rhf-zod`, `react-query-mutative`, `zustand-x-ui-state`, `testing` |
| Design systems, layouts, component hierarchy, UX handoff | `design-ux-architect` | `ui`, `shadcn`, `react-best-practices`, `repo-intelligence` |
| Backend, APIs, server functions, auth/data boundaries | `engineering-backend-architect` | `toolchain`, `repo-intelligence`, `api-and-interface-design`, `tanstack-start-cloudflare`, `supabase-auth-data`, `supabase-postgres-best-practices`, `security-and-hardening`, `deprecation-and-migration`, `cloudflare` |
| Postgres, migrations, RLS, indexes, query plans | `engineering-database-optimizer` | `repo-intelligence`, `toolchain`, `supabase-auth-data`, `supabase-postgres-best-practices` |
| CI/CD, GitHub Actions, deployments, Wrangler | `engineering-devops-automator` | `toolchain`, `repo-intelligence`, `project-setup`, `security-and-hardening`, `performance-optimization`, `deprecation-and-migration`, `cloudflare` |
| Security, authz, secrets, threat modeling | `engineering-security-engineer` | `repo-intelligence`, `toolchain`, `security-and-hardening`, `supabase-auth-data`, `supabase-postgres-best-practices`, `cloudflare` |
| Bugs, crashes, regressions, flaky tests, unclear root cause | `engineering-debugger` | `debugging`, `repo-intelligence`, `toolchain`, `testing` |
| Code review | `engineering-code-reviewer` | `repo-intelligence`, `toolchain`, `deslop`, `testing`, `api-and-interface-design`, `security-and-hardening`, `performance-optimization`, `code-simplification` |
| Git workflow, commits, branches, worktrees | `engineering-git-workflow-master` | `toolchain`, `repo-intelligence` |
| Prototype or MVP | `engineering-rapid-prototyper` | `toolchain`, `scaffold`, `ui`, `react-best-practices` |
| Developer docs, README, commands, migration guides | `engineering-technical-writer` | `repo-intelligence`, `toolchain`, `documentation-and-adrs`, `api-and-interface-design` |
| Product specs, PRDs, priorities, acceptance criteria | `product-manager` | `repo-intelligence`, `agent-routing` |
| MCP servers and agent connectors | `specialized-mcp-builder` | `toolchain`, `repo-intelligence` |
| API tests and contracts | `testing-api-tester` | `testing`, `toolchain`, `repo-intelligence`, `api-and-interface-design`, `security-and-hardening`, `performance-optimization`, `supabase-auth-data`, `cloudflare` |
| New Playwright E2E tests | `testing-e2e-writer` | `testing`, `repo-intelligence`, `ui` |
| Running/debugging Playwright E2E | `testing-e2e-runner` | `debugging`, `testing`, `toolchain`, `repo-intelligence` |
| Performance/load/Core Web Vitals | `testing-performance-benchmarker` | `testing`, `repo-intelligence`, `performance-optimization`, `react-best-practices`, `supabase-postgres-best-practices`, `cloudflare`, `vite` |

## Multi-Role Tasks

- Prefer one lead role and one reviewer role.
- Use `agents-orchestrator` locally in the main thread for work that needs multiple specialists; do not bury coordination inside a spawned child agent.
- For cross-layer implementation, lead with `engineering-senior-developer`, then invoke focused specialists for independent backend, frontend, database, or testing slices.
- For risky code changes, use `engineering-code-reviewer` after implementation even if another specialist already reviewed locally.
- For research-only work, use read-only roles where possible and avoid write-capable agents unless edits are required.

## Delivery Gates

- For straightforward edits, do not add separate review or verification phases unless they materially reduce risk.
- For substantial or risky work, run the smallest useful set of quality checks, relevant tests, review, delivery validation, and docs sync when behavior or commands changed.
- When agent, skill, command, or plugin config changes, run `skill-lint` and check for conflicting rules, overbroad tools, stale triggers, and broken references.
- Compare implementation against the approved plan or acceptance criteria; flag drift even when tests pass.
- For developer-facing APIs, CLIs, SDKs, docs, or setup flows, include a DX review: time-to-first-success, install friction, copy/paste command accuracy, error recovery, and examples.
- For complex or risky behavior, prefer a test-first loop: failing test, minimal implementation, passing test, refactor.
- If work reveals a durable repo convention or repeated pitfall, capture it in the appropriate rule/skill/reference instead of leaving it only in chat.

## Subagent Prompt Contract

When invoking a native specialist, include:

- task goal and non-goals
- files or directories it owns
- repo constraints and relevant user constraints
- useful skills or required checks
- expected output format
- instruction not to revert unrelated user changes
