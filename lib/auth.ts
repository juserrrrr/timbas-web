const TOKEN_KEY = 'timbas_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TOKEN_KEY}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function setToken(token: string) {
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function clearToken() {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}

export interface TokenPayload {
  id: string
  name: string
  email: string
  role: string
  sub: string
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}
