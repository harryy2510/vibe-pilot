import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { AutopilotConfig, ProjectConfig, RoundRobinState } from './types'
import type { VkApi } from './api'
import { log } from './logger'

const SATURDAY = 6

export async function checkAndCreateReportTasks(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
	tagMap: Map<string, string>,
	projectPath: string,
): Promise<number> {
	const now = new Date()

	// Only run on Saturdays
	if (now.getDay() !== SATURDAY) return 0

	// Check if a status-update task was already created this week (any status including Done)
	const statusUpdateTagId = tagMap.get('status-update')
	if (statusUpdateTagId) {
		// Get start of this week (Monday 00:00)
		const weekStart = new Date(now)
		weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
		weekStart.setHours(0, 0, 0, 0)

		for (const statusId of statusMap.values()) {
			const { issues } = await api.searchIssues({
				project_id: projectConfig.project_id,
				status_id: statusId,
				tag_id: statusUpdateTagId,
				limit: 5,
			})

			// Check if any were created this week
			const thisWeek = issues.some(issue => new Date(issue.created_at) >= weekStart)
			if (thisWeek) return 0
		}
	}

	// Check if template exists
	const templatePath = join(projectPath, 'docs', 'status-update-template.html')
	const hasTemplate = existsSync(templatePath)

	const dateLong = now.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	// Get To Do status for creating the task
	const todoStatusId = statusMap.get('to do')
	if (!todoStatusId) return 0

	let title: string
	let description: string

	if (hasTemplate) {
		title = `Status Update — ${dateLong}`
		description = `Follow the vibe-pilot:status-report skill.

Generate the weekly status report for the week ending ${dateLong}.

Gather data from:
- Git commits (past 7 days)
- Vibe-kanban tasks (done, in review, in progress, to do)
- PR descriptions merged this week
- Module progress (count done/total tasks per tag)

Read the template at docs/status-update-template.html, fill it in, and save to public/r/{hash}/index.html.

Read the dev URL from .env.development (VITE_SITE_URL or NEXT_PUBLIC_APP_URL) for the PR link.

<!-- autopilot
tier: high
agent: Technical Writer
-->`
	} else {
		title = `Setup status report template — ${dateLong}`
		description = `Follow the vibe-pilot:status-report skill.

No status report template exists yet. Create one.

1. Scan the codebase for branding: package.json name, CSS variables, tailwind config, accent colors, fonts, light/dark theme
2. Create docs/status-update-template.html using the project's branding
3. The template should have mustache-style {{VARIABLES}} for: DATE_LONG, DATE_WEEK_OF, UPDATE_NUMBER, OVERALL_PCT, FOOTER_MONTH, and per-module percentages
4. Include sections: hero, overall progress with module bars, this week's cards, done/up-next checklists, optional technical notes, blockers, footer
5. After creating the template, also generate the first report and save to public/r/{hash}/index.html

<!-- autopilot
tier: high
agent: Technical Writer
-->`
	}

	try {
		const result = await api.createIssue({
			project_id: projectConfig.project_id,
			status_id: todoStatusId,
			title,
			description,
			priority: 'medium',
			sort_order: 0,
		})

		// Tag it
		if (statusUpdateTagId) {
			await api.addIssueTag({
				issue_id: result.data.id,
				tag_id: statusUpdateTagId,
			})
		}

		if (!hasTemplate) {
			const setupTagId = tagMap.get('setup')
			if (setupTagId) {
				await api.addIssueTag({
					issue_id: result.data.id,
					tag_id: setupTagId,
				})
			}
		}

		log.info(`Created status report task: ${title}`, {
			projectId: projectConfig.project_id,
			hasTemplate,
		})

		return 1
	} catch (err) {
		log.error('Failed to create status report task', { error: String(err) })
		return 0
	}
}
