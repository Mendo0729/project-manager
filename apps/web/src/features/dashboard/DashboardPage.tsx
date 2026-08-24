import { useAuth } from '../auth/AuthProvider'

const sections = [
  {
    title: 'Proyectos',
    description: 'Organiza proyectos, hitos y tareas y mide su avance.',
  },
  {
    title: 'Esta semana',
    description: 'Define lo importante de la semana y monitorea lo completado.',
  },
  {
    title: 'Hoy',
    description: 'Concéntrate en las tareas programadas para el día.',
  },
]

export function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Project Manager · MVP</span>
          <h1>Hola, {user?.displayName}.</h1>
        </div>
        <button className="secondary-button" onClick={() => void logout()} type="button">
          Cerrar sesión
        </button>
      </header>

      <section className="hero">
        <p>
          La autenticación ya protege el espacio de trabajo. Los próximos módulos
          conectarán proyectos, semanas y tareas a esta sesión.
        </p>
      </section>

      <section className="grid" aria-label="Módulos principales">
        {sections.map((section) => (
          <article className="card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span>Preparado para implementar</span>
          </article>
        ))}
      </section>
    </main>
  )
}
