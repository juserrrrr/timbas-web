import { apiFetch } from '@/lib/api'
import { apiBase } from '../api-base'

const API = () => apiBase()

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'BOT' | 'USER' | 'PLAYER'

export interface AdminUser {
  id: number
  name: string
  email: string | null
  role: Role
  discordId: string
  lastLoginIp: string | null
  lastLoginAt: string | null
  leagueAccounts: { id: number; puuid: string }[]
  TeamsLeague: unknown[]
}

// ─── Users ────────────────────────────────────────────────────────────────────

// Todas as chamadas passam pelo apiFetch: o login por Discord guarda o token num
// cookie httpOnly e o navegador só o envia com credentials. Sem isso o header
// Authorization vai com a dica de sessão, que não é um JWT, e a API devolve 401
// até para quem é admin.

export async function adminGetUsers(token: string): Promise<AdminUser[]> {
  const res = await apiFetch(`${API()}/users`, { headers: headers(token), cache: 'no-store' })
  return handle<AdminUser[]>(res)
}

export async function adminUpdateRole(token: string, id: number, role: Role): Promise<AdminUser> {
  const res = await apiFetch(`${API()}/users/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ role }),
  })
  return handle<AdminUser>(res)
}

export async function adminDeleteUser(token: string, id: number): Promise<void> {
  const res = await apiFetch(`${API()}/users/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `HTTP ${res.status}`)
  }
}

export async function adminImpersonateUser(token: string, id: number): Promise<{ token: string; user: { id: number; name: string }; expiresInSeconds: number }> {
  const res = await apiFetch(`${API()}/admin/access/users/${id}/impersonate`, { method: 'POST', headers: headers(token) })
  return handle(res)
}
