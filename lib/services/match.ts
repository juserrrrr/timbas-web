import { apiFetch } from '../api'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface PlayerUser {
  id: number
  discordId: string
  name: string
  avatar: string | null
}

export interface UserTeamLeague {
  id: number
  matchId: number | null
  userId: number
  user: PlayerUser
  teamLeagueId: number | null
  position: string | null
}

export interface TeamLeague {
  id: number
  side: 'BLUE' | 'RED'
  players: UserTeamLeague[]
}

export type MatchStatus = 'WAITING' | 'STARTED' | 'FINISHED' | 'EXPIRED'
export type MatchTypeEnum = 'ALEATORIO' | 'LIVRE' | 'ALEATORIO_COMPLETO' | 'BALANCEADO'

export interface CustomLeagueMatch {
  id: number
  ServerDiscordId: string
  creatorDiscordId: string | null
  status: MatchStatus
  matchType: MatchTypeEnum
  showDetails: boolean
  teamBlueId: number | null
  teamRedId: number | null
  winnerId: number | null
  queuePlayers: UserTeamLeague[]
  Teams: TeamLeague[]
  dateCreated: string
  startedAt: string | null
  finishedAt: string | null
  expiresAt: string | null
}

const h = (token?: string): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

export async function getMatch(id: number, token?: string): Promise<CustomLeagueMatch> {
  const res = await apiFetch(`${API_URL}/leagueMatch/${id}`, { headers: h(token), cache: 'no-store' })
  if (!res.ok) throw new Error('Partida não encontrada')
  return res.json()
}

export async function joinMatch(token: string, id: number, discordId: string) {
  const res = await apiFetch(`${API_URL}/leagueMatch/${id}/join`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ discordId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao entrar' }))
    throw new Error(err.message || 'Erro ao entrar na partida')
  }
  return res.json()
}

export async function leaveMatch(token: string, id: number, discordId: string) {
  const res = await apiFetch(`${API_URL}/leagueMatch/${id}/leave`, {
    method: 'DELETE',
    headers: h(token),
    body: JSON.stringify({ discordId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao sair' }))
    throw new Error(err.message || 'Erro ao sair da partida')
  }
  return res.json()
}

export async function drawTeams(token: string, id: number, requesterDiscordId: string) {
  const res = await apiFetch(`${API_URL}/leagueMatch/${id}/draw`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ requesterDiscordId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao sortear' }))
    throw new Error(err.message || 'Erro ao sortear os times')
  }
  return res.json()
}

export async function startMatch(token: string, id: number, requesterDiscordId: string) {
  const res = await apiFetch(`${API_URL}/leagueMatch/${id}/start`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ requesterDiscordId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao iniciar' }))
    throw new Error(err.message || 'Erro ao iniciar a partida')
  }
  return res.json()
}

export async function finishMatch(token: string, id: number, requesterDiscordId: string, winner: 'BLUE' | 'RED') {
  const res = await apiFetch(`${API_URL}/leagueMatch/${id}/finish`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ requesterDiscordId, winner }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao finalizar' }))
    throw new Error(err.message || 'Erro ao finalizar a partida')
  }
  return res.json()
}
