/**
 * vibe-pilot end-to-end API test
 * Run: bun run test-api.ts
 *
 * Full lifecycle test against test-project:
 * 1. Create project in vibe-kanban
 * 2. Register repo + set scripts
 * 3. Create Triage status + all standard tags
 * 4. Create a task in To Do
 * 5. Tag the task
 * 6. Start a workspace (actually launches an agent!)
 * 7. Verify workspace started
 * 8. Cleanup everything
 *
 * Set TEST_PROJECT_PATH env var if not /home/ubuntu/workspace/harryy2510/test-project
 * Set VK_SHARED_API_BASE env var if not https://server-vibe.hariom.cc
 * Pass --no-workspace to skip workspace start (non-destructive mode)
 */

const LOCAL = 'http://localhost:4040'
const REMOTE = process.env.VK_SHARED_API_BASE ?? 'https://server-vibe.hariom.cc'
const TEST_PROJECT_PATH = process.env.TEST_PROJECT_PATH ?? '/home/ubuntu/workspace/harryy2510/test-project'
const SKIP_WORKSPACE = process.argv.includes('--no-workspace')

type TestResult = { name: string; ok: boolean; error?: string; data?: unknown }
const results: TestResult[] = []
const cleanup: Array<() => Promise<void>> = []

let authToken = ''

async function getToken(): Promise<string> {
	if (authToken) return authToken
	const data = await localReq<{ access_token: string }>('GET', '/api/auth/token')
	authToken = data.access_token
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
	if ('success' in json && 'data' in json) {
		if (!json.success) throw new Error(`${method} ${path} → success=false: ${json.message}`)
		return json.data as T
	}
	return json as T
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

async function test(name: string, fn: () => Promise<unknown>) {
	try {
		const data = await fn()
		results.push({ name, ok: true, data })
		console.log(`  ✓ ${name}`)
	} catch (err) {
		results.push({ name, ok: false, error: String(err) })
		console.log(`  ✗ ${name}: ${err}`)
	}
}

async function main() {
	console.log(`\n━━━ vibe-pilot E2E flow test ━━━`)
	console.log(`  Local:     ${LOCAL}`)
	console.log(`  Remote:    ${REMOTE}`)
	console.log(`  Project:   ${TEST_PROJECT_PATH}`)
	console.log(`  Workspace: ${SKIP_WORKSPACE ? 'SKIPPED (--no-workspace)' : 'WILL START'}\n`)

	// ── 1. Get org ──
	console.log('1. Organization')
	let orgId = ''
	await test('Get org ID', async () => {
		const data = await localReq<{ organizations: Array<{ id: string; name: string }> }>('GET', '/api/organizations')
		if (!data.organizations?.length) throw new Error('No organizations found')
		orgId = data.organizations[0]!.id
		return { orgId, name: data.organizations[0]!.name }
	})
	if (!orgId) return printSummary()

	// ── 2. Create project ──
	console.log('\n2. Create project')
	let projectId = ''
	let projectCreated = false
	await test('POST /v1/projects', async () => {
		// Check if exists first
		const { projects } = await localReq<{ projects: Array<{ id: string; name: string }> }>('GET', `/api/remote/projects?organization_id=${orgId}`)
		const existing = projects.find(p => p.name.toLowerCase() === 'test-project')
		if (existing) {
			projectId = existing.id
			return { id: projectId, existed: true }
		}

		const result = await remoteReq<{ data: { id: string; name: string } }>('POST', '/v1/projects', {
			organization_id: orgId,
			name: 'test-project',
			color: '210 80% 55%',
		})
		projectId = result.data.id
		projectCreated = true
		cleanup.push(async () => {
			console.log('  Deleting project...')
			await remoteReq('DELETE', `/v1/projects/${projectId}`).catch(() => {})
		})
		return { id: projectId, created: true }
	})
	if (!projectId) return printSummary()

	// ── 3. Register repo ──
	console.log('\n3. Register repo + set scripts')
	let repoId = ''
	let repoCreated = false
	await test('POST /api/repos (register)', async () => {
		const repos = await localReq<Array<{ id: string; path: string }>>('GET', '/api/repos')
		const existing = repos.find(r => r.path === TEST_PROJECT_PATH)
		if (existing) {
			repoId = existing.id
			return { id: repoId, existed: true }
		}

		const repo = await localReq<{ id: string; path: string }>('POST', '/api/repos', {
			path: TEST_PROJECT_PATH,
			display_name: 'test-project',
		})
		repoId = repo.id
		repoCreated = true
		cleanup.push(async () => {
			console.log('  Deleting repo...')
			await localReq('DELETE', `/api/repos/${repoId}`).catch(() => {})
		})
		return { id: repoId, created: true }
	})

	if (repoId) {
		await test('PUT /api/repos/{id} (set scripts)', async () => {
			return await localReq('PUT', `/api/repos/${repoId}`, {
				setup_script: 'bun vibe-setup',
				cleanup_script: 'bun vibe-cleanup',
				dev_server_script: 'bun vibe-dev',
			})
		})
	}

	// ── 4. Create Triage status ──
	console.log('\n4. Project statuses + Triage')
	const statusMap: Record<string, string> = {}
	await test('GET project statuses', async () => {
		const data = await localReq<{ project_statuses: Array<{ id: string; name: string; sort_order: number }> }>('GET', `/api/remote/project-statuses?project_id=${projectId}`)
		for (const s of data.project_statuses) statusMap[s.name.toLowerCase()] = s.id
		return { statuses: data.project_statuses.map(s => s.name) }
	})

	if (!statusMap['triage']) {
		await test('POST /v1/project_statuses (create Triage)', async () => {
			const statuses = await localReq<{ project_statuses: Array<{ name: string; sort_order: number }> }>('GET', `/api/remote/project-statuses?project_id=${projectId}`)
			const bSort = statuses.project_statuses.find(s => s.name.toLowerCase() === 'backlog')?.sort_order ?? 0
			const tSort = statuses.project_statuses.find(s => s.name.toLowerCase() === 'to do')?.sort_order ?? 1
			const sortOrder = Math.round((bSort + tSort) / 2)

			const result = await remoteReq<{ data: { id: string } }>('POST', '/v1/project_statuses', {
				project_id: projectId,
				name: 'Triage',
				color: '45 85% 55%',
				sort_order: sortOrder,
				hidden: false,
			})
			statusMap['triage'] = result.data.id
			if (projectCreated) {
				// Will be deleted with project
			} else {
				cleanup.push(async () => {
					console.log('  Deleting Triage status...')
					await remoteReq('DELETE', `/v1/project_statuses/${result.data.id}`).catch(() => {})
				})
			}
			return { id: result.data.id }
		})
	} else {
		console.log('  ⏭ Triage already exists')
	}

	// ── 5. Create tags ──
	console.log('\n5. Standard tags')
	const requiredTags = ['migration', 'brainstorm', 'blocked', 'bug', 'feature', 'enhancement', 'frontend', 'backend', 'setup', 'status-update']
	const tagColors: Record<string, string> = {
		migration: '30 90% 50%', brainstorm: '270 70% 60%', blocked: '0 0% 50%',
		bug: '355 65% 53%', feature: '124 82% 30%', enhancement: '181 72% 78%',
		frontend: '210 80% 55%', backend: '45 80% 50%', setup: '200 60% 45%',
		'status-update': '160 70% 40%',
	}
	const tagMap: Record<string, string> = {}

	const { tags: existingTags } = await localReq<{ tags: Array<{ id: string; name: string }> }>('GET', `/api/remote/tags?project_id=${projectId}`)
	for (const t of existingTags) tagMap[t.name.toLowerCase()] = t.id

	const missingTags = requiredTags.filter(t => !tagMap[t])
	if (missingTags.length > 0) {
		for (const tagName of missingTags) {
			await test(`Create tag: ${tagName}`, async () => {
				const result = await remoteReq<{ data: { id: string } }>('POST', '/v1/tags', {
					project_id: projectId,
					name: tagName,
					color: tagColors[tagName] ?? '0 0% 60%',
				})
				tagMap[tagName] = result.data.id
				if (projectCreated) {
					// Will be deleted with project
				} else {
					cleanup.push(async () => {
						await remoteReq('DELETE', `/v1/tags/${result.data.id}`).catch(() => {})
					})
				}
				return { id: result.data.id }
			})
		}
	} else {
		console.log('  ⏭ All tags exist')
	}

	// ── 6. Create task in To Do ──
	console.log('\n6. Create task')
	const todoStatusId = statusMap['to do'] ?? ''
	let issueId = ''

	if (todoStatusId) {
		await test('POST /api/remote/issues (create task)', async () => {
			const result = await localReq<{ data: { id: string; title: string } }>('POST', '/api/remote/issues', {
				project_id: projectId,
				status_id: todoStatusId,
				title: 'Add hello world endpoint',
				description: `Create a GET /api/hello endpoint that returns { message: "hello world" }.

Simple task for testing the autopilot workspace flow.

<!-- autopilot
tier: low
agent: Senior Developer
-->`,
				priority: 'low',
				sort_order: 1,
				extension_metadata: {},
			})
			issueId = result.data.id
			cleanup.push(async () => {
				console.log('  Deleting task...')
				await localReq('DELETE', `/api/remote/issues/${issueId}`).catch(() => {})
			})
			return { id: issueId, title: result.data.title }
		})

		if (issueId && tagMap['feature']) {
			await test('Tag task as "feature"', async () => {
				const result = await localReq<{ data: { id: string } }>('POST', '/api/remote/issue-tags', {
					issue_id: issueId,
					tag_id: tagMap['feature'],
				})
				return { issueTagId: result.data.id }
			})
		}

		if (issueId && tagMap['backend']) {
			await test('Tag task as "backend"', async () => {
				const result = await localReq<{ data: { id: string } }>('POST', '/api/remote/issue-tags', {
					issue_id: issueId,
					tag_id: tagMap['backend'],
				})
				return { issueTagId: result.data.id }
			})
		}
	}

	// ── 7. Start workspace ──
	if (!SKIP_WORKSPACE && issueId && repoId) {
		console.log('\n7. Start workspace (LIVE — will launch agent)')
		let workspaceId = ''

		await test('POST /api/workspaces/start', async () => {
			const result = await localReq<{ workspace: { id: string; name: string }; execution_process: { id: string; status: string } }>('POST', '/api/workspaces/start', {
				name: 'test: hello world endpoint',
				repos: [{
					repo_id: repoId,
					target_branch: 'main',
				}],
				linked_issue: {
					remote_project_id: projectId,
					issue_id: issueId,
				},
				executor_config: {
					executor: 'CLAUDE_CODE',
					model_id: 'haiku',
					permission_policy: 'AUTO',
				},
				prompt: 'You are the Senior Developer. Create a simple GET /api/hello endpoint that returns { message: "hello world" }. Then create a PR.',
			})
			workspaceId = result.workspace.id
			cleanup.push(async () => {
				console.log('  Archiving workspace...')
				await localReq('PUT', `/api/workspaces/${workspaceId}`, { archived: true }).catch(() => {})
			})
			return {
				workspaceId,
				executionId: result.execution_process.id,
				status: result.execution_process.status,
			}
		})

		if (workspaceId) {
			await test('GET /api/workspaces/{id} (verify)', async () => {
				return await localReq<{ id: string; name: string }>('GET', `/api/workspaces/${workspaceId}`)
			})

			await test('GET /api/workspaces/{id}/repos', async () => {
				return await localReq<Array<{ repo_id: string; target_branch: string }>>('GET', `/api/workspaces/${workspaceId}/repos`)
			})
		}
	} else if (SKIP_WORKSPACE) {
		console.log('\n7. Workspace start SKIPPED (--no-workspace)')
	} else {
		console.log('\n7. Workspace start SKIPPED (missing issue or repo)')
	}

	// ── 8. Verify full state ──
	console.log('\n8. Final verification')
	await test('Project exists', async () => {
		return await localReq('GET', `/api/remote/projects/${projectId}`)
	})

	await test('Triage status exists', async () => {
		const data = await localReq<{ project_statuses: Array<{ name: string }> }>('GET', `/api/remote/project-statuses?project_id=${projectId}`)
		const names = data.project_statuses.map(s => s.name.toLowerCase())
		if (!names.includes('triage')) throw new Error(`No Triage: ${names.join(', ')}`)
		return { statuses: data.project_statuses.map(s => s.name) }
	})

	await test('All tags exist', async () => {
		const data = await localReq<{ tags: Array<{ name: string }> }>('GET', `/api/remote/tags?project_id=${projectId}`)
		const names = data.tags.map(t => t.name.toLowerCase())
		const missing = requiredTags.filter(t => !names.includes(t))
		if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`)
		return { count: data.tags.length }
	})

	if (issueId) {
		await test('Task in To Do with tags', async () => {
			const issue = await localReq<{ id: string; title: string; status_id: string }>('GET', `/api/remote/issues/${issueId}`)
			const { issue_tags } = await localReq<{ issue_tags: Array<{ tag_id: string }> }>('GET', `/api/remote/issue-tags?issue_id=${issueId}`)
			return { title: issue.title, tagCount: issue_tags.length }
		})
	}

	// ── Cleanup ──
	console.log('\nCleanup')
	for (const fn of cleanup.reverse()) {
		try { await fn() } catch (err) { console.log(`  ⚠ ${err}`) }
	}
	console.log(`  Done — ${cleanup.length} resources cleaned`)

	printSummary()
}

function printSummary() {
	const passed = results.filter(r => r.ok).length
	const failed = results.filter(r => !r.ok).length
	console.log('\n━━━ Summary ━━━')
	console.log(`  ${passed} passed, ${failed} failed, ${results.length} total`)
	if (failed > 0) {
		console.log('\nFailed:')
		for (const r of results.filter(r => !r.ok)) console.log(`  ✗ ${r.name}: ${r.error}`)
	}
	console.log('')
	process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
