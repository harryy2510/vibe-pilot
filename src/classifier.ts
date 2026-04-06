import type { AutopilotConfig, ProjectConfig, RoundRobinState } from './types'
import type { VkApi } from './api'
import { log } from './logger'
import { pickFromPool } from './picker'

export async function classifyBacklogTasks(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
	activeWorkspaceNames: Set<string>,
): Promise<number> {
	const backlogStatusId = statusMap.get('backlog')
	if (!backlogStatusId) {
		log.warn('No Backlog status found', { projectId: projectConfig.project_id })
		return 0
	}

	// Find backlog tasks
	const { issues } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: backlogStatusId,
		sort_field: 'sort_order',
		sort_direction: 'asc',
		limit: 10,
	})

	if (issues.length === 0) return 0

	let started = 0

	for (const issue of issues) {
		// Start one classify workspace at a time to avoid overwhelming
		if (started >= 1) break

		// Skip if a workspace is already running for this task
		const wsName = `Classify: ${issue.title}`
		if (activeWorkspaceNames.has(wsName)) {
			log.info(`Skipping already-classifying task: ${issue.title}`)
			continue
		}

		const { executor, model } = pickFromPool(globalConfig.models, 'low', rrState)

		log.info(`Classifying backlog task: ${issue.title}`, {
			issueId: issue.id,
			executor,
			model,
		})

		const prompt = `You are classifying a backlog task. Follow the classify skill.

Task: ${issue.title}
${issue.description ? `\nDescription:\n${issue.description}` : ''}

Issue ID: ${issue.id}
Project ID: ${projectConfig.project_id}`

		try {
			const { workspace } = await api.startWorkspace({
				name: wsName,
				repos: [{
					repo_id: projectConfig.repo_id,
					target_branch: globalConfig.defaults.target_branch,
				}],
				linked_issue: {
					remote_project_id: projectConfig.project_id,
					issue_id: issue.id,
				},
				executor_config: {
					executor,
					model_id: model,
					permission_policy: 'AUTO',
				},
				prompt,
			})

			await api.linkWorkspaceToIssue(workspace.id, {
				project_id: projectConfig.project_id,
				issue_id: issue.id,
			})

			started++
		} catch (err) {
			log.error(`Failed to start classify workspace for "${issue.title}"`, {
				error: String(err),
			})
		}
	}

	return started
}
