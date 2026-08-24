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

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <span className="eyebrow">Project Manager · MVP</span>
        <h1>Proyectos, semana y día en un solo lugar.</h1>
        <p>
          Base inicial de la PWA. El siguiente paso será conectar estas vistas al
          modelo real de proyectos y tareas.
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
