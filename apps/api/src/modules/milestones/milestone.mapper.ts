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

export function mapMilestone(
  record: MilestoneRecord,
  calculatedProgress?: number,
): MilestoneDto {
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    description: record.description,
    status: record.status,
    weight: record.weight,
    targetDate: record.targetDate,
    position: record.position,
    progress:
      record.status === 'completed'
        ? 100
        : Math.max(0, Math.min(100, calculatedProgress ?? 0)),
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
