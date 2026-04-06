# vkvk Autopilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic Bun cron process that orchestrates vibe-kanban task lifecycle — project discovery, setup, classification, task picking, stacked PRs, and workspace launching — with AI only where judgment is needed.

**Architecture:** A single long-running Bun process (managed by oxmgr) polls every 60 seconds. It talks to the vibe-kanban HTTP API at `localhost:4040` (configurable). Pure code handles discovery, setup, and task picking. AI workspaces are started via the API for classification, triage, and implementation. Skills tell the AI what to do; the cron tells the AI when to do it.

**Tech Stack:** Bun, TypeScript, native fetch (no deps), oxmgr, vibe-kanban HTTP API

**Spec:** `docs/specs/2026-04-06-autopilot-design.md`

---

## File Structure

```
vkvk/
├── oxfile.toml                    # oxmgr: runs vibe-kanban + autopilot
├── autopilot.config.json          # runtime config (workspace, org, models)
├── package.json                   # bun project metadata
├── tsconfig.json                  # strict TS config
├── src/
│   ├── index.ts                   # entry point: load config, setInterval loop
│   ├── types.ts                   # all TypeScript types (config, API responses, etc.)
│   ├── config.ts                  # load + validate autopilot.config.json
│   ├── logger.ts                  # structured console logger with timestamps
│   ├── api.ts                     # vibe-kanban HTTP API client (thin fetch wrapper)
│   ├── discover.ts                # scan workspace dir for git repos
│   ├── setup.ts                   # create project, tags, repo, statuses, vibe-kanban.json
│   ├── classifier.ts              # start classify workspace for backlog tasks
│   ├── picker.ts                  # pick tasks from To Do, resolve stacking, start workspaces
│   └── cycle.ts                   # orchestrate one full cron cycle
└── skills/
    ├── classify.md                # Haiku: simple vs complex, tag, assign tier+agent
    ├── triage.md                  # Opus: brainstorm with user, break down, create tasks
    ├── implement.md               # Assigned model: code, PR, link
    └── model-agent-ref.md         # Lookup table: task type → tier + agent
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `vkvk/package.json`
- Create: `vkvk/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "vkvk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "bun run src/index.ts",
    "dev": "bun --watch src/index.ts"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Install bun-types**

Run: `cd vkvk && bun add -d bun-types`

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json bun.lock
git commit -m "feat: scaffold vkvk autopilot project"
```

---

### Task 2: Types

**Files:**
- Create: `vkvk/src/types.ts`

All TypeScript types for the project. No runtime code — just type definitions.

- [ ] **Step 1: Create types.ts**

```typescript
// ── Config types ──

export type ModelEntry = {
	executor: string
	model: string
}

export type ModelPools = {
	high: ModelEntry[]
	medium: ModelEntry[]
	low: ModelEntry[]
}

export type Defaults = {
	concurrency: number
	stack_prs: boolean
	dev_script: string
	setup_script: string
	cleanup_script: string
	target_branch: string
	copy_files: string[]
	tags: string[]
}

export type AutopilotConfig = {
	workspace: string
	vk_api: string
	org_id: string
	scan_depth: number
	interval: number
	defaults: Defaults
	models: ModelPools
}

// ── Per-project config ──

export type ProjectConfig = {
	org_id: string
	project_id: string
	repo_id: string
	concurrency?: number
	stack_prs?: boolean
}

// ── Vibe-kanban API response types ──

export type ApiResponse<T> = {
	data: T
	error?: string
	success: boolean
}

export type MutationResponse<T> = {
	data: T
	txid: number
}

export type Project = {
	id: string
	name: string
	organization_id: string
	created_at: string
	updated_at: string
}

export type ProjectStatus = {
	id: string
	project_id: string
	name: string
	color: string
	sort_order: number
	created_at: string
	updated_at: string
}

export type Issue = {
	id: string
	project_id: string
	status_id: string
	title: string
	description: string | null
	priority: 'urgent' | 'high' | 'medium' | 'low' | null
	sort_order: number
	parent_issue_id: string | null
	created_at: string
	updated_at: string
}

export type ListIssuesResponse = {
	issues: Issue[]
	total_count: number
	limit: number
	offset: number
}

export type Tag = {
	id: string
	project_id: string
	name: string
	color: string
	created_at: string
	updated_at: string
}

export type IssueTag = {
	id: string
	issue_id: string
	tag_id: string
}

export type IssueRelationship = {
	id: string
	issue_id: string
	related_issue_id: string
	relationship_type: 'blocking' | 'related' | 'has_duplicate'
}

export type Repo = {
	id: string
	path: string
	display_name: string | null
	setup_script: string | null
	cleanup_script: string | null
	dev_server_script: string | null
}

export type Workspace = {
	id: string
	name: string | null
	archived: boolean
	pinned: boolean
	created_at: string
	updated_at: string
}

export type ExecutionProcess = {
	id: string
	status: 'Running' | 'Completed' | 'Failed' | 'Killed'
}

export type ExecutorConfig = {
	executor: string
	model_id?: string
	reasoning_id?: string
	permission_policy?: string
}

export type WorkspaceRepoInput = {
	repo_id: string
	target_branch: string
}

export type LinkedIssueInfo = {
	remote_project_id: string
	issue_id: string
}

export type CreateAndStartWorkspaceRequest = {
	name?: string
	repos: WorkspaceRepoInput[]
	linked_issue?: LinkedIssueInfo
	executor_config: ExecutorConfig
	prompt: string
}

export type CreateAndStartWorkspaceResponse = {
	workspace: Workspace
	execution_process: ExecutionProcess
}

// ── Autopilot metadata parsed from task descriptions ──

export type AutopilotMeta = {
	tier: 'low' | 'medium' | 'high'
	agent: string
}

// ── Round-robin state ──

export type RoundRobinState = {
	high: number
	medium: number
	low: number
}

// ── Discovered project ──

export type DiscoveredProject = {
	path: string
	hasGit: boolean
	config: ProjectConfig | null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add all TypeScript type definitions"
```

---

### Task 3: Logger

**Files:**
- Create: `vkvk/src/logger.ts`

Simple structured logger. Timestamps + project context.

- [ ] **Step 1: Create logger.ts**

```typescript
const timestamp = () => new Date().toISOString()

export const log = {
	info: (msg: string, ctx?: Record<string, unknown>) => {
		console.log(`[${timestamp()}] ${msg}`, ctx ? JSON.stringify(ctx) : '')
	},
	warn: (msg: string, ctx?: Record<string, unknown>) => {
		console.warn(`[${timestamp()}] WARN ${msg}`, ctx ? JSON.stringify(ctx) : '')
	},
	error: (msg: string, ctx?: Record<string, unknown>) => {
		console.error(`[${timestamp()}] ERROR ${msg}`, ctx ? JSON.stringify(ctx) : '')
	},
	cycle: (msg: string) => {
		console.log(`[${timestamp()}] ── ${msg} ──`)
	},
}
```

- [ ] **Step 2: Commit**

```bash
git add src/logger.ts
git commit -m "feat: add structured logger"
```

---

### Task 4: Config Loader

**Files:**
- Create: `vkvk/src/config.ts`
- Create: `vkvk/autopilot.config.json`

- [ ] **Step 1: Create config.ts**

```typescript
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
```

- [ ] **Step 2: Create autopilot.config.json template**

```json
{
  "workspace": "/Users/harryy/Desktop",
  "vk_api": "http://localhost:4040",
  "org_id": "REPLACE_WITH_ORG_ID",
  "scan_depth": 1,
  "interval": 60,
  "defaults": {
    "concurrency": 3,
    "stack_prs": true,
    "dev_script": "bun vibe-dev",
    "setup_script": "bun vibe-setup",
    "cleanup_script": "bun vibe-cleanup",
    "target_branch": "main",
    "copy_files": [".env.keys"],
    "tags": [
      "migration", "brainstorm", "blocked", "bug",
      "feature", "enhancement", "frontend", "backend", "setup"
    ]
  },
  "models": {
    "high": [
      { "executor": "CLAUDE_CODE", "model": "opus" },
      { "executor": "GEMINI", "model": "gemini-3.1-pro-preview" },
      { "executor": "CODEX", "model": "gpt-5.4" }
    ],
    "medium": [
      { "executor": "CLAUDE_CODE", "model": "sonnet" },
      { "executor": "GEMINI", "model": "gemini-3-pro-preview" },
      { "executor": "CODEX", "model": "gpt-5.2-codex" }
    ],
    "low": [
      { "executor": "CLAUDE_CODE", "model": "haiku" },
      { "executor": "GEMINI", "model": "gemini-3-flash-preview" },
      { "executor": "CODEX", "model": "gpt-5.4-fast" }
    ]
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/config.ts autopilot.config.json
git commit -m "feat: add config loader with validation and defaults"
```

---

### Task 5: Vibe-Kanban API Client

**Files:**
- Create: `vkvk/src/api.ts`

Thin fetch wrapper around the vibe-kanban HTTP API. Every method maps 1:1 to an endpoint.

- [ ] **Step 1: Create api.ts**

```typescript
import type {
	ApiResponse,
	CreateAndStartWorkspaceRequest,
	CreateAndStartWorkspaceResponse,
	Issue,
	IssueRelationship,
	IssueTag,
	ListIssuesResponse,
	MutationResponse,
	Project,
	ProjectStatus,
	Repo,
	Tag,
	Workspace,
} from './types'
import { log } from './logger'

export class VkApi {
	constructor(private baseUrl: string) {}

	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const url = `${this.baseUrl}${path}`
		const res = await fetch(url, {
			method,
			headers: body ? { 'Content-Type': 'application/json' } : undefined,
			body: body ? JSON.stringify(body) : undefined,
		})

		if (!res.ok) {
			const text = await res.text().catch(() => 'no body')
			throw new Error(`VK API ${method} ${path} failed (${res.status}): ${text}`)
		}

		return res.json() as Promise<T>
	}

	// ── Health ──

	async isHealthy(): Promise<boolean> {
		try {
			await fetch(`${this.baseUrl}/api/health`)
			return true
		} catch {
			return false
		}
	}

	// ── Organizations ──

	async listOrganizations(): Promise<{ organizations: Array<{ id: string; name: string; slug: string }> }> {
		return this.request('GET', '/api/organizations')
	}

	// ── Projects ──

	async listProjects(orgId: string): Promise<{ projects: Project[] }> {
		return this.request('GET', `/api/remote/projects?organization_id=${orgId}`)
	}

	async getProject(projectId: string): Promise<Project> {
		return this.request('GET', `/api/remote/projects/${projectId}`)
	}

	// ── Project Statuses ──

	async listProjectStatuses(projectId: string): Promise<{ project_statuses: ProjectStatus[] }> {
		return this.request('GET', `/api/remote/project-statuses?project_id=${projectId}`)
	}

	async createProjectStatus(body: {
		project_id: string
		name: string
		color: string
		sort_order: number
	}): Promise<MutationResponse<ProjectStatus>> {
		return this.request('POST', '/api/remote/project-statuses', body)
	}

	// ── Issues ──

	async searchIssues(body: {
		project_id: string
		status_id?: string
		status_ids?: string[]
		tag_id?: string
		sort_field?: string
		sort_direction?: string
		limit?: number
		offset?: number
	}): Promise<ListIssuesResponse> {
		return this.request('POST', '/api/remote/issues/search', body)
	}

	async createIssue(body: {
		project_id: string
		status_id: string
		title: string
		description?: string
		priority?: string
		sort_order: number
	}): Promise<MutationResponse<Issue>> {
		return this.request('POST', '/api/remote/issues', body)
	}

	async updateIssue(issueId: string, body: {
		status_id?: string
		title?: string
		description?: string | null
		priority?: string | null
		sort_order?: number
	}): Promise<MutationResponse<Issue>> {
		return this.request('PATCH', `/api/remote/issues/${issueId}`, body)
	}

	async getIssue(issueId: string): Promise<Issue> {
		return this.request('GET', `/api/remote/issues/${issueId}`)
	}

	// ── Tags ──

	async listTags(projectId: string): Promise<{ tags: Tag[] }> {
		return this.request('GET', `/api/remote/tags?project_id=${projectId}`)
	}

	async createTag(body: {
		project_id: string
		name: string
		color: string
	}): Promise<MutationResponse<Tag>> {
		return this.request('POST', '/api/remote/tags', body)
	}

	async deleteTag(tagId: string): Promise<void> {
		await this.request('DELETE', `/api/remote/tags/${tagId}`)
	}

	// ── Issue Tags ──

	async listIssueTags(issueId: string): Promise<{ issue_tags: IssueTag[] }> {
		return this.request('GET', `/api/remote/issue-tags?issue_id=${issueId}`)
	}

	async addIssueTag(body: {
		issue_id: string
		tag_id: string
	}): Promise<MutationResponse<IssueTag>> {
		return this.request('POST', '/api/remote/issue-tags', body)
	}

	// ── Issue Relationships ──

	async listIssueRelationships(issueId: string): Promise<{ issue_relationships: IssueRelationship[] }> {
		return this.request('GET', `/api/remote/issue-relationships?issue_id=${issueId}`)
	}

	async createIssueRelationship(body: {
		issue_id: string
		related_issue_id: string
		relationship_type: 'blocking' | 'related' | 'has_duplicate'
	}): Promise<MutationResponse<IssueRelationship>> {
		return this.request('POST', '/api/remote/issue-relationships', body)
	}

	// ── Repos ──

	async listRepos(): Promise<Repo[]> {
		return this.request('GET', '/api/repos')
	}

	async registerRepo(body: {
		path: string
		display_name?: string
	}): Promise<Repo> {
		return this.request('POST', '/api/repos', body)
	}

	async updateRepo(repoId: string, body: {
		setup_script?: string
		cleanup_script?: string
		dev_server_script?: string
	}): Promise<Repo> {
		return this.request('PUT', `/api/repos/${repoId}`, body)
	}

	// ── Workspaces ──

	async listWorkspaces(): Promise<Workspace[]> {
		return this.request('GET', '/api/workspaces')
	}

	async startWorkspace(body: CreateAndStartWorkspaceRequest): Promise<CreateAndStartWorkspaceResponse> {
		return this.request('POST', '/api/workspaces/start', body)
	}

	async getWorkspaceRepos(workspaceId: string): Promise<Array<{ repo_id: string; target_branch: string }>> {
		return this.request('GET', `/api/workspaces/${workspaceId}/repos`)
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api.ts
git commit -m "feat: add vibe-kanban HTTP API client"
```

---

### Task 6: Project Discovery

**Files:**
- Create: `vkvk/src/discover.ts`

Scans the workspace folder for git repos and reads their `vibe-kanban.json`.

- [ ] **Step 1: Create discover.ts**

```typescript
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { AutopilotConfig, DiscoveredProject, ProjectConfig } from './types'
import { log } from './logger'

export function discoverProjects(config: AutopilotConfig): DiscoveredProject[] {
	const { workspace, scan_depth } = config
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
		configured: projects.filter(p => p.config).length,
		unconfigured: projects.filter(p => !p.config).length,
	})

	return projects
}

export function isConfigComplete(config: ProjectConfig | null): boolean {
	if (!config) return false
	return Boolean(config.org_id && config.project_id && config.repo_id)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/discover.ts
git commit -m "feat: add project discovery — scan workspace for git repos"
```

---

### Task 7: Project Setup

**Files:**
- Create: `vkvk/src/setup.ts`

Creates project, repo, tags, statuses in vibe-kanban. Writes `vibe-kanban.json`.

- [ ] **Step 1: Create setup.ts**

```typescript
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { AutopilotConfig, DiscoveredProject, ProjectConfig, Tag } from './types'
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
}

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
		p => p.name.toLowerCase() === projectName.toLowerCase(),
	)

	if (!vkProject) {
		log.info(`Project "${projectName}" not found in vibe-kanban, skipping auto-create (create via UI)`)
		// NOTE: Project creation requires the shared/remote API which may need auth.
		// For now, log and skip. The user creates projects via vibe-kanban UI.
		// If the API supports it locally, we can add auto-creation later.
		return null
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

	// Step 3: Update repo scripts
	await api.updateRepo(repo.id, {
		setup_script: config.defaults.setup_script,
		cleanup_script: config.defaults.cleanup_script,
		dev_server_script: config.defaults.dev_script,
	})

	// Step 4: Ensure Triage status exists
	await ensureTriageStatus(api, vkProject.id)

	// Step 5: Ensure standard tags exist
	await ensureStandardTags(api, vkProject.id, config.defaults.tags)

	// Step 6: Write vibe-kanban.json
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

export async function ensureTriageStatus(api: VkApi, projectId: string): Promise<string> {
	const { project_statuses: statuses } = await api.listProjectStatuses(projectId)

	const triage = statuses.find(s => s.name.toLowerCase() === 'triage')
	if (triage) return triage.id

	// Insert Triage between Backlog and To Do
	const backlog = statuses.find(s => s.name.toLowerCase() === 'backlog')
	const todo = statuses.find(s => s.name.toLowerCase() === 'to do')

	let sortOrder: number
	if (backlog && todo) {
		sortOrder = (backlog.sort_order + todo.sort_order) / 2
	} else if (backlog) {
		sortOrder = backlog.sort_order + 1
	} else {
		sortOrder = 0.5
	}

	const result = await api.createProjectStatus({
		project_id: projectId,
		name: 'Triage',
		color: '45 85% 55%',
		sort_order: sortOrder,
	})

	log.info('Created Triage status', { projectId })
	return result.data.id
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
		const result = await api.createTag({
			project_id: projectId,
			name: tagName,
			color,
		})
		tagMap.set(tagName.toLowerCase(), result.data.id)
		log.info(`Created tag: ${tagName}`, { projectId })
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

	// Still ensure tags and triage status exist
	await ensureTriageStatus(api, updated.project_id)
	await ensureStandardTags(api, updated.project_id, config.defaults.tags)

	return updated
}
```

- [ ] **Step 2: Commit**

```bash
git add src/setup.ts
git commit -m "feat: add project setup — tags, statuses, repo scripts, vibe-kanban.json"
```

---

### Task 8: Classifier (Backlog → Triage / To Do)

**Files:**
- Create: `vkvk/src/classifier.ts`

Starts a Haiku workspace for each backlog task to classify it as simple or complex.

- [ ] **Step 1: Create classifier.ts**

```typescript
import type { AutopilotConfig, ProjectConfig, RoundRobinState } from './types'
import type { VkApi } from './api'
import { log } from './logger'
import { pickFromPool } from './picker'

export async function classifyBacklogTasks(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
): Promise<number> {
	const backlogStatusId = statusMap.get('backlog')
	if (!backlogStatusId) {
		log.warn('No Backlog status found', { projectId: projectConfig.project_id })
		return 0
	}

	// Find backlog tasks
	const { issues } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: backlogStatusId,
		sort_field: 'SortOrder',
		sort_direction: 'Asc',
		limit: 10,
	})

	if (issues.length === 0) return 0

	let started = 0

	for (const issue of issues) {
		// Check if a workspace already exists for this issue
		// We do this by checking if there's already an active classify workspace
		// Skip issues that are already being classified (have a workspace linked)
		// For now, start one at a time to avoid overwhelming
		if (started >= 1) break

		const { executor, model } = pickFromPool(globalConfig.models, 'low', rrState)

		log.info(`Classifying backlog task: ${issue.title}`, {
			issueId: issue.id,
			executor,
			model,
		})

		const prompt = `You are classifying a backlog task. Follow the classify skill.

Task: ${issue.title}
${issue.description ? `\nDescription:\n${issue.description}` : ''}

Issue ID: ${issue.id}
Project ID: ${projectConfig.project_id}`

		try {
			await api.startWorkspace({
				repos: [{
					repo_id: projectConfig.repo_id,
					target_branch: globalConfig.defaults.target_branch,
				}],
				linked_issue: {
					remote_project_id: projectConfig.project_id,
					issue_id: issue.id,
				},
				executor_config: {
					executor,
					model_id: model,
					permission_policy: 'AUTO',
				},
				prompt,
			})

			started++
		} catch (err) {
			log.error(`Failed to start classify workspace for "${issue.title}"`, {
				error: String(err),
			})
		}
	}

	return started
}
```

- [ ] **Step 2: Commit**

```bash
git add src/classifier.ts
git commit -m "feat: add classifier — start Haiku workspace for backlog tasks"
```

---

### Task 9: Task Picker (To Do → In Progress)

**Files:**
- Create: `vkvk/src/picker.ts`

Picks tasks from To Do, resolves stacking dependencies, starts implementation workspaces.

- [ ] **Step 1: Create picker.ts**

```typescript
import type {
	AutopilotConfig,
	AutopilotMeta,
	Issue,
	IssueRelationship,
	ModelPools,
	ProjectConfig,
	RoundRobinState,
} from './types'
import type { VkApi } from './api'
import { log } from './logger'

// ── Round-robin pool picker ──

export function pickFromPool(
	pools: ModelPools,
	tier: 'low' | 'medium' | 'high',
	state: RoundRobinState,
): { executor: string; model: string } {
	const pool = pools[tier]
	if (!pool.length) throw new Error(`Empty model pool for tier: ${tier}`)

	const index = state[tier] % pool.length
	state[tier] = index + 1

	const entry = pool[index]!
	return { executor: entry.executor, model: entry.model }
}

// ── Parse autopilot metadata from task description ──

export function parseAutopilotMeta(description: string | null): AutopilotMeta | null {
	if (!description) return null

	const match = description.match(/<!--\s*autopilot\s+([\s\S]*?)-->/)
	if (!match?.[1]) return null

	const block = match[1]
	const tierMatch = block.match(/tier:\s*(low|medium|high)/)
	const agentMatch = block.match(/agent:\s*(.+)/)

	if (!tierMatch?.[1]) return null

	return {
		tier: tierMatch[1] as 'low' | 'medium' | 'high',
		agent: agentMatch?.[1]?.trim() ?? 'Senior Developer',
	}
}

// ── Check if a task is blocked ──

async function isTaskBlocked(
	api: VkApi,
	issueId: string,
	stackPrs: boolean,
	statusMap: Map<string, string>,
): Promise<{ blocked: boolean; baseBranch: string | null }> {
	const { issue_relationships: rels } = await api.listIssueRelationships(issueId)

	// Find blocking relationships where this task is the blocked one
	const blockers = rels.filter(
		r => r.relationship_type === 'blocking' && r.related_issue_id === issueId,
	)

	if (blockers.length === 0) return { blocked: false, baseBranch: null }

	const doneStatusId = statusMap.get('done')
	const inReviewStatusId = statusMap.get('in review')

	for (const blocker of blockers) {
		const blockerIssue = await api.getIssue(blocker.issue_id)

		if (stackPrs) {
			// With stacking: blocked if blocker is not at least In Progress
			const inProgressId = statusMap.get('in progress')
			const allowedStatuses = [inProgressId, inReviewStatusId, doneStatusId].filter(Boolean)

			if (!allowedStatuses.includes(blockerIssue.status_id)) {
				return { blocked: true, baseBranch: null }
			}

			// If blocker is in progress or in review, find its branch for stacking
			if (blockerIssue.status_id !== doneStatusId) {
				const branch = await findWorkspaceBranch(api, blocker.issue_id)
				if (branch) return { blocked: false, baseBranch: branch }
			}
		} else {
			// Without stacking: blocked if blocker is not Done (merged)
			if (blockerIssue.status_id !== doneStatusId) {
				return { blocked: true, baseBranch: null }
			}
		}
	}

	return { blocked: false, baseBranch: null }
}

// ── Find workspace branch for stacking ──

async function findWorkspaceBranch(api: VkApi, issueId: string): Promise<string | null> {
	try {
		const workspaces = await api.listWorkspaces()
		// Find workspace linked to this issue by checking workspace repos
		// This is a simplified approach — in practice we'd need the workspace-issue link
		// For now, return null and let the implementation use the default branch
		// TODO: vibe-kanban API needs a way to find workspace by linked issue
		return null
	} catch {
		return null
	}
}

// ── Check migration constraints ──

async function hasMigrationInFlight(
	api: VkApi,
	projectConfig: ProjectConfig,
	statusMap: Map<string, string>,
	tagMap: Map<string, string>,
	stackPrs: boolean,
): Promise<{ inFlight: boolean; branch: string | null }> {
	const migrationTagId = tagMap.get('migration')
	if (!migrationTagId) return { inFlight: false, branch: null }

	const inProgressId = statusMap.get('in progress')
	const inReviewId = statusMap.get('in review')

	const statusIds = [inProgressId, inReviewId].filter(Boolean) as string[]

	for (const statusId of statusIds) {
		const { issues } = await api.searchIssues({
			project_id: projectConfig.project_id,
			status_id: statusId,
			tag_id: migrationTagId,
			limit: 5,
		})

		if (issues.length > 0) {
			if (stackPrs) {
				// Find branch to stack off of
				const branch = await findWorkspaceBranch(api, issues[0]!.id)
				return { inFlight: true, branch }
			}
			return { inFlight: true, branch: null }
		}
	}

	return { inFlight: false, branch: null }
}

// ── Main picker ──

export async function pickAndStartTasks(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
	tagMap: Map<string, string>,
): Promise<number> {
	const concurrency = projectConfig.concurrency ?? globalConfig.defaults.concurrency
	const stackPrs = projectConfig.stack_prs ?? globalConfig.defaults.stack_prs

	// Count active slots (In Progress only)
	const inProgressId = statusMap.get('in progress')
	if (!inProgressId) return 0

	const { total_count: activeCount } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: inProgressId,
		limit: 1,
	})

	const openSlots = concurrency - activeCount
	if (openSlots <= 0) {
		log.info('All slots full', { active: activeCount, concurrency })
		return 0
	}

	// Get To Do tasks in board order
	const todoId = statusMap.get('to do')
	if (!todoId) return 0

	const { issues: todoTasks } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: todoId,
		sort_field: 'SortOrder',
		sort_direction: 'Asc',
		limit: 20,
	})

	if (todoTasks.length === 0) return 0

	// Check migration state once
	const migrationState = await hasMigrationInFlight(
		api, projectConfig, statusMap, tagMap, stackPrs,
	)

	const blockedTagId = tagMap.get('blocked')
	const migrationTagId = tagMap.get('migration')
	let started = 0

	for (const task of todoTasks) {
		if (started >= openSlots) break

		// Skip blocked-tagged tasks
		if (blockedTagId) {
			const { issue_tags } = await api.listIssueTags(task.id)
			const hasBlockedTag = issue_tags.some(it => it.tag_id === blockedTagId)
			if (hasBlockedTag) {
				log.info(`Skipping blocked task: ${task.title}`)
				continue
			}

			// Check if this is a migration task
			const isMigration = issue_tags.some(it => it.tag_id === migrationTagId)
			if (isMigration && migrationState.inFlight && !stackPrs) {
				log.info(`Skipping migration task (migration in flight, stacking disabled): ${task.title}`)
				continue
			}
		}

		// Check blocked_by relationships
		const { blocked, baseBranch } = await isTaskBlocked(api, task.id, stackPrs, statusMap)
		if (blocked) {
			log.info(`Skipping task with unresolved dependencies: ${task.title}`)
			continue
		}

		// Parse autopilot metadata from description
		const meta = parseAutopilotMeta(task.description)
		const tier = meta?.tier ?? 'medium'
		const agent = meta?.agent ?? 'Senior Developer'

		const { executor, model } = pickFromPool(globalConfig.models, tier, rrState)
		const targetBranch = baseBranch ?? globalConfig.defaults.target_branch

		log.info(`Starting task: ${task.title}`, {
			tier,
			agent,
			executor,
			model,
			targetBranch,
			stacked: baseBranch !== null,
		})

		const prompt = `You are the ${agent}. Follow the implement skill.

Task: ${task.title}
${task.description ? `\nDescription:\n${task.description}` : ''}

Issue ID: ${task.id}
Project ID: ${projectConfig.project_id}
Target Branch: ${targetBranch}`

		try {
			await api.startWorkspace({
				name: task.title,
				repos: [{
					repo_id: projectConfig.repo_id,
					target_branch: targetBranch,
				}],
				linked_issue: {
					remote_project_id: projectConfig.project_id,
					issue_id: task.id,
				},
				executor_config: {
					executor,
					model_id: model,
					permission_policy: 'AUTO',
				},
				prompt,
			})

			started++
		} catch (err) {
			log.error(`Failed to start workspace for "${task.title}"`, {
				error: String(err),
			})
		}
	}

	return started
}

// ── Triage starter ──

export async function startTriageWorkspaces(
	api: VkApi,
	projectConfig: ProjectConfig,
	globalConfig: AutopilotConfig,
	rrState: RoundRobinState,
	statusMap: Map<string, string>,
): Promise<number> {
	const triageId = statusMap.get('triage')
	if (!triageId) return 0

	const { issues: triageTasks } = await api.searchIssues({
		project_id: projectConfig.project_id,
		status_id: triageId,
		sort_field: 'SortOrder',
		sort_direction: 'Asc',
		limit: 10,
	})

	if (triageTasks.length === 0) return 0

	// Check which triage tasks already have active workspaces
	// For now, start one triage workspace at a time per project
	let started = 0

	for (const task of triageTasks) {
		if (started >= 1) break

		const { executor, model } = pickFromPool(globalConfig.models, 'high', rrState)

		log.info(`Starting triage workspace: ${task.title}`, {
			executor,
			model,
		})

		const prompt = `You are triaging a task. Follow the triage skill.

Task: ${task.title}
${task.description ? `\nDescription:\n${task.description}` : ''}

Issue ID: ${task.id}
Project ID: ${projectConfig.project_id}`

		try {
			await api.startWorkspace({
				name: `Triage: ${task.title}`,
				repos: [{
					repo_id: projectConfig.repo_id,
					target_branch: globalConfig.defaults.target_branch,
				}],
				linked_issue: {
					remote_project_id: projectConfig.project_id,
					issue_id: task.id,
				},
				executor_config: {
					executor,
					model_id: model,
					permission_policy: 'AUTO',
				},
				prompt,
			})

			started++
		} catch (err) {
			log.error(`Failed to start triage workspace for "${task.title}"`, {
				error: String(err),
			})
		}
	}

	return started
}
```

- [ ] **Step 2: Commit**

```bash
git add src/picker.ts
git commit -m "feat: add task picker with stacking, migration guards, and round-robin"
```

---

### Task 10: Cycle Orchestrator

**Files:**
- Create: `vkvk/src/cycle.ts`

Runs one complete cron cycle: discover → setup → classify → triage → pick.

- [ ] **Step 1: Create cycle.ts**

```typescript
import type { AutopilotConfig, RoundRobinState } from './types'
import { VkApi } from './api'
import { log } from './logger'
import { discoverProjects, isConfigComplete } from './discover'
import { setupProject, fixIncompleteConfig } from './setup'
import { classifyBacklogTasks } from './classifier'
import { pickAndStartTasks, startTriageWorkspaces } from './picker'

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
				if (!projectConfig) {
					log.info(`Skipping ${projectName} — not set up in vibe-kanban`)
					continue
				}
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

			// Step 5: Pick and start implementation tasks
			const started = await pickAndStartTasks(
				api, projectConfig, config, rrState, statusMap, tagMap,
			)

			// Report only if something happened
			if (classified + triaged + started > 0) {
				log.info(`${projectName}: classified=${classified} triaged=${triaged} started=${started}`)
			}
		} catch (err) {
			log.error(`Error processing ${projectName}`, { error: String(err) })
		}
	}

	log.cycle('Cycle end')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/cycle.ts
git commit -m "feat: add cycle orchestrator — discover, setup, classify, pick"
```

---

### Task 11: Entry Point

**Files:**
- Create: `vkvk/src/index.ts`

Main entry point. Loads config, starts the interval loop.

- [ ] **Step 1: Create index.ts**

```typescript
import { loadConfig } from './config'
import { VkApi } from './api'
import { runCycle } from './cycle'
import { log } from './logger'
import type { RoundRobinState } from './types'

async function main() {
	log.info('vkvk autopilot starting')

	const config = loadConfig()
	const api = new VkApi(config.vk_api)

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
```

- [ ] **Step 2: Run to verify it starts**

Run: `cd vkvk && bun run src/index.ts`
Expected: Starts, logs config, runs first cycle (will fail health check if vibe-kanban isn't running — that's fine), then continues interval.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add entry point with setInterval loop"
```

---

### Task 12: oxfile.toml

**Files:**
- Create: `vkvk/oxfile.toml`

Combined process management for vibe-kanban + autopilot.

- [ ] **Step 1: Create oxfile.toml**

```toml
version = 1

[defaults]
restart_policy = "on_failure"
max_restarts = 10
stop_timeout_secs = 5

[[apps]]
name = "vibe-kanban"
command = "bunx vibe-kanban@https://github.com/BloopAI/vibe-kanban/releases/download/v0.1.40-20260401153532/vibe-kanban-0.1.40.tgz"
health_cmd = "curl -fsS http://localhost:4040"

[apps.env]
VK_SHARED_API_BASE = "https://server-vibe.hariom.cc"
VK_SHARED_RELAY_API_BASE = "https://relay-vibe.hariom.cc"
PORT = "4040"
HOST = "0.0.0.0"

[[apps]]
name = "autopilot"
command = "bun run src/index.ts"
health_cmd = "curl -fsS http://localhost:4040"

[apps.env]
AUTOPILOT_CONFIG = "./autopilot.config.json"
```

- [ ] **Step 2: Commit**

```bash
git add oxfile.toml
git commit -m "feat: add oxfile.toml — vibe-kanban + autopilot process management"
```

---

### Task 13: Classify Skill

**Files:**
- Create: `vkvk/skills/classify.md`

Skill for Haiku to classify backlog tasks as simple or complex.

- [ ] **Step 1: Create classify.md**

```markdown
---
name: classify
description: Classify a backlog task as simple or complex. Assigns tags, model tier, and agent type. Used by the autopilot cron.
---

# Classify Task

You are classifying a backlog task to determine if it's simple (can go straight to implementation) or complex (needs brainstorming and breakdown).

## Your Job

1. Read the task title and description
2. Decide: **simple** or **complex**
3. Take the appropriate action

## Simple Tasks

A task is simple if ALL of these are true:
- Clear, specific scope (e.g. "fix typo on settings page", "add loading spinner to dashboard")
- No architectural decisions needed
- Likely touches 1-5 files
- No database migrations required (unless trivial like adding a column)
- No ambiguity in what needs to be done

**Actions for simple tasks:**
1. Add appropriate domain tags using `add_issue_tag`:
   - `frontend` — UI components, pages, layouts, styles
   - `backend` — server functions, APIs, integrations
   - `migration` — database schema changes
   - `bug` — fixing broken behavior
   - `feature` — new functionality
   - `enhancement` — improving existing functionality
2. Determine the model tier and agent type (see Model-Agent Reference below)
3. Update the task description to append the autopilot metadata block:
   ```
   <!-- autopilot
   tier: {low|medium|high}
   agent: {agent type}
   -->
   ```
4. Set priority (urgent/high/medium/low) based on task urgency
5. Move the task to "To Do" status

## Complex Tasks

A task is complex if ANY of these are true:
- Vague or broad scope (e.g. "build user management", "improve performance")
- Requires architectural decisions
- Likely touches 10+ files or multiple systems
- Needs discussion with the user to clarify requirements
- Could be broken into multiple independent tasks

**Actions for complex tasks:**
1. Add the `brainstorm` tag
2. Move the task to "Triage" status

## Model-Agent Reference

Use this to decide the tier and agent for simple tasks:

| Task Type | Tier | Agent |
|---|---|---|
| Simple bug fix, typo, config change | low | Senior Developer |
| Standard UI component, page, form | medium | Frontend Developer |
| Standard API endpoint, server function | medium | Backend Architect |
| Database migration, schema change | medium | Database Optimizer |
| Auth flow, RLS policy, security fix | medium | Security Engineer |
| CI/CD, deployment, infrastructure | medium | DevOps Automator |
| Documentation, README | low | Technical Writer |
| Complex cross-domain feature | high | Senior Developer |
| Architecture, system design | high | Software Architect |

## Important

- Do NOT start implementing the task
- Do NOT create a workspace or write code
- Only classify, tag, and move the task
- If unsure, err on the side of "complex" — it's better to brainstorm than to ship half-baked work
```

- [ ] **Step 2: Commit**

```bash
git add skills/classify.md
git commit -m "feat: add classify skill for backlog task classification"
```

---

### Task 14: Triage Skill

**Files:**
- Create: `vkvk/skills/triage.md`

Skill for Opus to brainstorm with the user and break down complex tasks.

- [ ] **Step 1: Create triage.md**

```markdown
---
name: triage
description: Brainstorm with the user to understand a complex task, then break it down into actionable To Do tasks with specs, tags, and model/agent assignments.
---

# Triage Task

You are an experienced software architect triaging a complex task. Your job is to understand what needs to be built, then break it down into concrete, implementable tasks.

## Your Job

1. Read the task title and description
2. Chat with the user to understand requirements
3. Break down into To Do tasks
4. Create the tasks in vibe-kanban with full metadata

## Phase 1: Understand

Ask the user questions to clarify:
- What exactly needs to be built?
- What are the constraints?
- What does success look like?
- Are there dependencies on other work?
- Any technical decisions that need to be made?

Ask one question at a time. Use multiple choice when possible. Don't overwhelm.

Read the project's repo-map (`.claude/project-map.md` or equivalent) to understand the codebase before asking questions.

## Phase 2: Break Down

Once you understand the scope, break it into tasks that are:
- **Meaningful chunks** — each produces a working PR with 10-20 files (excluding generated files)
- **Independent where possible** — can be worked on in parallel
- **Sequenced where necessary** — use `blocked_by` relationships for dependencies
- **Tagged correctly** — frontend, backend, migration, etc.
- **Assigned a model tier and agent** — based on complexity and domain

## Phase 3: Create Tasks

For each task, use `create_issue` with:
- Clear title (action-oriented: "Add user settings page", not "User settings")
- Description with:
  - What to build (specific files, components, patterns)
  - Acceptance criteria
  - Any technical notes or constraints
  - Autopilot metadata block:
    ```
    <!-- autopilot
    tier: {low|medium|high}
    agent: {agent type}
    -->
    ```
- Priority: urgent/high/medium/low
- Tags: appropriate domain tags
- Sort order: higher priority tasks should have lower sort_order (they appear first in To Do)

Then set up relationships:
- Use `create_issue_relationship` with type `blocking` for dependencies
- Migration tasks should block non-migration tasks that depend on the schema changes
- Frontend tasks that depend on backend APIs should be blocked by the backend task

## Model-Agent Reference

| Task Type | Tier | Agent |
|---|---|---|
| Simple bug fix, typo, config change | low | Senior Developer |
| Standard UI component, page, form | medium | Frontend Developer |
| Standard API endpoint, server function | medium | Backend Architect |
| Database migration, schema change | medium | Database Optimizer |
| Auth flow, RLS policy, security fix | medium | Security Engineer |
| CI/CD, deployment, infrastructure | medium | DevOps Automator |
| Documentation, README | low | Technical Writer |
| Complex cross-domain feature | high | Senior Developer |
| Architecture, system design | high | Software Architect |
| UI/UX design system, layout architecture | medium | UX Architect |
| Quick prototype, proof of concept | medium | Rapid Prototyper |

## After Creating Tasks

1. Move the original triage task to "Done" status
2. Summarize what you created: list of tasks with their priorities and assignments

## Important

- Do NOT implement any code
- Do NOT create PRs
- Only break down, create tasks, and set up relationships
- Prefer fewer, larger tasks over many tiny ones
- Every task must be independently deployable via a single PR
```

- [ ] **Step 2: Commit**

```bash
git add skills/triage.md
git commit -m "feat: add triage skill for brainstorming and task breakdown"
```

---

### Task 15: Implement Skill

**Files:**
- Create: `vkvk/skills/implement.md`

Skill for the assigned model to implement a task and create a PR.

- [ ] **Step 1: Create implement.md**

```markdown
---
name: implement
description: Implement a task from the To Do board. Write code, create PR, and link it to the issue. The PR triggers automatic transition to In Review.
---

# Implement Task

You are implementing a task from the kanban board. Your job is to write the code and create a PR.

## Your Job

1. Read the task description carefully — it contains the spec
2. Read the project's repo-map for codebase context
3. Implement the work
4. Create a PR and link it to the issue

## Before You Start

1. Read `.claude/project-map.md` (or equivalent repo-map) to understand the codebase
2. Read `CLAUDE.md` for project conventions and rules
3. Understand the task requirements from the description
4. Check if there are related files you should read first

## Implementation

- Follow the project's coding conventions exactly
- Write clean, production-quality code
- Keep changes focused — only touch what the task requires
- Do not add features, refactor code, or make improvements beyond the task scope
- If the task mentions specific files or patterns, follow them

## Testing

- Run the project's check/lint/type-check command before committing
- If tests exist, make sure they pass
- If the task involves new functionality, add tests if the project has a test setup

## Non-Negotiable: Create PR and Link to Issue

This step MUST happen. Without it, the task stays In Progress forever.

1. Stage and commit your changes with a clear commit message
2. Push to the branch
3. Create a PR using the vibe-kanban tools or `gh pr create`:
   - Title: matches the task title
   - Body: brief description of changes + link to the issue
   - Target branch: the branch specified in the workspace (may be another branch for stacked PRs, not always main)
4. Link the PR to the issue — vibe-kanban automatically moves the task to "In Review" when a PR is linked

If you cannot create the PR for any reason (merge conflicts, failing checks), leave a comment on the issue explaining what happened and what needs to be resolved.

## Important

- Do NOT move the task status manually — vibe-kanban handles transitions
- Do NOT skip the PR step — it's the signal that work is done
- Do NOT make changes outside the task scope
- If the task is unclear, implement your best interpretation and note assumptions in the PR description
```

- [ ] **Step 2: Commit**

```bash
git add skills/implement.md
git commit -m "feat: add implement skill — code, PR, and issue linking"
```

---

### Task 16: Model-Agent Reference Skill

**Files:**
- Create: `vkvk/skills/model-agent-ref.md`

Lookup table for task type → tier + agent mapping.

- [ ] **Step 1: Create model-agent-ref.md**

```markdown
---
name: model-agent-ref
description: Reference table mapping task types to model tiers and agent types. Referenced by classify and triage skills.
---

# Model & Agent Reference

This is a reference document — not a standalone skill. It's used by the classify and triage skills to determine which model tier and agent type should handle a task.

## Tiers

| Tier | When to Use | Cost |
|---|---|---|
| **low** | Simple, well-scoped tasks. Bug fixes, typos, config changes, documentation. | Cheapest |
| **medium** | Standard implementation. Components, APIs, migrations, features. | Moderate |
| **high** | Complex work requiring deep reasoning. Architecture, brainstorming, cross-domain features. | Expensive |

## Agent Types

| Agent | Domain | Example Tasks |
|---|---|---|
| Frontend Developer | UI, components, pages, layouts, responsive design, accessibility | "Add user settings page", "Fix mobile sidebar layout" |
| Backend Architect | APIs, server functions, integrations, system design | "Create webhook handler for Stripe", "Add caching layer" |
| Database Optimizer | Migrations, schema design, queries, RLS, indexes | "Add user_preferences table", "Optimize slow dashboard query" |
| Software Architect | Cross-cutting architecture, domain modeling, major refactors | "Design event system for notifications", "Plan microservice split" |
| Senior Developer | Complex full-stack features spanning multiple domains | "Build real-time collaboration feature", "Implement search" |
| Security Engineer | Auth flows, RLS policies, vulnerability fixes, encryption | "Add role-based access control", "Fix XSS in comment rendering" |
| DevOps Automator | CI/CD, deployment, Docker, infrastructure, monitoring | "Set up GitHub Actions pipeline", "Add health check endpoint" |
| UX Architect | Design systems, component hierarchies, layout architecture | "Create form field component library", "Design dashboard grid system" |
| Technical Writer | Documentation, API references, README, guides | "Write API documentation", "Add migration guide for v2" |
| Rapid Prototyper | MVPs, proof-of-concepts, quick validations | "Prototype AI chat widget", "Build demo for client meeting" |

## Decision Matrix

When classifying a task, use this priority order:

1. **Does it involve database changes?** → Database Optimizer (medium)
2. **Does it involve auth/security?** → Security Engineer (medium)
3. **Does it involve CI/CD/infra?** → DevOps Automator (medium)
4. **Is it primarily UI work?** → Frontend Developer (medium)
5. **Is it primarily API/server work?** → Backend Architect (medium)
6. **Does it span multiple domains?** → Senior Developer (medium or high)
7. **Does it need architecture decisions?** → Software Architect (high)
8. **Is it documentation?** → Technical Writer (low)
9. **Is it a simple fix?** → Senior Developer (low)
10. **Default** → Senior Developer (medium)

## Tier Escalation

Bump the tier up if:
- Task description is long (>500 words) — indicates complexity
- Task has multiple acceptance criteria
- Task involves unfamiliar patterns or new integrations
- Task requires coordinating changes across many files (15+)

Bump the tier down if:
- Task is a direct copy of existing patterns ("same as X but for Y")
- Task has a clear code example in the description
- Task is a known fix with a known solution
```

- [ ] **Step 2: Commit**

```bash
git add skills/model-agent-ref.md
git commit -m "feat: add model-agent reference skill — tier and agent lookup table"
```

---

### Task 17: Final Verification

- [ ] **Step 1: Verify file structure**

Run: `find vkvk -type f | sort`

Expected output:
```
vkvk/autopilot.config.json
vkvk/oxfile.toml
vkvk/package.json
vkvk/src/api.ts
vkvk/src/classifier.ts
vkvk/src/config.ts
vkvk/src/cycle.ts
vkvk/src/discover.ts
vkvk/src/index.ts
vkvk/src/logger.ts
vkvk/src/picker.ts
vkvk/src/setup.ts
vkvk/src/types.ts
vkvk/skills/classify.md
vkvk/skills/implement.md
vkvk/skills/model-agent-ref.md
vkvk/skills/triage.md
vkvk/tsconfig.json
```

- [ ] **Step 2: Type check**

Run: `cd vkvk && bunx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Test startup**

Run: `cd vkvk && timeout 5 bun run src/index.ts || true`
Expected: Logs config loaded, attempts health check, either runs cycle or logs warning about API being unreachable.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any type-check or startup issues"
```
