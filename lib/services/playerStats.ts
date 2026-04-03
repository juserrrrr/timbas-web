import { apiFetch, authHeaders } from '../api'

export interface SideStats {
  wins: number
  losses: number
  total: number
  winRate: number
}

export interface PlayerDetailStats {
  currentStreakCount: number
  currentStreakType: 'W' | 'L' | null
  longestWinStreak: number
  recentForm: ('W' | 'L')[]
  blueSide: SideStats
  redSide: SideStats
  weeklyPerformance: { week: string; wins: number; losses: number }[]
}

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { data: PlayerDetailStats; fetchedAt: number }>()

export async function getPlayerDetailStats(
  token: string,
  discordServerId: string,
  userId: number,
): Promise<PlayerDetailStats> {
  const key = `${discordServerId}:${userId}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.data

  const API_URL = process.env.NEXT_PUBLIC_API_URL
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not defined')

  const response = await apiFetch(`${API_URL}/leaderboard/${discordServerId}/player/${userId}`, {
    headers: authHeaders(token),
  })

  if (!response.ok) throw new Error(`Falha ao buscar stats. Status: ${response.status}`)

  const data: PlayerDetailStats = await response.json()
  cache.set(key, { data, fetchedAt: Date.now() })
  return data
}
