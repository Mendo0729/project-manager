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
      <section className="login-card" aria-labelledby="login-title">
        <span className="eyebrow">Project Manager</span>
        <h1 id="login-title">Iniciar sesión</h1>
        <p className="login-copy">
          Accede a tus proyectos, planificación semanal y tareas del día.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Correo
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
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

          <button disabled={submitting} type="submit">
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}
