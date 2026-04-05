const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface PlayerStats {
  rank: number
  userId: number
  name: string
  discordId: string
  avatar: string | null
  score: number
  wins: number
  losses: number
  totalGames: number
  winRate: number
}

export interface SideStats {
  wins: number
  losses: number
  total: number
  winRate: number
}

export interface PositionStat {
  position: string
  wins: number
  losses: number
  total: number
  winRate: number
}

export interface MatchTypeStat {
  type: string
  label: string
  wins: number
  losses: number
  total: number
  winRate: number
}

export interface PlayerDetailStats {
  currentStreakCount: number
  currentStreakType: "W" | "L" | null
  longestWinStreak: number
  recentForm: ("W" | "L")[]
  blueSide: SideStats
  redSide: SideStats
  weeklyPerformance: { week: string; wins: number; losses: number }[]
  positionStats: PositionStat[]
  matchTypeStats: MatchTypeStat[]
}

export interface DuoStat {
  userId: number
  name: string
  discordId: string
  avatar: string | null
  games: number
  wins: number
  losses: number
  winRate: number
}

export interface DuoStats {
  partners: DuoStat[]
  opponents: DuoStat[]
}

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
  playersPerTeam: number
  dateCreated: string
  winnerId: number | null
  blueTeam: MatchTeam
  redTeam: MatchTeam
}

export interface PaginatedMatches {
  data: Match[]
  total: number
  page: number
  pages: number
  hasNext: boolean
}

async function serverFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  })
  if (res.status === 401) throw new Error("UNAUTHORIZED")
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
}

export async function fetchRanking(token: string, serverId: string, mode?: number): Promise<PlayerStats[]> {
  const url = `${API_URL}/leaderboard/${serverId}${mode ? `?mode=${mode}` : ""}`
  return serverFetch<PlayerStats[]>(url, token)
}

export async function fetchMatchHistory(
  token: string,
  serverId: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedMatches> {
  const url = `${API_URL}/leaderboard/${serverId}/matches?page=${page}&limit=${limit}`
  return serverFetch<PaginatedMatches>(url, token)
}

export async function fetchPlayerDetailStats(
  token: string,
  serverId: string,
  userId: number,
): Promise<PlayerDetailStats> {
  const url = `${API_URL}/leaderboard/${serverId}/player/${userId}`
  return serverFetch<PlayerDetailStats>(url, token)
}

export async function fetchDuoStats(token: string, serverId: string, userId: number): Promise<DuoStats> {
  const url = `${API_URL}/leaderboard/${serverId}/player/${userId}/duo`
  return serverFetch<DuoStats>(url, token)
}
