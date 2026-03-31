import { getToken, setToken, clearAllTokens, getRefreshToken, setRefreshToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.acessToken) {
      setToken(data.acessToken)
      if (data.refreshToken) setRefreshToken(data.refreshToken)
      return data.acessToken
    }
    return null
  } catch {
    return null
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  clearAllTokens()
  window.location.href = '/login'
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, options)

  if (res.status === 401) {
    const newToken = await tryRefresh()

    if (newToken) {
      const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) ?? {}),
        Authorization: `Bearer ${newToken}`,
      }
      res = await fetch(url, { ...options, headers })
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
