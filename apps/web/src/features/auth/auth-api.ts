import type { AuthResponse, LoginInput } from '@project-manager/schemas'

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      payload && typeof payload.message === 'string'
        ? payload.message
        : 'No se pudo completar la solicitud.'

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function login(input: LoginInput) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function getCurrentUser() {
  return apiRequest<AuthResponse>('/auth/me')
}

export function logout() {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
  })
}
