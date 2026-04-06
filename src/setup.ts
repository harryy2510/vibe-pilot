import { writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { AutopilotConfig, DiscoveredProject, ProjectConfig } from './types'
import type { VkApi } from './api'
import { log } from './logger'

const TAG_COLORS: Record<string, string> = {
	migration: '30 90% 50%',
	brainstorm: '270 70% 60%',
	blocked: '0 0% 50%',
	bug: '355 65% 53%',
	feature: '124 82% 30%',
	enhancement: '181 72% 78%',
	frontend: '210 80% 55%',
	backend: '45 80% 50%',
	setup: '200 60% 45%',
	'status-update': '160 70% 40%',
}

export async function setupProject(
	api: VkApi,
	project: DiscoveredProject,
	config: AutopilotConfig,
): Promise<ProjectConfig | null> {
	const projectName = basename(project.path)
	log.info(`Setting up project: ${projectName}`, { path: project.path })

	// Step 1: Find or create project in vibe-kanban
	const { projects } = await api.listProjects(config.org_id)
	let vkProject = projects.find(
		p => p.name.toLowerCase() === projectName.toLowerCase(),
	)

	if (!vkProject) {
		log.info(`Project "${projectName}" not found in vibe-kanban, skipping auto-create (create via UI)`)
		return null
	}

	// Step 2: Find or register repo
	const repos = await api.listRepos()
	let repo = repos.find(r => r.path === project.path)

	if (!repo) {
		log.info(`Registering repo: ${project.path}`)
		repo = await api.registerRepo({
			path: project.path,
			display_name: projectName,
		})
	}

	// Step 3: Update repo scripts
	await api.updateRepo(repo.id, {
		setup_script: config.defaults.setup_script,
		cleanup_script: config.defaults.cleanup_script,
		dev_server_script: config.defaults.dev_script,
	})

	// Step 4: Ensure Triage status exists
	await ensureTriageStatus(api, vkProject.id)

	// Step 5: Ensure standard tags exist
	await ensureStandardTags(api, vkProject.id, config.defaults.tags)

	// Step 6: Write vibe-kanban.json
	const projectConfig: ProjectConfig = {
		org_id: config.org_id,
		project_id: vkProject.id,
		repo_id: repo.id,
		concurrency: config.defaults.concurrency,
		stack_prs: config.defaults.stack_prs,
	}

	const vkConfigPath = join(project.path, 'vibe-kanban.json')
	writeFileSync(vkConfigPath, JSON.stringify(projectConfig, null, 2) + '\n')
	log.info(`Wrote vibe-kanban.json`, { path: vkConfigPath })

	return projectConfig
}

export async function ensureTriageStatus(api: VkApi, projectId: string): Promise<string | null> {
	const { project_statuses: statuses } = await api.listProjectStatuses(projectId)

	const triage = statuses.find(s => s.name.toLowerCase() === 'triage')
	if (triage) return triage.id

	// Insert Triage between Backlog and To Do via remote API
	const backlog = statuses.find(s => s.name.toLowerCase() === 'backlog')
	const todo = statuses.find(s => s.name.toLowerCase() === 'to do')

	let sortOrder: number
	if (backlog && todo) {
		sortOrder = (backlog.sort_order + todo.sort_order) / 2
	} else if (backlog) {
		sortOrder = backlog.sort_order + 1
	} else {
		sortOrder = 0.5
	}

	try {
		const result = await api.createProjectStatus({
			project_id: projectId,
			name: 'Triage',
			color: '45 85% 55%',
			sort_order: sortOrder,
		})
		log.info('Created Triage status', { projectId })
		return result.data.id
	} catch (err) {
		log.warn('Failed to create Triage status — create it in vibe-kanban UI', { projectId, error: String(err) })
		return null
	}
}

export async function ensureStandardTags(
	api: VkApi,
	projectId: string,
	requiredTags: string[],
): Promise<Map<string, string>> {
	const { tags: existing } = await api.listTags(projectId)
	const tagMap = new Map<string, string>()

	for (const tag of existing) {
		tagMap.set(tag.name.toLowerCase(), tag.id)
	}

	for (const tagName of requiredTags) {
		if (tagMap.has(tagName.toLowerCase())) continue

		const color = TAG_COLORS[tagName] ?? '0 0% 60%'
		try {
			const result = await api.createTag({
				project_id: projectId,
				name: tagName,
				color,
			})
			tagMap.set(tagName.toLowerCase(), result.data.id)
			log.info(`Created tag: ${tagName}`, { projectId })
		} catch (err) {
			log.warn(`Failed to create tag: ${tagName}`, { projectId, error: String(err) })
		}
	}

	return tagMap
}

export async function fixIncompleteConfig(
	api: VkApi,
	project: DiscoveredProject,
	config: AutopilotConfig,
): Promise<ProjectConfig | null> {
	const existing = project.config
	if (!existing) return setupProject(api, project, config)

	let needsWrite = false
	const updated = { ...existing }

	// Check required fields
	if (!updated.org_id) {
		updated.org_id = config.org_id
		needsWrite = true
	}

	if (!updated.project_id || !updated.repo_id) {
		// Need to look up project and repo
		const result = await setupProject(api, project, config)
		return result
	}

	// Ensure defaults are present
	if (updated.concurrency === undefined) {
		updated.concurrency = config.defaults.concurrency
		needsWrite = true
	}
	if (updated.stack_prs === undefined) {
		updated.stack_prs = config.defaults.stack_prs
		needsWrite = true
	}

	if (needsWrite) {
		const vkConfigPath = join(project.path, 'vibe-kanban.json')
		writeFileSync(vkConfigPath, JSON.stringify(updated, null, 2) + '\n')
		log.info('Fixed incomplete vibe-kanban.json', { path: vkConfigPath })
	}

	// Still ensure tags and triage status exist
	await ensureTriageStatus(api, updated.project_id)
	await ensureStandardTags(api, updated.project_id, config.defaults.tags)

	return updated
}
