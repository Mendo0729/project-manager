import { useMemo } from 'react'

import { useAuth } from '../auth/AuthProvider'

const projects = [
  {
    name: 'Project Manager PWA',
    status: 'En progreso',
    progress: 42,
    meta: '8 de 19 tareas',
  },
  {
    name: 'Portafolio MendoTech',
    status: 'En progreso',
    progress: 76,
    meta: '13 de 17 tareas',
  },
  {
    name: 'Catálogo de perfumes',
    status: 'Planificado',
    progress: 18,
    meta: '2 de 11 tareas',
  },
]

const todayTasks = [
  { title: 'Validar autenticación de la PWA', project: 'Project Manager', done: true },
  { title: 'Definir pantalla inicial de proyectos', project: 'Project Manager', done: false },
  { title: 'Revisar pendientes de infraestructura', project: 'MendoTech', done: false },
  { title: 'Organizar tareas de la semana', project: 'Personal', done: false },
]

const navigation = ['Resumen', 'Proyectos', 'Esta semana', 'Hoy', 'Historial']

export function DashboardPage() {
  const { user, logout } = useAuth()

  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat('es-PA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [],
  )

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">PM</span>
          <div>
            <strong>Project Manager</strong>
            <span>Workspace personal</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Navegación principal">
          {navigation.map((item, index) => (
            <button
              className={index === 0 ? 'nav-item active' : 'nav-item'}
              key={item}
              type="button"
            >
              <span className="nav-dot" aria-hidden="true" />
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span className="profile-avatar">
              {user?.displayName?.slice(0, 1).toUpperCase() ?? 'U'}
            </span>
            <div>
              <strong>{user?.displayName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="text-button" onClick={() => void logout()} type="button">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-header">
          <div>
            <span className="page-kicker">Resumen</span>
            <h1>Hola, {user?.displayName?.split(' ')[0]}.</h1>
            <p className="header-date">{currentDate}</p>
          </div>

          <div className="header-actions">
            <label className="search-field">
              <span className="sr-only">Buscar</span>
              <input aria-label="Buscar" placeholder="Buscar en tu espacio…" type="search" />
            </label>
            <button className="primary-button" type="button">
              Nueva tarea
            </button>
          </div>
        </header>

        <div className="preview-banner">
          Vista preliminar · Los datos mostrados son ejemplos hasta conectar los módulos reales.
        </div>

        <section className="metrics-grid" aria-label="Resumen general">
          <article className="metric-card">
            <span>Proyectos activos</span>
            <strong>3</strong>
            <small>1 próximo a completar</small>
          </article>
          <article className="metric-card">
            <span>Tareas pendientes</span>
            <strong>8</strong>
            <small>4 programadas para hoy</small>
          </article>
          <article className="metric-card">
            <span>Progreso semanal</span>
            <strong>68%</strong>
            <small>17 de 25 completadas</small>
          </article>
          <article className="metric-card">
            <span>Tiempo registrado</span>
            <strong>2h 40m</strong>
            <small>Hoy</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-column dashboard-column-main">
            <article className="panel focus-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-label">Objetivo semanal</span>
                  <h2>Completar la base funcional de Project Manager</h2>
                </div>
                <span className="status-pill">Semana actual</span>
              </div>

              <p>
                Dejar lista la autenticación, navegación inicial y estructura necesaria
                para comenzar el módulo de proyectos.
              </p>

              <div className="progress-row">
                <div className="progress-track" aria-label="68% completado">
                  <span style={{ width: '68%' }} />
                </div>
                <strong>68%</strong>
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading compact">
                <div>
                  <span className="panel-label">Proyectos</span>
                  <h2>En movimiento</h2>
                </div>
                <button className="link-button" type="button">Ver todos</button>
              </div>

              <div className="project-list">
                {projects.map((project) => (
                  <div className="project-row" key={project.name}>
                    <div className="project-icon" aria-hidden="true">
                      {project.name.slice(0, 1)}
                    </div>
                    <div className="project-info">
                      <div className="project-title-row">
                        <div>
                          <strong>{project.name}</strong>
                          <span>{project.meta}</span>
                        </div>
                        <span className="project-status">{project.status}</span>
                      </div>
                      <div className="progress-track small">
                        <span style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="dashboard-column">
            <article className="panel today-panel">
              <div className="panel-heading compact">
                <div>
                  <span className="panel-label">Hoy</span>
                  <h2>Prioridades del día</h2>
                </div>
                <span className="counter-pill">1 / 4</span>
              </div>

              <div className="task-list">
                {todayTasks.map((task) => (
                  <div className={task.done ? 'task-row done' : 'task-row'} key={task.title}>
                    <span className="task-check" aria-hidden="true">
                      {task.done ? '✓' : ''}
                    </span>
                    <div>
                      <strong>{task.title}</strong>
                      <span>{task.project}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel deadline-panel">
              <span className="panel-label">Próximo vencimiento</span>
              <div className="deadline-date">
                <strong>28</strong>
                <span>AGO</span>
              </div>
              <div>
                <h2>Finalizar módulo de autenticación</h2>
                <p>Project Manager PWA</p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}
