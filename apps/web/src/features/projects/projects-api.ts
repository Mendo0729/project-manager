import type {
  CreateProjectInput,
  ProjectDto,
  ProjectFilters,
  UpdateProjectInput,
} from '@project-manager/schemas'

interface ProjectResponse {
  project: ProjectDto
}

interface ProjectsResponse {
  projects: ProjectDto[]
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      payload && typeof payload.message === 'string'
        ? payload.message
        : 'No se pudo completar la solicitud.'

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function listProjects(filters: ProjectFilters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.size > 0 ? `?${params.toString()}` : ''
  const response = await apiRequest<ProjectsResponse>(`/projects${query}`)
  return response.projects
}

export async function getProject(projectId: string) {
  const response = await apiRequest<ProjectResponse>(`/projects/${projectId}`)
  return response.project
}

export async function createProject(input: CreateProjectInput) {
  const response = await apiRequest<ProjectResponse>('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.project
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
) {
  const response = await apiRequest<ProjectResponse>(`/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.project
}
