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
