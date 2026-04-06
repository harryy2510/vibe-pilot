---
name: status-report
description: Generate a weekly client-ready status report. Gathers git commits, kanban tasks, PR descriptions, and module progress to fill an HTML template. Creates the template if it doesn't exist.
---

# Weekly Status Report

You are generating a polished, client-ready weekly status report for the project.

## If No Template Exists

Create `docs/status-update-template.html` first:

1. Read `package.json` for project name
2. Scan for branding: CSS variables, tailwind config, accent colors, fonts
3. Decide light or dark theme based on existing styles
4. Create a template with these sections:
   - Hero with project name, date, update number
   - Overall progress bar with percentage
   - Module progress bars (one per major tag/area)
   - "What Got Done" card grid (2-4 highlights)
   - "Done & Up Next" split checklist
   - Optional technical notes section
   - Blockers section
   - Footer
5. Use `{{MUSTACHE_VARS}}` for all dynamic content
6. Include all CSS inline (single self-contained HTML file)
7. Add `<meta name="robots" content="noindex, nofollow">`
8. Commit the template

## Gathering Report Data

### 1. Git Commits (past 7 days)
```bash
git log --since="7 days ago" --pretty=format:"%h %s" --no-merges
```

### 2. Kanban Tasks
Use vibe-kanban MCP tools:
- `list_issues(status: "Done")` — completed this week (check `completed_at` or `updated_at`)
- `list_issues(status: "In Review")` — work awaiting merge
- `list_issues(status: "In Progress")` — currently active
- `list_issues(status: "To Do")` — upcoming work

### 3. Module Progress
For each domain tag (frontend, backend, migration, etc.):
- Count total tasks with that tag
- Count done tasks with that tag
- Percentage = done / total * 100
- Overall = average of all module percentages

### 4. Dev URL
Read `.env.development` or `.env.local` for:
- `VITE_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- Or similar site URL variable

## Generating the Report

1. Read the template from `docs/status-update-template.html`
2. Generate a random 16-character hex hash: `crypto.randomUUID().replace(/-/g, '').slice(0, 16)`
3. Fill in all template variables with gathered data
4. Write client-friendly content:
   - NO technical jargon (no "RLS", "migration", "API endpoint")
   - Translate to business value ("User data is now more secure", "Dashboard loads 3x faster")
   - Keep descriptions concise (1-2 sentences per card)
   - Highlight impact, not implementation
5. Save to `public/r/{hash}/index.html`
6. Commit all changes

## Creating the PR

Title: `Status Update — {date}`

Body:
```
## Weekly Status Report

**Period:** Week of {date}
**Report:** {dev_url}/r/{hash}/index.html

### Highlights
- {2-3 bullet points of key achievements}

### Module Progress
- Overall: {pct}%
- {module}: {pct}%
- ...
```

## Important

- This is a CLIENT-FACING document — write for non-technical stakeholders
- Every sentence should communicate value or progress, not technical details
- Use the project's branding and voice consistently
- The report must be a single self-contained HTML file (no external deps except fonts)
- The hash URL must be random and unguessable
