import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { kebabCase } from 'es-toolkit/string'
import type { AutopilotConfig, DiscoveredProject, ProjectConfig, ProjectStatus } from './types'
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

// Distinct project colors — cycles through these based on project index
const PROJECT_COLORS = [
	'355 65% 53%',  // red
	'25 85% 55%',   // orange
	'45 85% 50%',   // amber
	'142 60% 40%',  // green
	'195 80% 45%',  // cyan
	'210 80% 55%',  // blue
	'265 65% 55%',  // purple
	'320 65% 55%',  // pink
	'175 65% 40%',  // teal
	'15 75% 50%',   // burnt orange
]

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
		p => kebabCase(p.name) === kebabCase(projectName),
	)

	if (!vkProject) {
		const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!
		log.info(`Creating project "${projectName}" in vibe-kanban`)
		try {
			const result = await api.createProject({
				organization_id: config.org_id,
				name: projectName,
				color,
			})
			vkProject = result.data
			log.info(`Created project: ${vkProject.name}`, { id: vkProject.id })
		} catch (err) {
			log.error(`Failed to create project "${projectName}"`, { error: String(err) })
			return null
		}
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

	// Step 3: Ensure vibe scripts exist in target repo's package.json
	ensureVibeScripts(project.path, config)

	// Step 4: Update repo scripts and settings
	await api.updateRepo(repo.id, {
		setup_script: config.defaults.setup_script,
		cleanup_script: config.defaults.cleanup_script,
		dev_server_script: config.defaults.dev_script,
		copy_files: config.defaults.copy_files.join(','),
		default_target_branch: config.defaults.target_branch,
	})

	// Step 5: Link repo as default for this project
	await api.setProjectDefaultRepos(vkProject.id, [
		{ repo_id: repo.id, target_branch: config.defaults.target_branch },
	]).catch(err => {
		log.warn('Could not set default repo for project', { error: String(err) })
	})

	// Step 6: Ensure Backlog is visible and Triage status exists
	await ensureBacklogVisible(api, vkProject.id)
	await ensureTriageStatus(api, vkProject.id)

	// Step 7: Ensure standard tags exist
	await ensureStandardTags(api, vkProject.id, config.defaults.tags)

	// Step 8: Write vibe-kanban.json
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

export async function ensureBacklogVisible(api: VkApi, projectId: string): Promise<void> {
	const { project_statuses: statuses } = await api.listProjectStatuses(projectId)
	const backlog = statuses.find(s => s.name.toLowerCase() === 'backlog')
	if (!backlog) return

	// ProjectStatus type doesn't have `hidden` but the API returns it
	const raw = backlog as ProjectStatus & { hidden?: boolean }
	if (raw.hidden === true) {
		try {
			await api.bulkUpdateProjectStatuses([{ id: backlog.id, hidden: false }])
			log.info('Enabled Backlog status', { projectId })
		} catch (err) {
			log.warn('Could not enable Backlog status', { projectId, error: String(err) })
		}
	}
}

export function ensureVibeScripts(repoPath: string, config: AutopilotConfig): void {
	const pkgPath = join(repoPath, 'package.json')
	if (!existsSync(pkgPath)) return

	try {
		const raw = readFileSync(pkgPath, 'utf-8')
		const pkg = JSON.parse(raw) as { scripts?: Record<string, string> }
		pkg.scripts ??= {}

		// Extract script names from config (e.g. "bun vibe-dev" → "vibe-dev")
		const scriptNames = [
			config.defaults.dev_script,
			config.defaults.setup_script,
			config.defaults.cleanup_script,
		].map(s => s.replace(/^bun\s+/, '').replace(/^bun\s+run\s+/, ''))

		let changed = false
		for (const name of scriptNames) {
			if (!pkg.scripts[name]) {
				pkg.scripts[name] = 'echo "no-op"'
				changed = true
			}
		}

		if (changed) {
			writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
			log.info('Added vibe scripts to package.json', { path: pkgPath })
		}
	} catch (err) {
		log.warn('Could not update package.json with vibe scripts', { path: pkgPath, error: String(err) })
	}
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
		sortOrder = Math.round((backlog.sort_order + todo.sort_order) / 2)
	} else if (backlog) {
		sortOrder = backlog.sort_order + 1
	} else {
		sortOrder = 1
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

	// Ensure vibe scripts exist in repo
	ensureVibeScripts(project.path, config)

	// Ensure backlog visible, triage status, tags
	await ensureBacklogVisible(api, updated.project_id)
	await ensureTriageStatus(api, updated.project_id)
	await ensureStandardTags(api, updated.project_id, config.defaults.tags)

	return updated
}
