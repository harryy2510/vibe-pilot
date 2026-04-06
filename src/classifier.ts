import type { AutopilotConfig, ModelPools, ProjectConfig, RoundRobinState } from './types'
import type { VkApi } from './api'
import { log } from './logger'

function pickFromPool(
	pools: ModelPools,
	tier: 'low' | 'medium' | 'high',
	state: RoundRobinState,
): { executor: string; model: string } {
	const pool = pools[tier]
	if (!pool.length) throw new Error(`Empty model pool for tier: ${tier}`)

	const index = state[tier] % pool.length
	state[tier] = index + 1

	const entry = pool[index]!
	return { executor: entry.executor, model: entry.model }
}

export async function classifyBacklogTasks(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
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
		sort_field: 'SortOrder',
		sort_direction: 'Asc',
		limit: 10,
	})

	if (issues.length === 0) return 0

	let started = 0

	for (const issue of issues) {
		// Start one classify workspace at a time to avoid overwhelming
		if (started >= 1) break

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
			await api.startWorkspace({
				repos: [{
					repo_id: projectConfig.repo_id,
					target_branch: globalConfig.defaults.target_branch,
				}],
				linked_issue: {
					project_id: projectConfig.project_id,
					issue_id: issue.id,
				},
				executor_config: {
					executor,
					model_id: model,
					permission_policy: 'AUTO',
				},
				prompt,
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
