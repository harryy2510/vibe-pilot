import { writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { AutopilotConfig, DiscoveredProject, ProjectConfig } from './types'
import type { VkApi } from './api'
import { log } from './logger'


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

	// Cannot create statuses through local API — must be done in vibe-kanban UI
	log.warn('Triage status not found — create it in vibe-kanban UI', { projectId })
	return null
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

	const missing = requiredTags.filter(t => !tagMap.has(t.toLowerCase()))
	if (missing.length > 0) {
		// Cannot create tags through local API — must be done in vibe-kanban UI
		log.warn(`Missing tags — create in vibe-kanban UI: ${missing.join(', ')}`, { projectId })
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
