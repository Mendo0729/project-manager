import { useCallback, useState } from 'react'

import { ChecklistSection } from './ChecklistSection'
import { TaskDetailPage } from './TaskDetailPage'
import { TaskTagsSection } from './TaskTagsSection'

export function TaskDetailWorkspacePage() {
  const [taskRevision, setTaskRevision] = useState(0)

  const handleChecklistChanged = useCallback(() => {
    setTaskRevision((revision) => revision + 1)
  }, [])

  return (
    <div className="task-detail-composite">
      <TaskDetailPage key={taskRevision} />
      <ChecklistSection onTaskChanged={handleChecklistChanged} />
      <TaskTagsSection />
    </div>
  )
}
