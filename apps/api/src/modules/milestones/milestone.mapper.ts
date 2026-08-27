import type { MilestoneDto } from '@project-manager/schemas'

export interface MilestoneRecord {
  id: string
  projectId: string
  name: string
  description: string | null
  status: 'planned' | 'active' | 'completed' | 'canceled'
  weight: number
  targetDate: string | null
  position: number
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function milestoneProgress(status: MilestoneRecord['status']) {
  return status === 'completed' ? 100 : 0
}

export function mapMilestone(record: MilestoneRecord): MilestoneDto {
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    description: record.description,
    status: record.status,
    weight: record.weight,
    targetDate: record.targetDate,
    position: record.position,
    progress: milestoneProgress(record.status),
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
