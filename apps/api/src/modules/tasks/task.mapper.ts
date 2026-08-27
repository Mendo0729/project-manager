import type {
  ChecklistItemDto,
  TaskDetailDto,
  TaskDto,
  TaskStatus,
} from '@project-manager/schemas'

export interface TaskRecord {
  id: string
  projectId: string | null
  milestoneId: string | null
  parentTaskId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate: string | null
  estimatedMinutes: number | null
  weight: number
  position: number
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ChecklistRecord {
  id: string
  taskId: string
  title: string
  isCompleted: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

export function mapChecklistItem(record: ChecklistRecord): ChecklistItemDto {
  return {
    id: record.id,
    taskId: record.taskId,
    title: record.title,
    isCompleted: record.isCompleted,
    position: record.position,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function calculateTaskProgress(
  status: TaskStatus,
  subtasks: TaskRecord[] = [],
  checklist: ChecklistRecord[] = [],
) {
  if (status === 'completed') {
    return 100
  }

  const activeSubtasks = subtasks.filter((subtask) => subtask.status !== 'canceled')
  if (activeSubtasks.length > 0) {
    const completed = activeSubtasks.filter(
      (subtask) => subtask.status === 'completed',
    ).length

    return Math.round((completed / activeSubtasks.length) * 100)
  }

  if (checklist.length > 0) {
    const completed = checklist.filter((item) => item.isCompleted).length
    return Math.round((completed / checklist.length) * 100)
  }

  return 0
}

export function mapTask(record: TaskRecord, progress?: number): TaskDto {
  return {
    id: record.id,
    projectId: record.projectId,
    milestoneId: record.milestoneId,
    parentTaskId: record.parentTaskId,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    dueDate: record.dueDate,
    estimatedMinutes: record.estimatedMinutes,
    weight: record.weight,
    position: record.position,
    progress:
      progress ?? (record.status === 'completed' ? 100 : 0),
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function mapTaskDetail(
  record: TaskRecord,
  subtasks: TaskRecord[],
  checklist: ChecklistRecord[],
): TaskDetailDto {
  const progress = calculateTaskProgress(record.status, subtasks, checklist)

  return {
    ...mapTask(record, progress),
    subtasks: subtasks.map((subtask) => mapTask(subtask)),
    checklist: checklist.map(mapChecklistItem),
  }
}
