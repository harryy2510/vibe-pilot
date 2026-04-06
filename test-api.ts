/**
 * vibe-pilot API smoke test
 * Run: bun run test-api.ts
 *
 * Tests every API call used by the autopilot against:
 * - Local API: localhost:4040
 * - Remote API: VK_SHARED_API_BASE (for tag/status mutations)
 */

const LOCAL = 'http://localhost:4040'
const REMOTE = process.env.VK_SHARED_API_BASE ?? 'https://server-vibe.hariom.cc'

type TestResult = { name: string; ok: boolean; error?: string; data?: unknown }
const results: TestResult[] = []
const cleanup: Array<() => Promise<void>> = []

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
		if (!json.success) throw new Error(`${method} ${path} → success=false: ${json.message ?? JSON.stringify(json)}`)
		return json.data as T
	}
	return json as T
}

let authToken = ''

async function getToken(): Promise<string> {
	if (authToken) return authToken
	const data = await localReq<{ access_token: string }>('GET', '/api/auth/token')
	authToken = data.access_token
	return authToken
}

async function remoteReq<T>(method: string, path: string, body?: unknown): Promise<T> {
	const token = await getToken()
	const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
	if (body) headers['Content-Type'] = 'application/json'

	const res = await fetch(`${REMOTE}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	})
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
	console.log(`\n━━━ vibe-pilot API smoke test ━━━`)
	console.log(`  Local:  ${LOCAL}`)
	console.log(`  Remote: ${REMOTE}\n`)

	// ── 1. Health ──
	console.log('Health')
	await test('GET /api/health', async () => {
		const res = await fetch(`${LOCAL}/api/health`)
		if (!res.ok) throw new Error(`Status ${res.status}`)
		return { status: res.status }
	})

	// ── 2. Organizations (local proxy) ──
	console.log('\nOrganizations')
	let orgId = ''
	await test('GET /api/organizations', async () => {
		const data = await localReq<{ organizations: Array<{ id: string; name: string; slug: string }> }>('GET', '/api/organizations')
		if (!data.organizations?.length) throw new Error('No organizations found')
		orgId = data.organizations[0]!.id
		return { count: data.organizations.length, first: data.organizations[0]!.name }
	})
	if (!orgId) { console.log('\n⚠ No org found, cannot continue.'); return printSummary() }

	// ── 3. Projects (local proxy) ──
	console.log('\nProjects')
	let projectId = ''
	await test('GET /api/remote/projects?organization_id=...', async () => {
		const data = await localReq<{ projects: Array<{ id: string; name: string }> }>('GET', `/api/remote/projects?organization_id=${orgId}`)
		if (!data.projects?.length) throw new Error('No projects found — create one in vibe-kanban UI first')
		projectId = data.projects[0]!.id
		return { count: data.projects.length, first: data.projects[0]!.name }
	})
	if (!projectId) { console.log('\n⚠ No project found, cannot continue.'); return printSummary() }

	await test('GET /api/remote/projects/{id}', async () => {
		return await localReq<{ id: string; name: string }>('GET', `/api/remote/projects/${projectId}`)
	})

	let testProjectId = ''
	await test('POST /v1/projects (remote — create)', async () => {
		const data = await remoteReq<{ data: { id: string; name: string } }>('POST', '/v1/projects', {
			organization_id: orgId,
			name: '_vp_test_project',
			color: '210 80% 55%',
		})
		testProjectId = data.data.id
		cleanup.push(async () => {
			await remoteReq('DELETE', `/v1/projects/${testProjectId}`).catch(() => {})
		})
		return { id: testProjectId }
	})

	// ── 4. Project Statuses ──
	console.log('\nProject Statuses')
	const statusMap: Record<string, string> = {}
	await test('GET /api/remote/project-statuses (local)', async () => {
		const data = await localReq<{ project_statuses: Array<{ id: string; name: string; sort_order: number }> }>('GET', `/api/remote/project-statuses?project_id=${projectId}`)
		for (const s of data.project_statuses) statusMap[s.name.toLowerCase()] = s.id
		return { count: data.project_statuses.length, statuses: data.project_statuses.map(s => s.name) }
	})

	let testStatusId = ''
	await test('POST /v1/project_statuses (remote — create)', async () => {
		const data = await remoteReq<{ data: { id: string; name: string } }>('POST', '/v1/project_statuses', {
			project_id: projectId,
			name: '_vp_test_status',
			color: '0 0% 50%',
			sort_order: 999,
			hidden: false,
		})
		testStatusId = data.data.id
		cleanup.push(async () => {
			await remoteReq('DELETE', `/v1/project_statuses/${testStatusId}`).catch(() => {})
		})
		return { id: testStatusId }
	})

	// ── 5. Tags ──
	console.log('\nTags')
	let existingTagId = ''
	await test('GET /api/remote/tags (local)', async () => {
		const data = await localReq<{ tags: Array<{ id: string; name: string }> }>('GET', `/api/remote/tags?project_id=${projectId}`)
		if (data.tags.length > 0) existingTagId = data.tags[0]!.id
		return { count: data.tags.length, tags: data.tags.map(t => t.name) }
	})

	let testTagId = ''
	await test('POST /v1/tags (remote — create)', async () => {
		const data = await remoteReq<{ data: { id: string; name: string } }>('POST', '/v1/tags', {
			project_id: projectId,
			name: '_vp_test_tag',
			color: '0 0% 50%',
		})
		testTagId = data.data.id
		cleanup.push(async () => {
			await remoteReq('DELETE', `/v1/tags/${testTagId}`).catch(() => {})
		})
		return { id: testTagId }
	})

	// ── 6. Issues (local proxy — full CRUD) ──
	console.log('\nIssues')
	const todoStatusId = statusMap['to do'] ?? Object.values(statusMap)[0] ?? ''
	let testIssueId = ''

	await test('POST /api/remote/issues (create)', async () => {
		const data = await localReq<{ data: { id: string; title: string } }>('POST', '/api/remote/issues', {
			project_id: projectId,
			status_id: todoStatusId,
			title: '_vp_test_issue',
			description: 'Test issue by vibe-pilot. Will be deleted.',
			priority: 'low',
			sort_order: 999,
			extension_metadata: {},
		})
		testIssueId = data.data.id
		cleanup.push(async () => {
			await localReq('DELETE', `/api/remote/issues/${testIssueId}`).catch(() => {})
		})
		return { id: testIssueId }
	})

	if (testIssueId) {
		await test('GET /api/remote/issues/{id}', async () => {
			return await localReq<{ id: string; title: string }>('GET', `/api/remote/issues/${testIssueId}`)
		})

		await test('POST /api/remote/issues/search', async () => {
			return await localReq<{ issues: unknown[]; total_count: number }>('POST', '/api/remote/issues/search', {
				project_id: projectId,
				status_id: todoStatusId,
				sort_field: 'sort_order',
				sort_direction: 'asc',
				limit: 5,
			})
		})

		await test('PATCH /api/remote/issues/{id} (update)', async () => {
			return await localReq<{ data: { id: string; title: string } }>('PATCH', `/api/remote/issues/${testIssueId}`, {
				title: '_vp_test_issue_updated',
				priority: 'medium',
			})
		})
	}

	// ── 7. Issue Tags (local proxy) ──
	console.log('\nIssue Tags')
	const tagForIssue = testTagId || existingTagId
	let testIssueTagId = ''

	if (testIssueId && tagForIssue) {
		await test('POST /api/remote/issue-tags (add tag)', async () => {
			const data = await localReq<{ data: { id: string } }>('POST', '/api/remote/issue-tags', {
				issue_id: testIssueId,
				tag_id: tagForIssue,
			})
			testIssueTagId = data.data.id
			cleanup.push(async () => {
				await localReq('DELETE', `/api/remote/issue-tags/${testIssueTagId}`).catch(() => {})
			})
			return { issueTagId: testIssueTagId }
		})

		await test('GET /api/remote/issue-tags?issue_id=...', async () => {
			return await localReq<{ issue_tags: Array<{ id: string }> }>('GET', `/api/remote/issue-tags?issue_id=${testIssueId}`)
		})
	} else {
		console.log('  ⏭ Skipping (no issue or tag)')
	}

	// ── 8. Issue Relationships (local proxy) ──
	console.log('\nIssue Relationships')
	let testIssue2Id = ''

	if (testIssueId) {
		await test('POST /api/remote/issues (create 2nd issue)', async () => {
			const data = await localReq<{ data: { id: string } }>('POST', '/api/remote/issues', {
				project_id: projectId,
				status_id: todoStatusId,
				title: '_vp_test_issue_2',
				sort_order: 998,
				extension_metadata: {},
			})
			testIssue2Id = data.data.id
			cleanup.push(async () => {
				await localReq('DELETE', `/api/remote/issues/${testIssue2Id}`).catch(() => {})
			})
			return { id: testIssue2Id }
		})
	}

	let testRelId = ''
	if (testIssueId && testIssue2Id) {
		await test('POST /api/remote/issue-relationships (blocking)', async () => {
			const data = await localReq<{ data: { id: string } }>('POST', '/api/remote/issue-relationships', {
				issue_id: testIssueId,
				related_issue_id: testIssue2Id,
				relationship_type: 'blocking',
			})
			testRelId = data.data.id
			cleanup.push(async () => {
				await localReq('DELETE', `/api/remote/issue-relationships/${testRelId}`).catch(() => {})
			})
			return { id: testRelId }
		})

		await test('GET /api/remote/issue-relationships?issue_id=...', async () => {
			return await localReq<{ issue_relationships: Array<{ id: string }> }>('GET', `/api/remote/issue-relationships?issue_id=${testIssue2Id}`)
		})
	} else {
		console.log('  ⏭ Skipping (no issues)')
	}

	// ── 9. Repos (local) ──
	console.log('\nRepos')
	await test('GET /api/repos', async () => {
		const data = await localReq<Array<{ id: string; path: string }>>('GET', '/api/repos')
		return { count: data.length, paths: data.slice(0, 3).map(r => r.path) }
	})

	// Test register + update with a real repo path on the server
	let testRepoId = ''
	const testRepoPath = '/tmp/_vp_test_repo'
	await test('POST /api/repos (register repo)', async () => {
		// Create a temp git repo to register
		await fetch(`${LOCAL}/api/repos/init`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ parent_path: '/tmp', folder_name: '_vp_test_repo' }),
		}).catch(() => {})

		const data = await localReq<{ id: string; path: string }>('POST', '/api/repos', {
			path: testRepoPath,
			display_name: '_vp_test_repo',
		})
		testRepoId = data.id
		cleanup.push(async () => {
			await localReq('DELETE', `/api/repos/${testRepoId}`).catch(() => {})
		})
		return { id: testRepoId, path: data.path }
	})

	if (testRepoId) {
		await test('PUT /api/repos/{id} (update scripts)', async () => {
			return await localReq<{ id: string }>('PUT', `/api/repos/${testRepoId}`, {
				setup_script: 'bun vibe-setup',
				cleanup_script: 'bun vibe-cleanup',
				dev_server_script: 'bun vibe-dev',
			})
		})
	}

	// ── 10. Workspaces (local) ──
	console.log('\nWorkspaces')
	await test('GET /api/workspaces', async () => {
		const data = await localReq<Array<{ id: string; name: string | null }>>('GET', '/api/workspaces')
		return { count: data.length }
	})

	// ── Cleanup ──
	console.log('\nCleanup')
	for (const fn of cleanup.reverse()) {
		try { await fn() } catch (err) { console.log(`  ⚠ cleanup failed: ${err}`) }
	}
	console.log(`  Cleaned up ${cleanup.length} test resources`)

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
