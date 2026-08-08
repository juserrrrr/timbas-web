export type EaClubPlatform = "common-gen5" | (string & {})
export type EaMatchResult = "WIN" | "DRAW" | "LOSS"

export interface EaClub {
  id: string
  externalClubId: string
  name: string
  platform: EaClubPlatform
  nickname?: string | null
  createdAt: string
  updatedAt: string
  lastSyncAt?: string | null
}

export interface EaClubPreview {
  externalClubId: string
  name: string
  platform: EaClubPlatform
}

export interface EaClubDashboard {
  club: EaClub
  matches: number
  wins: number
  draws: number
  losses: number
  winRate: number
  goalsFor: number
  goalsAgainst: number
  recentMatches: EaClubMatch[]
}

export interface EaClubMatch {
  id: string
  externalMatchId: string
  clubId: string
  playedAt: string
  opponentExternalId?: string | null
  opponentName: string
  goalsFor: number
  goalsAgainst: number
  result: EaMatchResult
  isHome: boolean
  homeClubId?: string
  awayClubId?: string
  homeClubName?: string
  awayClubName?: string
  homeScore?: number
  awayScore?: number
}

export interface EaMatchPlayerStat {
  player: EaClubPlayer
  position?: string | null
  rating?: number | null
  goals: number
  assists: number
  shots?: number | null
  passesAttempted?: number | null
  passesCompleted?: number | null
  tacklesAttempted?: number | null
  tacklesCompleted?: number | null
  saves?: number | null
  manOfTheMatch?: boolean | null
}

export interface EaClubMatchDetail extends EaClubMatch {
  club: EaClub
  players: EaMatchPlayerStat[]
}

export interface EaClubPlayer {
  id: string
  clubId: string
  externalPlayerId?: string | null
  playerName: string
  appearances?: number
}

export interface EaClubPlayerProfile extends EaClubPlayer {
  matches: number
  goals: number
  assists: number
  goalContributions: number
  averageRating?: number | null
  manOfTheMatch: number
  shots?: number | null
  passesAttempted?: number | null
  passesCompleted?: number | null
  tacklesAttempted?: number | null
  tacklesCompleted?: number | null
  saves?: number | null
  goalsPerMatch: number
  assistsPerMatch: number
  goalContributionsPerMatch: number
  passAccuracy?: number | null
  tackleAccuracy?: number | null
}

export interface EaLeaderboardEntry {
  player: EaClubPlayer
  value: number
  appearances?: number
}

export interface EaLeaderboardCategory {
  key: string
  label: string
  entries: EaLeaderboardEntry[]
  minimumMatches?: number
}

export interface EaMatchFilters {
  from?: string
  to?: string
  result?: EaMatchResult
  opponent?: string
  playerId?: string
  page?: number
  limit?: number
}

export interface Paginated<T> {
  data: T[]
  page: number
  pages: number
  total: number
}

export interface EaSyncResult {
  imported: number
  skipped?: number
  failed?: number
  errors?: string[]
  lastSyncAt?: string
}
