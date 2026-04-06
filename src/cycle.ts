import type { AutopilotConfig, RoundRobinState } from './types'
import type { VkApi } from './api'
import { log } from './logger'
import { discoverProjects, isConfigComplete } from './discover'
import { fixIncompleteConfig } from './setup'
import { classifyBacklogTasks } from './classifier'
import { pickAndStartTasks, startTriageWorkspaces } from './picker'
import { checkAndCreateReportTasks } from './reporter'

export async function runCycle(
	config: AutopilotConfig,
	api: VkApi,
	rrState: RoundRobinState,
): Promise<void> {
	log.cycle('Cycle start')

	// Step 0: Health check
	const healthy = await api.isHealthy()
	if (!healthy) {
		log.warn('Vibe-kanban API is not reachable, skipping cycle')
		return
	}

	// Step 1: Discover projects
	const projects = discoverProjects(config)
	if (projects.length === 0) {
		log.info('No projects found in workspace')
		return
	}

	// Step 2: Process each project
	for (const project of projects) {
		const projectName = project.path.split('/').pop() ?? project.path

		try {
			// Setup or fix config
			let projectConfig = project.config
			if (!isConfigComplete(projectConfig)) {
				projectConfig = await fixIncompleteConfig(api, project, config)
			}
			if (!projectConfig) {
				log.info(`Skipping ${projectName} — not set up in vibe-kanban`)
				continue
			}

			// Build status map for this project
			const { project_statuses: statuses } = await api.listProjectStatuses(projectConfig.project_id)
			const statusMap = new Map<string, string>()
			for (const s of statuses) {
				statusMap.set(s.name.toLowerCase(), s.id)
			}

			// Build tag map
			const { tags } = await api.listTags(projectConfig.project_id)
			const tagMap = new Map<string, string>()
			for (const t of tags) {
				tagMap.set(t.name.toLowerCase(), t.id)
			}

			// Step 3: Classify backlog tasks
			const classified = await classifyBacklogTasks(
				api, projectConfig, config, rrState, statusMap,
			)

			// Step 4: Start triage workspaces
			const triaged = await startTriageWorkspaces(
				api, projectConfig, config, rrState, statusMap,
			)

			// Step 5: Saturday — check for weekly status reports
			const reports = await checkAndCreateReportTasks(
				api, projectConfig, config, rrState, statusMap, tagMap, project.path,
			)

			// Step 6: Pick and start implementation tasks
			const started = await pickAndStartTasks(
				api, projectConfig, config, rrState, statusMap, tagMap,
			)

			// Report only if something happened
			if (classified + triaged + started + reports > 0) {
				log.info(`${projectName}: classified=${classified} triaged=${triaged} started=${started} reports=${reports}`)
			}
		} catch (err) {
			log.error(`Error processing ${projectName}`, { error: String(err) })
		}
	}

	log.cycle('Cycle end')
}
