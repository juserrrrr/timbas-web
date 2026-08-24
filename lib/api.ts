import { clearAllTokens, endImpersonation, isImpersonating } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

async function tryRefresh(): Promise<boolean> {
  if (isImpersonating()) return false

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (endImpersonation()) {
    window.location.href = '/admin/players'
    return
  }
  clearAllTokens()
  window.location.href = '/login'
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, { ...options, credentials: options.credentials ?? 'include' })

  if (res.status === 401) {
    const refreshed = await tryRefresh()

    if (refreshed) {
      res = await fetch(url, { ...options, credentials: options.credentials ?? 'include' })
    }

    if (res.status === 401) {
      redirectToLogin()
      throw new Error('Sessão expirada. Redirecionando para o login...')
    }
  }

  return res
}

export function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}
