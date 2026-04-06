import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AutopilotConfig } from './types'

export function loadConfig(): AutopilotConfig {
	const configPath = process.env.AUTOPILOT_CONFIG ?? './autopilot.config.json'
	const resolved = resolve(configPath)

	let raw: string
	try {
		raw = readFileSync(resolved, 'utf-8')
	} catch {
		throw new Error(`Config not found at ${resolved}. Create autopilot.config.json or set AUTOPILOT_CONFIG env var.`)
	}

	const config = JSON.parse(raw) as AutopilotConfig

	// Validate required fields
	if (!config.workspace) throw new Error('Config missing "workspace"')
	if (!config.vk_api) throw new Error('Config missing "vk_api"')
	if (!config.org_id) throw new Error('Config missing "org_id"')
	if (!config.models?.high?.length) throw new Error('Config missing "models.high"')
	if (!config.models?.medium?.length) throw new Error('Config missing "models.medium"')
	if (!config.models?.low?.length) throw new Error('Config missing "models.low"')

	// Apply defaults
	config.scan_depth ??= 1
	config.interval ??= 60
	config.defaults ??= {} as AutopilotConfig['defaults']
	config.defaults.concurrency ??= 3
	config.defaults.stack_prs ??= true
	config.defaults.dev_script ??= 'bun vibe-dev'
	config.defaults.setup_script ??= 'bun vibe-setup'
	config.defaults.cleanup_script ??= 'bun vibe-cleanup'
	config.defaults.target_branch ??= 'main'
	config.defaults.copy_files ??= ['.env.keys']
	config.defaults.tags ??= [
		'migration', 'brainstorm', 'blocked', 'bug',
		'feature', 'enhancement', 'frontend', 'backend', 'setup',
	]

	return config
}
