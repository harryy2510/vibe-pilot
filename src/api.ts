import type {
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
	constructor(
		private baseUrl: string,
		private remoteApiBase?: string,
	) {}

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

		// All local API responses are wrapped: { success, data, message?, error_data? }
		const json = await res.json() as Record<string, unknown>

		// If it has a `success` wrapper, unwrap `data`
		if ('success' in json && 'data' in json) {
			return json.data as T
		}

		// Some endpoints (health, etc.) return raw
		return json as T
	}

	// Get auth token from local server for remote API calls
	private async getAuthToken(): Promise<string> {
		const data = await this.request<{ access_token: string; expires_at: string | null }>('GET', '/api/auth/token')
		return data.access_token
	}

	// Remote API requests go directly to VK_SHARED_API_BASE with bearer auth
	private async remoteRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
		if (!this.remoteApiBase) {
			throw new Error('Remote API base not configured — set vk_shared_api_base in config')
		}

		const token = await this.getAuthToken()
		const url = `${this.remoteApiBase}${path}`
		const headers: Record<string, string> = {
			Authorization: `Bearer ${token}`,
		}
		if (body) headers['Content-Type'] = 'application/json'

		const res = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		})

		if (!res.ok) {
			const text = await res.text().catch(() => 'no body')
			throw new Error(`VK Remote API ${method} ${path} failed (${res.status}): ${text}`)
		}

		return res.json() as Promise<T>
	}

	// -- Health --

	async isHealthy(): Promise<boolean> {
		try {
			await fetch(`${this.baseUrl}/api/health`)
			return true
		} catch {
			return false
		}
	}

	// -- Organizations --

	async listOrganizations(): Promise<{ organizations: Array<{ id: string; name: string; slug: string }> }> {
		return this.request('GET', '/api/organizations')
	}

	// -- Projects --

	async listProjects(orgId: string): Promise<{ projects: Project[] }> {
		return this.request('GET', `/api/remote/projects?organization_id=${orgId}`)
	}

	async getProject(projectId: string): Promise<Project> {
		return this.request('GET', `/api/remote/projects/${projectId}`)
	}

	async createProject(body: {
		organization_id: string
		name: string
		color: string
	}): Promise<MutationResponse<Project>> {
		return this.remoteRequest('POST', '/v1/projects', body)
	}

	// -- Project Statuses --

	async listProjectStatuses(projectId: string): Promise<{ project_statuses: ProjectStatus[] }> {
		return this.request('GET', `/api/remote/project-statuses?project_id=${projectId}`)
	}

	async createProjectStatus(body: {
		project_id: string
		name: string
		color: string
		sort_order: number
	}): Promise<MutationResponse<ProjectStatus>> {
		return this.remoteRequest('POST', '/v1/project_statuses', {
			...body,
			hidden: false,
		})
	}

	async updateProjectStatus(statusId: string, body: {
		hidden?: boolean
		name?: string
		color?: string
		sort_order?: number
	}): Promise<MutationResponse<ProjectStatus>> {
		return this.remoteRequest('PATCH', `/v1/project_statuses/${statusId}`, body)
	}

	// -- Issues --

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
		return this.request('POST', '/api/remote/issues', {
			...body,
			extension_metadata: {},
		})
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

	// -- Tags --

	async listTags(projectId: string): Promise<{ tags: Tag[] }> {
		return this.request('GET', `/api/remote/tags?project_id=${projectId}`)
	}

	async createTag(body: {
		project_id: string
		name: string
		color: string
	}): Promise<MutationResponse<Tag>> {
		return this.remoteRequest('POST', '/v1/tags', body)
	}

	async deleteTag(tagId: string): Promise<void> {
		await this.remoteRequest('DELETE', `/v1/tags/${tagId}`)
	}

	// -- Issue Tags --

	async listIssueTags(issueId: string): Promise<{ issue_tags: IssueTag[] }> {
		return this.request('GET', `/api/remote/issue-tags?issue_id=${issueId}`)
	}

	async addIssueTag(body: {
		issue_id: string
		tag_id: string
	}): Promise<MutationResponse<IssueTag>> {
		return this.request('POST', '/api/remote/issue-tags', body)
	}

	// -- Issue Relationships --

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

	// -- Repos --

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

	async addDefaultRepo(projectId: string, repoId: string): Promise<void> {
		await this.request('POST', `/api/projects/${projectId}/default-repos`, {
			repo_id: repoId,
		})
	}

	// -- Workspaces --

	async listWorkspaces(): Promise<Workspace[]> {
		return this.request('GET', '/api/workspaces')
	}

	async startWorkspace(body: CreateAndStartWorkspaceRequest): Promise<CreateAndStartWorkspaceResponse> {
		return this.request('POST', '/api/workspaces/start', body)
	}

	async linkWorkspaceToIssue(workspaceId: string, body: {
		project_id: string
		issue_id: string
	}): Promise<void> {
		await this.request('POST', `/api/workspaces/${workspaceId}/links`, body)
	}

	async getWorkspaceRepos(workspaceId: string): Promise<Array<{ repo_id: string; target_branch: string }>> {
		return this.request('GET', `/api/workspaces/${workspaceId}/repos`)
	}
}
