import type { ProjectDto } from '@project-manager/schemas'

export interface ProjectRecord {
  id: string
  name: string
  description: string | null
  status: 'planned' | 'active' | 'paused' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  startDate: string | null
  targetDate: string | null
  progressMode: 'automatic' | 'manual'
  manualProgress: number | null
  completedAt: Date | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function mapProject(record: ProjectRecord): ProjectDto {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    priority: record.priority,
    startDate: record.startDate,
    targetDate: record.targetDate,
    progressMode: record.progressMode,
    progress:
      record.progressMode === 'manual'
        ? (record.manualProgress ?? 0)
        : 0,
    manualProgress: record.manualProgress,
    completedAt: record.completedAt?.toISOString() ?? null,
    archivedAt: record.archivedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
