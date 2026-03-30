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

export async function getPlayerDetailStats(
  token: string,
  discordServerId: string,
  userId: number,
): Promise<PlayerDetailStats> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not defined')

  const response = await fetch(`${API_URL}/leaderboard/${discordServerId}/player/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) throw new Error(`Falha ao buscar stats. Status: ${response.status}`)

  return response.json()
}
