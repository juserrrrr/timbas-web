import { apiFetch, authHeaders } from '../api'

export interface PlayerStats {
  rank: number
  userId: number
  name: string
  discordId: string
  avatar: string | null
  wins: number
  losses: number
  score: number
  totalGames: number
  winRate: number
}

export async function getRanking(token: string, discordServerId: string): Promise<PlayerStats[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not defined')

  const response = await apiFetch(`${API_URL}/leaderboard/${discordServerId}`, {
    headers: authHeaders(token),
  })

  if (!response.ok) throw new Error(`Falha ao buscar os dados do ranking. Status: ${response.status}`)

  return response.json()
}
