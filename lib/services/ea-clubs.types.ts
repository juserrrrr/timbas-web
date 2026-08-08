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
  eaStatsUpdatedAt?: string | null
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
  trackingStartedAt: string
  earliestImportedMatchAt?: string | null
  eaAllTimeStats?: {
    gamesPlayed?: number | null
    wins?: number | null
    draws?: number | null
    losses?: number | null
    goalsFor?: number | null
    goalsAgainst?: number | null
    updatedAt?: string | null
  } | null
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
  careerGames?: number | null
  careerGoals?: number | null
  careerAssists?: number | null
  careerMvps?: number | null
  careerRating?: number | null
  careerStatsUpdatedAt?: string | null
  eaClubGames?: number | null
  eaClubGoals?: number | null
  eaClubAssists?: number | null
  eaClubMvps?: number | null
  eaClubRating?: number | null
  eaClubPassesMade?: number | null
  eaClubPassSuccessRate?: number | null
  eaClubTacklesMade?: number | null
  eaClubTackleSuccessRate?: number | null
  eaClubShotSuccessRate?: number | null
  eaClubCleanSheetsDef?: number | null
  eaClubCleanSheetsGk?: number | null
  eaClubRedCards?: number | null
  eaClubStatsUpdatedAt?: string | null
}

export type EaClubPlayerProfile = EaClubPlayer

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
  source?: "EA_CAREER" | "EA_CLUB"
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
