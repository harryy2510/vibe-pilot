---
name: implement
description: Implement a task from the To Do board. Write code, create PR, and link it to the issue. The PR triggers automatic transition to In Review.
---

# Implement Task

You are implementing a task from the kanban board. Your job is to write the code and create a PR.

## Your Job

1. Read the task description carefully — it contains the spec
2. Read the project's repo-map for codebase context
3. Implement the work
4. Create a PR and link it to the issue

## Before You Start

1. Read `.claude/project-map.md` (or equivalent repo-map) to understand the codebase
2. Read `CLAUDE.md` for project conventions and rules
3. Understand the task requirements from the description
4. Check if there are related files you should read first

## Implementation

- Follow the project's coding conventions exactly
- Write clean, production-quality code
- Keep changes focused — only touch what the task requires
- Do not add features, refactor code, or make improvements beyond the task scope
- If the task mentions specific files or patterns, follow them

## Testing

- Run the project's check/lint/type-check command before committing
- If tests exist, make sure they pass
- If the task involves new functionality, add tests if the project has a test setup

## Non-Negotiable: Create PR and Link to Issue

This step MUST happen. Without it, the task stays In Progress forever.

1. Stage and commit your changes with a clear commit message
2. Push to the branch
3. Create a PR using the vibe-kanban tools or `gh pr create`:
   - Title: matches the task title
   - Body: brief description of changes + link to the issue
   - Target branch: the branch specified in the workspace (may be another branch for stacked PRs, not always main)
4. Link the PR to the issue — vibe-kanban automatically moves the task to "In Review" when a PR is linked

If you cannot create the PR for any reason (merge conflicts, failing checks), leave a comment on the issue explaining what happened and what needs to be resolved.

## Important

- Do NOT move the task status manually — vibe-kanban handles transitions
- Do NOT skip the PR step — it's the signal that work is done
- Do NOT make changes outside the task scope
- If the task is unclear, implement your best interpretation and note assumptions in the PR description
