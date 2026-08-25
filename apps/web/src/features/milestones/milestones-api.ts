import type {
  CreateMilestoneInput,
  MilestoneDto,
  MilestoneFilters,
  ReorderMilestonesInput,
  UpdateMilestoneInput,
} from '@project-manager/schemas'

interface MilestoneResponse {
  milestone: MilestoneDto
}

interface MilestonesResponse {
  milestones: MilestoneDto[]
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

export async function listMilestones(
  projectId: string,
  filters: MilestoneFilters = {},
) {
  const params = new URLSearchParams()

  if (filters.status) {
    params.set('status', filters.status)
  }

  const query = params.size > 0 ? `?${params.toString()}` : ''
  const response = await apiRequest<MilestonesResponse>(
    `/projects/${projectId}/milestones${query}`,
  )
  return response.milestones
}

export async function getMilestone(projectId: string, milestoneId: string) {
  const response = await apiRequest<MilestoneResponse>(
    `/projects/${projectId}/milestones/${milestoneId}`,
  )
  return response.milestone
}

export async function createMilestone(
  projectId: string,
  input: CreateMilestoneInput,
) {
  const response = await apiRequest<MilestoneResponse>(
    `/projects/${projectId}/milestones`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return response.milestone
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: UpdateMilestoneInput,
) {
  const response = await apiRequest<MilestoneResponse>(
    `/projects/${projectId}/milestones/${milestoneId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return response.milestone
}

export async function reorderMilestones(
  projectId: string,
  input: ReorderMilestonesInput,
) {
  const response = await apiRequest<MilestonesResponse>(
    `/projects/${projectId}/milestones/order`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return response.milestones
}
