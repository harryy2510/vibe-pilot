import { loadConfig } from './config'
import { VkApi } from './api'
import { runCycle } from './cycle'
import { log } from './logger'
import type { RoundRobinState } from './types'

async function main() {
	log.info('vibe-pilot starting')

	const config = loadConfig()
	const api = new VkApi(config.vk_api, config.vk_shared_api_base)

	log.info('Config loaded', {
		workspace: config.workspace,
		vk_api: config.vk_api,
		interval: config.interval,
	})

	// Round-robin state persists across cycles
	const rrState: RoundRobinState = { high: 0, medium: 0, low: 0 }

	// Run first cycle immediately
	await runCycle(config, api, rrState)

	// Then run every interval
	setInterval(async () => {
		try {
			await runCycle(config, api, rrState)
		} catch (err) {
			log.error('Cycle failed', { error: String(err) })
		}
	}, config.interval * 1000)

	log.info(`Autopilot running — cycle every ${config.interval}s`)
}

main().catch(err => {
	console.error('Fatal error:', err)
	process.exit(1)
})
