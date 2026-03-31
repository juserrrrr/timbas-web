const API = () => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) throw new Error('NEXT_PUBLIC_API_URL not defined')
  return url
}

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
  leagueAccounts: { id: number; puuid: string }[]
  TeamsLeague: unknown[]
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function adminGetUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${API()}/users`, { headers: headers(token) })
  return handle<AdminUser[]>(res)
}

export async function adminUpdateRole(token: string, id: number, role: Role): Promise<AdminUser> {
  const res = await fetch(`${API()}/users/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ role }),
  })
  return handle<AdminUser>(res)
}

export async function adminDeleteUser(token: string, id: number): Promise<void> {
  const res = await fetch(`${API()}/users/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `HTTP ${res.status}`)
  }
}
