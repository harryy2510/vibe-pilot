/**
 * vibe-pilot API smoke test
 * Run: bun run test-api.ts
 *
 * Tests every API call used by the autopilot against localhost:4040.
 * Creates test data, validates responses, then cleans up.
 */

const BASE = 'http://localhost:4040'

type TestResult = { name: string; ok: boolean; error?: string; data?: unknown }
const results: TestResult[] = []
const cleanup: Array<() => Promise<void>> = []

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
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
	console.log('\n━━━ vibe-pilot API smoke test ━━━\n')

	// ── 1. Health ──
	console.log('Health')
	await test('GET /api/health', async () => {
		const res = await fetch(`${BASE}/api/health`)
		if (!res.ok) throw new Error(`Status ${res.status}`)
		return { status: res.status }
	})

	// ── 2. Organizations ──
	console.log('\nOrganizations')
	let orgId = ''
	await test('GET /api/organizations', async () => {
		const data = await req<{ organizations: Array<{ id: string; name: string; slug: string }> }>('GET', '/api/organizations')
		if (!data.organizations?.length) throw new Error('No organizations found')
		orgId = data.organizations[0]!.id
		return { count: data.organizations.length, first: data.organizations[0]!.name }
	})
	if (!orgId) { console.log('\n⚠ No org found, cannot continue.'); return printSummary() }

	// ── 3. Projects ──
	console.log('\nProjects')
	let projectId = ''
	let projectName = ''
	await test('GET /api/remote/projects?organization_id=...', async () => {
		const data = await req<{ projects: Array<{ id: string; name: string }> }>('GET', `/api/remote/projects?organization_id=${orgId}`)
		if (!data.projects?.length) throw new Error('No projects found — create one in vibe-kanban UI first')
		projectId = data.projects[0]!.id
		projectName = data.projects[0]!.name
		return { count: data.projects.length, first: projectName }
	})
	if (!projectId) { console.log('\n⚠ No project found, cannot continue.'); return printSummary() }

	await test('GET /api/remote/projects/{id}', async () => {
		const data = await req<{ id: string; name: string }>('GET', `/api/remote/projects/${projectId}`)
		return { id: data.id, name: data.name }
	})

	// ── 4. Project Statuses (read-only via local API) ──
	console.log('\nProject Statuses')
	const statusMap: Record<string, string> = {}
	await test('GET /api/remote/project-statuses?project_id=...', async () => {
		const data = await req<{ project_statuses: Array<{ id: string; name: string; sort_order: number }> }>('GET', `/api/remote/project-statuses?project_id=${projectId}`)
		for (const s of data.project_statuses) {
			statusMap[s.name.toLowerCase()] = s.id
		}
		return { count: data.project_statuses.length, statuses: data.project_statuses.map(s => s.name) }
	})

	// NOTE: POST/PUT/DELETE for project-statuses requires remote API with auth — not available via local proxy

	// ── 5. Tags (read-only via local API) ──
	console.log('\nTags')
	let existingTagId = ''
	await test('GET /api/remote/tags?project_id=...', async () => {
		const data = await req<{ tags: Array<{ id: string; name: string }> }>('GET', `/api/remote/tags?project_id=${projectId}`)
		if (data.tags.length > 0) existingTagId = data.tags[0]!.id
		return { count: data.tags.length, tags: data.tags.map(t => t.name) }
	})

	// NOTE: POST/DELETE for tags requires remote API with auth — not available via local proxy

	// ── 6. Issues ──
	console.log('\nIssues')
	const todoStatusId = statusMap['to do'] ?? Object.values(statusMap)[0] ?? ''
	let testIssueId = ''

	await test('POST /api/remote/issues (create test issue)', async () => {
		const data = await req<{ data: { id: string; title: string } }>('POST', '/api/remote/issues', {
			project_id: projectId,
			status_id: todoStatusId,
			title: '_vp_test_issue',
			description: 'Test issue created by vibe-pilot API smoke test. Will be deleted.',
			priority: 'low',
			sort_order: 999,
			extension_metadata: {},
		})
		testIssueId = data.data.id
		cleanup.push(async () => {
			await req('DELETE', `/api/remote/issues/${testIssueId}`).catch(() => {})
		})
		return { id: testIssueId }
	})

	if (testIssueId) {
		await test('GET /api/remote/issues/{id}', async () => {
			const data = await req<{ id: string; title: string }>('GET', `/api/remote/issues/${testIssueId}`)
			return { id: data.id, title: data.title }
		})
	}

	await test('POST /api/remote/issues/search', async () => {
		const data = await req<{ issues: unknown[]; total_count: number }>('POST', '/api/remote/issues/search', {
			project_id: projectId,
			status_id: todoStatusId,
			sort_field: 'sort_order',
			sort_direction: 'Asc',
			limit: 5,
		})
		return { count: data.total_count, returned: data.issues.length }
	})

	if (testIssueId) {
		await test('PATCH /api/remote/issues/{id} (update)', async () => {
			const data = await req<{ data: { id: string; title: string } }>('PATCH', `/api/remote/issues/${testIssueId}`, {
				title: '_vp_test_issue_updated',
				priority: 'medium',
			})
			return { id: data.data.id, title: data.data.title }
		})
	}

	// ── 7. Issue Tags ──
	console.log('\nIssue Tags')
	let testIssueTagId = ''

	if (testIssueId && existingTagId) {
		await test('POST /api/remote/issue-tags (add tag to issue)', async () => {
			const data = await req<{ data: { id: string } }>('POST', '/api/remote/issue-tags', {
				issue_id: testIssueId,
				tag_id: existingTagId,
			})
			testIssueTagId = data.data.id
			cleanup.push(async () => {
				await req('DELETE', `/api/remote/issue-tags/${testIssueTagId}`).catch(() => {})
			})
			return { issueTagId: testIssueTagId }
		})

		await test('GET /api/remote/issue-tags?issue_id=...', async () => {
			const data = await req<{ issue_tags: Array<{ id: string; tag_id: string }> }>('GET', `/api/remote/issue-tags?issue_id=${testIssueId}`)
			return { count: data.issue_tags.length }
		})
	} else {
		console.log('  ⏭ Skipping issue-tags (no test issue or no existing tags)')
	}

	// ── 8. Issue Relationships ──
	console.log('\nIssue Relationships')
	let testIssue2Id = ''
	let testRelId = ''

	if (testIssueId) {
		await test('POST /api/remote/issues (create 2nd issue for relationship)', async () => {
			const data = await req<{ data: { id: string } }>('POST', '/api/remote/issues', {
				project_id: projectId,
				status_id: todoStatusId,
				title: '_vp_test_issue_2',
				sort_order: 998,
				extension_metadata: {},
			})
			testIssue2Id = data.data.id
			cleanup.push(async () => {
				await req('DELETE', `/api/remote/issues/${testIssue2Id}`).catch(() => {})
			})
			return { id: testIssue2Id }
		})
	}

	if (testIssueId && testIssue2Id) {
		await test('POST /api/remote/issue-relationships (blocking)', async () => {
			const data = await req<{ data: { id: string } }>('POST', '/api/remote/issue-relationships', {
				issue_id: testIssueId,
				related_issue_id: testIssue2Id,
				relationship_type: 'blocking',
			})
			testRelId = data.data.id
			cleanup.push(async () => {
				await req('DELETE', `/api/remote/issue-relationships/${testRelId}`).catch(() => {})
			})
			return { id: testRelId }
		})

		await test('GET /api/remote/issue-relationships?issue_id=...', async () => {
			const data = await req<{ issue_relationships: Array<{ id: string; relationship_type: string }> }>('GET', `/api/remote/issue-relationships?issue_id=${testIssue2Id}`)
			return { count: data.issue_relationships.length }
		})
	} else {
		console.log('  ⏭ Skipping relationships (no test issues)')
	}

	// ── 9. Repos ──
	console.log('\nRepos')
	await test('GET /api/repos', async () => {
		const data = await req<Array<{ id: string; path: string }>>('GET', '/api/repos')
		return { count: data.length, paths: data.slice(0, 3).map(r => r.path) }
	})

	// ── 10. Workspaces ──
	console.log('\nWorkspaces')
	await test('GET /api/workspaces', async () => {
		const data = await req<Array<{ id: string; name: string | null }>>('GET', '/api/workspaces')
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
		for (const r of results.filter(r => !r.ok)) {
			console.log(`  ✗ ${r.name}: ${r.error}`)
		}
	}
	console.log('')
	process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
