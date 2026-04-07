# Weekly Status Reports — Design Spec

**Date:** 2026-04-06
**Status:** Approved

## Overview

Every Saturday, vibe-pilot creates a vibe-kanban task per project tagged `status-update`. An Opus workspace generates a polished, client-ready HTML report from the project's template and commits it to `public/r/{hash}/index.html`.

## Flow

1. Saturday cron check in existing cycle
2. For each project: template exists at `docs/status-update-template.html`?
   - Yes: create "Status Update — {date}" task, tag `status-update`
   - No: create "Setup status report template" task, tags `status-update` + `setup`
3. Task gets picked up by normal autopilot flow → Opus workspace with `vibe-pilot:status-report` skill
4. Skill gathers data, generates report, creates PR with dev link

## Data Sources

- Git log (past 7 days)
- Vibe-kanban tasks (done, in review, in progress, to do)
- PR descriptions
- Module progress: done/total tasks per tag

## Report Output

- Path: `public/r/{hash}/index.html` (hash = random 16-char hex, unguessable)
- PR title: "Status Update — April 6, 2026"
- PR body: includes link using dev URL from `.env.development` (VITE_SITE_URL or NEXT_PUBLIC_APP_URL)

## Template Creation (one-time)

If no template exists, AI scans codebase for branding (colors, fonts, project name from package.json, CSS vars, tailwind config) and generates the template at `docs/status-update-template.html`.

## New Components

- `src/reporter.ts` — Saturday check, creates status-update tasks
- `skills/status-report.md` — Opus skill
- New tag: `status-update`
