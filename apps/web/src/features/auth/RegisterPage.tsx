import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from './AuthProvider'

export function RegisterPage() {
  const { user, loading, register } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)

    try {
      await register({ displayName, email, password })
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : 'No se pudo crear la cuenta.',
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
          <span className="page-kicker light">Tu espacio. Tus proyectos.</span>
          <h1>Crea una cuenta y empieza a organizarte.</h1>
          <p>
            Cada usuario mantiene sus proyectos, tareas y planificación en un espacio independiente.
          </p>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-card" aria-labelledby="register-title">
          <div className="login-mobile-brand">
            <span className="brand-mark">PM</span>
            <strong>Project Manager</strong>
          </div>

          <span className="page-kicker">Crear cuenta</span>
          <h1 id="register-title">Empieza aquí</h1>
          <p className="login-copy">
            Crea tu cuenta para administrar tus proyectos de forma independiente.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input
                autoComplete="name"
                name="displayName"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Tu nombre"
                required
                type="text"
                value={displayName}
              />
            </label>

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
                autoComplete="new-password"
                minLength={12}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 12 caracteres"
                required
                type="password"
                value={password}
              />
            </label>

            <label>
              Confirmar contraseña
              <input
                autoComplete="new-password"
                minLength={12}
                name="confirmPassword"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite la contraseña"
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button className="primary-button login-submit" disabled={submitting} type="submit">
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="login-footnote">
            ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
