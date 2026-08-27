import type {
  CreateSubtaskInput,
  CreateTaskInput,
  TaskDetailDto,
  TaskDto,
  TaskFilters,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from '@project-manager/schemas'

interface TaskResponse {
  task: TaskDto
}

interface TaskDetailResponse {
  task: TaskDetailDto
}

interface TasksResponse {
  tasks: TaskDto[]
}

interface SubtaskResponse {
  subtask: TaskDto
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

function buildTaskQuery(filters: TaskFilters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })

  return params.size > 0 ? `?${params.toString()}` : ''
}

export async function listTasks(filters: TaskFilters = {}) {
  const response = await apiRequest<TasksResponse>(
    `/tasks${buildTaskQuery(filters)}`,
  )
  return response.tasks
}

export async function listProjectTasks(
  projectId: string,
  filters: TaskFilters = {},
) {
  const response = await apiRequest<TasksResponse>(
    `/projects/${projectId}/tasks${buildTaskQuery(filters)}`,
  )
  return response.tasks
}

export async function listMilestoneTasks(
  projectId: string,
  milestoneId: string,
  filters: TaskFilters = {},
) {
  const response = await apiRequest<TasksResponse>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks${buildTaskQuery(filters)}`,
  )
  return response.tasks
}

export async function getTask(taskId: string) {
  const response = await apiRequest<TaskDetailResponse>(`/tasks/${taskId}`)
  return response.task
}

export async function createTask(input: CreateTaskInput) {
  const response = await apiRequest<TaskResponse>('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.task
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const response = await apiRequest<TaskResponse>(`/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.task
}

export async function createSubtask(
  taskId: string,
  input: CreateSubtaskInput,
) {
  const response = await apiRequest<SubtaskResponse>(`/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.subtask
}

export async function updateSubtask(
  taskId: string,
  subtaskId: string,
  input: UpdateSubtaskInput,
) {
  const response = await apiRequest<SubtaskResponse>(
    `/tasks/${taskId}/subtasks/${subtaskId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return response.subtask
}
