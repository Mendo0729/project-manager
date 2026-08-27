import type {
  ChecklistItemDto,
  CreateChecklistItemInput,
  CreateSubtaskInput,
  CreateTaskInput,
  TaskDetailDto,
  TaskDto,
  TaskFilters,
  UpdateChecklistItemInput,
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

interface TaskOrderResponse {
  taskIds: string[]
}

interface SubtaskResponse {
  subtask: TaskDto
}

interface SubtasksResponse {
  subtasks: TaskDto[]
}

interface DeleteSubtaskResponse {
  deletedSubtaskId: string
}

interface ChecklistResponse {
  checklist: ChecklistItemDto[]
}

interface ChecklistItemResponse {
  item: ChecklistItemDto
}

interface DeleteChecklistItemResponse {
  deletedChecklistItemId: string
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

export async function reorderTasks(taskIds: string[]) {
  const response = await apiRequest<TaskOrderResponse>('/tasks/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds }),
  })
  return response.taskIds
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

export async function deleteSubtask(taskId: string, subtaskId: string) {
  const response = await apiRequest<DeleteSubtaskResponse>(
    `/tasks/${taskId}/subtasks/${subtaskId}`,
    { method: 'DELETE' },
  )
  return response.deletedSubtaskId
}

export async function reorderSubtasks(taskId: string, subtaskIds: string[]) {
  const response = await apiRequest<SubtasksResponse>(
    `/tasks/${taskId}/subtasks/order`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtaskIds }),
    },
  )
  return response.subtasks
}

export async function listChecklist(taskId: string) {
  const response = await apiRequest<ChecklistResponse>(
    `/tasks/${taskId}/checklist`,
  )
  return response.checklist
}

export async function createChecklistItem(
  taskId: string,
  input: CreateChecklistItemInput,
) {
  const response = await apiRequest<ChecklistItemResponse>(
    `/tasks/${taskId}/checklist`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return response.item
}

export async function updateChecklistItem(
  taskId: string,
  itemId: string,
  input: UpdateChecklistItemInput,
) {
  const response = await apiRequest<ChecklistItemResponse>(
    `/tasks/${taskId}/checklist/${itemId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return response.item
}

export async function deleteChecklistItem(taskId: string, itemId: string) {
  const response = await apiRequest<DeleteChecklistItemResponse>(
    `/tasks/${taskId}/checklist/${itemId}`,
    { method: 'DELETE' },
  )
  return response.deletedChecklistItemId
}

export async function reorderChecklist(taskId: string, itemIds: string[]) {
  const response = await apiRequest<ChecklistResponse>(
    `/tasks/${taskId}/checklist/order`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds }),
    },
  )
  return response.checklist
}
