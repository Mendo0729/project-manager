import type { DatabaseConnection } from '@project-manager/database'

import { calculateTaskProgress } from '../tasks/task.mapper.js'
import {
  listChecklistForProgress,
  listSubtasksForProgress,
} from '../tasks/task-progress.repository.js'
import { listMilestoneTaskProgressRows } from './milestone.repository.js'

interface MilestoneProgressTarget {
  id: string
  status: 'planned' | 'active' | 'completed' | 'canceled'
}

export async function getMilestoneProgressMap(
  database: DatabaseConnection,
  userId: string,
  milestones: MilestoneProgressTarget[],
) {
  if (milestones.length === 0) {
    return new Map<string, number>()
  }

  const milestoneIds = milestones.map((milestone) => milestone.id)
  const tasks = await listMilestoneTaskProgressRows(database, userId, milestoneIds)
  const taskIds = tasks.map((task) => task.id)
  const [subtasks, checklist] = await Promise.all([
    listSubtasksForProgress(database, userId, taskIds),
    listChecklistForProgress(database, userId, taskIds),
  ])

  const subtasksByParent = new Map<string, typeof subtasks>()
  for (const subtask of subtasks) {
    if (!subtask.parentTaskId) continue
    const rows = subtasksByParent.get(subtask.parentTaskId) ?? []
    rows.push(subtask)
    subtasksByParent.set(subtask.parentTaskId, rows)
  }

  const checklistByTask = new Map<string, typeof checklist>()
  for (const item of checklist) {
    const rows = checklistByTask.get(item.taskId) ?? []
    rows.push(item)
    checklistByTask.set(item.taskId, rows)
  }

  const tasksByMilestone = new Map<string, typeof tasks>()
  for (const task of tasks) {
    if (!task.milestoneId || task.status === 'canceled') continue
    const rows = tasksByMilestone.get(task.milestoneId) ?? []
    rows.push(task)
    tasksByMilestone.set(task.milestoneId, rows)
  }

  const progress = new Map<string, number>()

  for (const milestone of milestones) {
    if (milestone.status === 'completed') {
      progress.set(milestone.id, 100)
      continue
    }

    const milestoneTasks = tasksByMilestone.get(milestone.id) ?? []
    const totalWeight = milestoneTasks.reduce(
      (sum, task) => sum + task.weight,
      0,
    )

    if (totalWeight === 0) {
      progress.set(milestone.id, 0)
      continue
    }

    const weightedProgress = milestoneTasks.reduce((sum, task) => {
      const taskProgress = calculateTaskProgress(
        task.status,
        subtasksByParent.get(task.id) ?? [],
        checklistByTask.get(task.id) ?? [],
      )

      return sum + taskProgress * task.weight
    }, 0)

    progress.set(
      milestone.id,
      Math.round(weightedProgress / totalWeight),
    )
  }

  return progress
}
