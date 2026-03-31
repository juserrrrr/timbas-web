const TOKEN_KEY = 'timbas_token'
const REFRESH_TOKEN_KEY = 'timbas_refresh_token'

function getCookie(key: string): string | null {
  if (typeof window === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(key: string, value: string, maxAge: number) {
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function deleteCookie(key: string) {
  document.cookie = `${key}=; path=/; max-age=0`
}

export function getToken(): string | null {
  return getCookie(TOKEN_KEY)
}

export function setToken(token: string) {
  setCookie(TOKEN_KEY, token, 60 * 60 * 24 * 7) // 7 days
}

export function clearToken() {
  deleteCookie(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string) {
  setCookie(REFRESH_TOKEN_KEY, token, 60 * 60 * 24 * 30) // 30 days
}

export function clearRefreshToken() {
  deleteCookie(REFRESH_TOKEN_KEY)
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return typeof decoded.exp === 'number' && decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function clearAllTokens() {
  clearToken()
  clearRefreshToken()
}

export interface TokenPayload {
  id: string
  name: string
  email: string
  role: string
  sub: string
  discordId?: string
  avatar?: string
}

export function getDiscordAvatarUrl(discordId?: string, avatar?: string, size = 128): string | null {
  if (discordId && avatar) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=${size}`
  }
  if (discordId) {
    const index = Number(BigInt(discordId) % BigInt(6))
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`
  }
  return null
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}
