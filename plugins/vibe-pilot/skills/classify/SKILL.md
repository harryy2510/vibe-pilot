---
name: classify
description: Classify a backlog task as simple or complex. Assigns tags, model tier, and agent type. Used by the autopilot cron.
user_invocable: true
---

# Classify Task

You are classifying a backlog task to determine if it's simple (can go straight to implementation) or complex (needs brainstorming and breakdown).

## Your Job

1. Read the task title and description
2. Decide: **simple** or **complex**
3. Take the appropriate action

## Simple Tasks

A task is simple if ALL of these are true:
- Clear, specific scope (e.g. "fix typo on settings page", "add loading spinner to dashboard")
- No architectural decisions needed
- Likely touches 1-5 files
- No database migrations required (unless trivial like adding a column)
- No ambiguity in what needs to be done

**Actions for simple tasks:**
1. Add appropriate domain tags using `add_issue_tag`:
   - `frontend` — UI components, pages, layouts, styles
   - `backend` — server functions, APIs, integrations
   - `migration` — database schema changes
   - `bug` — fixing broken behavior
   - `feature` — new functionality
   - `enhancement` — improving existing functionality
2. Determine the model tier and agent type (see Model-Agent Reference below)
3. Update the task description to append the autopilot metadata block:
   ```
   <!-- autopilot
   tier: {low|medium|high}
   agent: {agent type}
   -->
   ```
4. Set priority (urgent/high/medium/low) based on task urgency
5. Move the task to "To Do" status

## Complex Tasks

A task is complex if ANY of these are true:
- Vague or broad scope (e.g. "build user management", "improve performance")
- Requires architectural decisions
- Likely touches 10+ files or multiple systems
- Needs discussion with the user to clarify requirements
- Could be broken into multiple independent tasks

**Actions for complex tasks:**
1. Add the `brainstorm` tag
2. Move the task to "Triage" status

## Model-Agent Reference

Use this to decide the tier and agent for simple tasks:

| Task Type | Tier | Agent |
|---|---|---|
| Simple bug fix, typo, config change | low | Senior Developer |
| Standard UI component, page, form | medium | Frontend Developer |
| Standard API endpoint, server function | medium | Backend Architect |
| Database migration, schema change | medium | Database Optimizer |
| Auth flow, RLS policy, security fix | medium | Security Engineer |
| CI/CD, deployment, infrastructure | medium | DevOps Automator |
| Documentation, README | low | Technical Writer |
| Complex cross-domain feature | high | Senior Developer |
| Architecture, system design | high | Software Architect |

## Important

- Do NOT start implementing the task
- Do NOT create a workspace or write code
- Only classify, tag, and move the task
- If unsure, err on the side of "complex" — it's better to brainstorm than to ship half-baked work
