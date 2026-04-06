import type {
	AutopilotConfig,
	AutopilotMeta,
	ModelPools,
	ProjectConfig,
	RoundRobinState,
} from './types'
import type { VkApi } from './api'
import { log } from './logger'

// ── Round-robin pool picker ──

export function pickFromPool(
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

// ── Parse autopilot metadata from task description ──

export function parseAutopilotMeta(description: string | null): AutopilotMeta | null {
	if (!description) return null

	const match = description.match(/<!--\s*autopilot\s+([\s\S]*?)-->/)
	if (!match?.[1]) return null

	const block = match[1]
	const tierMatch = block.match(/tier:\s*(low|medium|high)/)
	const agentMatch = block.match(/agent:\s*(.+)/)

	if (!tierMatch?.[1]) return null

	return {
		tier: tierMatch[1] as 'low' | 'medium' | 'high',
		agent: agentMatch?.[1]?.trim() ?? 'Senior Developer',
	}
}

// ── Check if a task is blocked ──

async function isTaskBlocked(
	api: VkApi,
	issueId: string,
	stackPrs: boolean,
	statusMap: Map<string, string>,
): Promise<{ blocked: boolean; baseBranch: string | null }> {
	const { issue_relationships: rels } = await api.listIssueRelationships(issueId)

	// Find blocking relationships where this task is the blocked one
	const blockers = rels.filter(
		r => r.relationship_type === 'blocking' && r.related_issue_id === issueId,
	)

	if (blockers.length === 0) return { blocked: false, baseBranch: null }

	const doneStatusId = statusMap.get('done')
	const inReviewStatusId = statusMap.get('in review')

	for (const blocker of blockers) {
		const blockerIssue = await api.getIssue(blocker.issue_id)

		if (stackPrs) {
			// With stacking: blocked if blocker is not at least In Progress
			const inProgressId = statusMap.get('in progress')
			const allowedStatuses = [inProgressId, inReviewStatusId, doneStatusId].filter(Boolean)

			if (!allowedStatuses.includes(blockerIssue.status_id)) {
				return { blocked: true, baseBranch: null }
			}

			// If blocker is in progress or in review, find its branch for stacking
			if (blockerIssue.status_id !== doneStatusId) {
				const branch = await findWorkspaceBranch(api, blocker.issue_id)
				if (branch) return { blocked: false, baseBranch: branch }
			}
		} else {
			// Without stacking: blocked if blocker is not Done (merged)
			if (blockerIssue.status_id !== doneStatusId) {
				return { blocked: true, baseBranch: null }
			}
		}
	}

	return { blocked: false, baseBranch: null }
}

// ── Find workspace branch for stacking ──

async function findWorkspaceBranch(_api: VkApi, _issueId: string): Promise<string | null> {
	// TODO: vibe-kanban API needs a way to find workspace by linked issue
	// For now, return null — stacked tasks will use the default branch
	// This will be implemented once we discover the right API endpoint
	return null
}

// ── Check migration constraints ──

async function hasMigrationInFlight(
	api: VkApi,
	projectConfig: ProjectConfig,
	statusMap: Map<string, string>,
	tagMap: Map<string, string>,
	_stackPrs: boolean,
): Promise<{ inFlight: boolean; branch: string | null }> {
	const migrationTagId = tagMap.get('migration')
	if (!migrationTagId) return { inFlight: false, branch: null }

	const inProgressId = statusMap.get('in progress')
	const inReviewId = statusMap.get('in review')

	const statusIds = [inProgressId, inReviewId].filter(Boolean) as string[]

	for (const statusId of statusIds) {
		const { issues } = await api.searchIssues({
			project_id: projectConfig.project_id,
			status_id: statusId,
			tag_id: migrationTagId,
			limit: 5,
		})

		if (issues.length > 0) {
			return { inFlight: true, branch: null }
		}
	}

	return { inFlight: false, branch: null }
}

// ── Main picker ──

export async function pickAndStartTasks(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
	tagMap: Map<string, string>,
): Promise<number> {
	const concurrency = projectConfig.concurrency ?? globalConfig.defaults.concurrency
	const stackPrs = projectConfig.stack_prs ?? globalConfig.defaults.stack_prs

	// Count active slots (In Progress only)
	const inProgressId = statusMap.get('in progress')
	if (!inProgressId) return 0

	const { total_count: activeCount } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: inProgressId,
		limit: 1,
	})

	const openSlots = concurrency - activeCount
	if (openSlots <= 0) {
		log.info('All slots full', { active: activeCount, concurrency })
		return 0
	}

	// Get To Do tasks in board order
	const todoId = statusMap.get('to do')
	if (!todoId) return 0

	const { issues: todoTasks } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: todoId,
		sort_field: 'sort_order',
		sort_direction: 'Asc',
		limit: 20,
	})

	if (todoTasks.length === 0) return 0

	// Check migration state once
	const migrationState = await hasMigrationInFlight(
		api, projectConfig, statusMap, tagMap, stackPrs,
	)

	const blockedTagId = tagMap.get('blocked')
	const migrationTagId = tagMap.get('migration')
	let started = 0

	for (const task of todoTasks) {
		if (started >= openSlots) break

		// Skip blocked-tagged tasks
		if (blockedTagId) {
			const { issue_tags } = await api.listIssueTags(task.id)
			const hasBlockedTag = issue_tags.some(it => it.tag_id === blockedTagId)
			if (hasBlockedTag) {
				log.info(`Skipping blocked task: ${task.title}`)
				continue
			}

			// Check if this is a migration task
			const isMigration = issue_tags.some(it => it.tag_id === migrationTagId)
			if (isMigration && migrationState.inFlight && !stackPrs) {
				log.info(`Skipping migration task (migration in flight, stacking disabled): ${task.title}`)
				continue
			}
		}

		// Check blocked_by relationships
		const { blocked, baseBranch } = await isTaskBlocked(api, task.id, stackPrs, statusMap)
		if (blocked) {
			log.info(`Skipping task with unresolved dependencies: ${task.title}`)
			continue
		}

		// Parse autopilot metadata from description
		const meta = parseAutopilotMeta(task.description)
		const tier = meta?.tier ?? 'medium'
		const agent = meta?.agent ?? 'Senior Developer'

		const { executor, model } = pickFromPool(globalConfig.models, tier, rrState)
		const targetBranch = baseBranch ?? globalConfig.defaults.target_branch

		log.info(`Starting task: ${task.title}`, {
			tier,
			agent,
			executor,
			model,
			targetBranch,
			stacked: baseBranch !== null,
		})

		const prompt = `You are the ${agent}. Follow the implement skill.

Task: ${task.title}
${task.description ? `\nDescription:\n${task.description}` : ''}

Issue ID: ${task.id}
Project ID: ${projectConfig.project_id}
Target Branch: ${targetBranch}`

		try {
			await api.startWorkspace({
				name: task.title,
				repos: [{
					repo_id: projectConfig.repo_id,
					target_branch: targetBranch,
				}],
				linked_issue: {
					project_id: projectConfig.project_id,
					issue_id: task.id,
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
			log.error(`Failed to start workspace for "${task.title}"`, {
				error: String(err),
			})
		}
	}

	return started
}

// ── Triage starter ──

export async function startTriageWorkspaces(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
): Promise<number> {
	const triageId = statusMap.get('triage')
	if (!triageId) return 0

	const { issues: triageTasks } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: triageId,
		sort_field: 'sort_order',
		sort_direction: 'Asc',
		limit: 10,
	})

	if (triageTasks.length === 0) return 0

	let started = 0

	for (const task of triageTasks) {
		if (started >= 1) break

		const { executor, model } = pickFromPool(globalConfig.models, 'high', rrState)

		log.info(`Starting triage workspace: ${task.title}`, {
			executor,
			model,
		})

		const prompt = `You are triaging a task. Follow the triage skill.

Task: ${task.title}
${task.description ? `\nDescription:\n${task.description}` : ''}

Issue ID: ${task.id}
Project ID: ${projectConfig.project_id}`

		try {
			await api.startWorkspace({
				name: `Triage: ${task.title}`,
				repos: [{
					repo_id: projectConfig.repo_id,
					target_branch: globalConfig.defaults.target_branch,
				}],
				linked_issue: {
					project_id: projectConfig.project_id,
					issue_id: task.id,
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
			log.error(`Failed to start triage workspace for "${task.title}"`, {
				error: String(err),
			})
		}
	}

	return started
}
