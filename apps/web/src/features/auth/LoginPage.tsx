import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login({ email, password })
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'No se pudo iniciar sesión.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-showcase" aria-hidden="true">
        <div className="brand-lockup login-brand">
          <span className="brand-mark">PM</span>
          <div>
            <strong>Project Manager</strong>
            <span>Gestión de proyectos</span>
          </div>
        </div>

        <div className="login-showcase-copy">
          <span className="page-kicker light">Organiza. Prioriza. Avanza.</span>
          <h1>Del plan al resultado, en un solo lugar.</h1>
          <p>
            Cada usuario accede a su propio espacio para organizar proyectos,
            hitos, semanas y tareas diarias.
          </p>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-card" aria-labelledby="login-title">
          <div className="login-mobile-brand">
            <span className="brand-mark">PM</span>
            <strong>Project Manager</strong>
          </div>

          <span className="page-kicker">Acceso seguro</span>
          <h1 id="login-title">Bienvenido de nuevo</h1>
          <p className="login-copy">
            Inicia sesión para acceder a tu espacio de trabajo.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Correo electrónico
              <input
                autoComplete="email"
                inputMode="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label>
              Contraseña
              <input
                autoComplete="current-password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tu contraseña"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button className="primary-button login-submit" disabled={submitting} type="submit">
              {submitting ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="login-footnote">
            Project Manager · Acceso por cuenta
          </p>
        </div>
      </section>
    </main>
  )
}
