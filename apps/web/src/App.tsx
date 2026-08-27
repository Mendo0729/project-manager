import { Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from './features/auth/LoginPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { RegisterPage } from './features/auth/RegisterPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { MilestoneDetailPage } from './features/milestones/MilestoneDetailPage'
import { MilestoneFormPage } from './features/milestones/MilestoneFormPage'
import { ProjectDetailPage } from './features/projects/ProjectDetailPage'
import { ProjectFormPage } from './features/projects/ProjectFormPage'
import { ProjectsPage } from './features/projects/ProjectsPage'
import './features/projects/projects.css'
import './features/milestones/milestones.css'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/edit" element={<ProjectFormPage />} />
        <Route
          path="/projects/:projectId/milestones/new"
          element={<MilestoneFormPage />}
        />
        <Route
          path="/projects/:projectId/milestones/:milestoneId"
          element={<MilestoneDetailPage />}
        />
        <Route
          path="/projects/:projectId/milestones/:milestoneId/edit"
          element={<MilestoneFormPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
