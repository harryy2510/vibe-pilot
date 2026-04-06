import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import type { AutopilotConfig, DiscoveredProject, ProjectConfig } from './types'
import { log } from './logger'

export function discoverProjects(config: AutopilotConfig): DiscoveredProject[] {
	const { workspace, scan_depth = 2 } = config
	const projects: DiscoveredProject[] = []

	function scan(dir: string, depth: number): void {
		if (depth <= 0) return

		let entries: string[]
		try {
			entries = readdirSync(dir)
		} catch {
			if (depth === scan_depth) {
				log.error('Cannot read workspace directory', { workspace: dir })
			}
			return
		}

		for (const entry of entries) {
			const fullPath = join(dir, entry)

			// Skip non-directories
			try {
				if (!statSync(fullPath).isDirectory()) continue
			} catch {
				continue
			}

			// Skip hidden directories
			if (entry.startsWith('.')) continue

			// Check for .git — if found, it's a project
			if (existsSync(join(fullPath, '.git'))) {
				let projectConfig: ProjectConfig | null = null
				const vkConfigPath = join(fullPath, 'vibe-kanban.json')

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
					hasGit: true,
					config: projectConfig,
				})
				continue
			}

			// Not a git repo — recurse deeper
			scan(fullPath, depth - 1)
		}
	}

	scan(workspace, scan_depth)

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
