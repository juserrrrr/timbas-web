import type { GameModeEnum } from '../game-mode'
export type { GameModeEnum }
import { API_URL } from '../api-base'


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
  mvpCount: number
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

export interface GameModeStat {
  gameMode: GameModeEnum
  label: string
  mapName: string
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
  gameModeStats: GameModeStat[]
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
  gameMode: GameModeEnum
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

/** Omitir `mode` ou `gameMode` significa geral: todos os tamanhos ou todos os mapas. */
export function buildRankingUrl(serverId: string, mode?: number, gameMode?: GameModeEnum): string {
  const params = new URLSearchParams()
  if (mode) params.set('mode', String(mode))
  if (gameMode) params.set('gameMode', gameMode)
  const query = params.toString()
  return `${API_URL}/leaderboard/${serverId}${query ? `?${query}` : ''}`
}

export async function fetchRanking(
  token: string,
  serverId: string,
  mode?: number,
  gameMode?: GameModeEnum,
): Promise<PlayerStats[]> {
  return serverFetch<PlayerStats[]>(buildRankingUrl(serverId, mode, gameMode), token)
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
