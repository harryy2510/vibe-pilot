import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import type { AutopilotConfig, DiscoveredProject, ProjectConfig } from './types'
import { log } from './logger'

export function discoverProjects(config: AutopilotConfig): DiscoveredProject[] {
	const { workspace } = config
	const projects: DiscoveredProject[] = []

	let entries: string[]
	try {
		entries = readdirSync(workspace)
	} catch {
		log.error('Cannot read workspace directory', { workspace })
		return []
	}

	for (const entry of entries) {
		const fullPath = join(workspace, entry)

		// Skip non-directories
		try {
			if (!statSync(fullPath).isDirectory()) continue
		} catch {
			continue
		}

		// Skip hidden directories
		if (entry.startsWith('.')) continue

		// Check for .git
		const hasGit = existsSync(join(fullPath, '.git'))
		if (!hasGit) continue

		// Check for vibe-kanban.json
		const vkConfigPath = join(fullPath, 'vibe-kanban.json')
		let projectConfig: ProjectConfig | null = null

		if (existsSync(vkConfigPath)) {
			try {
				const raw = readFileSync(vkConfigPath, 'utf-8')
				projectConfig = JSON.parse(raw) as ProjectConfig
			} catch (err) {
				log.warn('Invalid vibe-kanban.json', { path: vkConfigPath, error: String(err) })
			}
		}

		projects.push({
			path: fullPath,
			hasGit,
			config: projectConfig,
		})
	}

	log.info(`Discovered ${projects.length} git repos`, {
		configured: projects.filter((p) => p.config).length,
		unconfigured: projects.filter((p) => !p.config).length,
	})

	return projects
}

export function isConfigComplete(config: ProjectConfig | null): boolean {
	if (!config) return false
	return Boolean(config.org_id && config.project_id && config.repo_id)
}
