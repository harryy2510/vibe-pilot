# Vibe Pilot Gemini Extension

Vibe Pilot provides agent skills for vibe-kanban autopilot workflows.

## Skills

- `classify`: classify backlog tasks as simple or complex.
- `triage`: break complex tasks into actionable subtasks and dependencies.
- `implement`: pick and implement ready tasks.
- `status-report`: generate progress reports from board and git state.

## Rules

- Use the skill matching the user's request before taking action.
- Do not run workspace-launching or board-mutating commands unless the user asked for that action.
- Treat `autopilot.config.json`, `oxfile.toml`, live vibe-kanban data, and workspaces as user-owned runtime state.
