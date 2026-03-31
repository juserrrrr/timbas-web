import { apiFetch, authHeaders } from '../api'

export interface MatchPlayer {
  userId: number
  name: string
  discordId: string
  avatar: string | null
  position: string | null
}

export interface MatchTeam {
  id: number
  players: MatchPlayer[]
}

export interface Match {
  id: number
  matchType: string
  dateCreated: string
  winnerId: number | null
  blueTeam: MatchTeam
  redTeam: MatchTeam
}

export async function getMatchHistory(token: string, discordServerId: string): Promise<Match[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not defined')

  const response = await apiFetch(`${API_URL}/leaderboard/${discordServerId}/matches`, {
    headers: authHeaders(token),
  })

  if (!response.ok) throw new Error(`Falha ao buscar histórico. Status: ${response.status}`)

  return response.json()
}
