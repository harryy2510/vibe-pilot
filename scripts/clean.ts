/**
 * Clean all autopilot-created resources from vibe-kanban.
 * Run: bun run scripts/clean.ts
 *
 * Deletes all projects, repos, and workspaces in the org.
 * Also removes vibe-kanban.json from discovered repos.
 */

import { readFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AutopilotConfig } from '../src/types'
import { discoverProjects } from '../src/discover'

const configPath = process.env.AUTOPILOT_CONFIG ?? './autopilot.config.json'
const config = JSON.parse(readFileSync(resolve(configPath), 'utf-8')) as AutopilotConfig
config.scan_depth ??= 2

const LOCAL = config.vk_api
const REMOTE = config.vk_shared_api_base

let authToken = ''

async function getToken(): Promise<string> {
	if (authToken) return authToken
	const res = await fetch(`${LOCAL}/api/auth/token`)
	const json = (await res.json()) as { data: { access_token: string } }
	authToken = json.data.access_token
	return authToken
}

async function localReq<T>(method: string, path: string, body?: unknown): Promise<T> {
	const res = await fetch(`${LOCAL}${path}`, {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	})
	const text = await res.text()
	if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`)
	if (!text) return null as T
	const json = JSON.parse(text)
	return ('success' in json && 'data' in json) ? json.data as T : json as T
}

async function remoteReq<T>(method: string, path: string, body?: unknown): Promise<T> {
	const token = await getToken()
	const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
	if (body) headers['Content-Type'] = 'application/json'
	const res = await fetch(`${REMOTE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
	const text = await res.text()
	if (!res.ok) throw new Error(`REMOTE ${method} ${path} → ${res.status}: ${text}`)
	if (!text) return null as T
	return JSON.parse(text) as T
}

async function main() {
	console.log('\n━━━ vibe-pilot clean ━━━\n')

	// 1. Stop and delete all workspaces
	console.log('1. Cleaning workspaces...')
	const workspaces = await localReq<Array<{ id: string; name: string | null; archived: boolean }>>('GET', '/api/workspaces')
	for (const w of workspaces) {
		console.log(`  Deleting workspace: ${w.name ?? w.id}`)
		await localReq('POST', `/api/workspaces/${w.id}/execution/stop`).catch(() => {})
		await localReq('DELETE', `/api/workspaces/${w.id}?delete_branches=true`).catch(() => {})
	}
	console.log(`  ${workspaces.length} workspaces deleted`)

	// 2. Delete all repos
	console.log('\n2. Cleaning repos...')
	const repos = await localReq<Array<{ id: string; path: string; display_name: string | null }>>('GET', '/api/repos')
	for (const r of repos) {
		console.log(`  Deleting repo: ${r.display_name ?? r.path}`)
		await localReq('DELETE', `/api/repos/${r.id}`).catch(() => {})
	}
	console.log(`  ${repos.length} repos deleted`)

	// 3. Delete all projects in the org
	console.log('\n3. Cleaning projects...')
	const { projects } = await localReq<{ projects: Array<{ id: string; name: string }> }>('GET', `/api/remote/projects?organization_id=${config.org_id}`)
	for (const p of projects) {
		console.log(`  Deleting project: ${p.name}`)
		await remoteReq('DELETE', `/v1/projects/${p.id}`).catch(() => {})
	}
	console.log(`  ${projects.length} projects deleted`)

	// 4. Remove vibe-kanban.json from all discovered repos
	console.log('\n4. Cleaning vibe-kanban.json files...')
	const discovered = discoverProjects(config)
	let cleaned = 0
	for (const d of discovered) {
		if (d.config) {
			const vkPath = `${d.path}/vibe-kanban.json`
			try {
				unlinkSync(vkPath)
				console.log(`  Removed: ${vkPath}`)
				cleaned++
			} catch {}
		}
	}
	console.log(`  ${cleaned} config files removed`)

	console.log('\n━━━ Clean complete ━━━\n')
	console.log('Restart the autopilot to re-discover and set up all projects fresh.')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
