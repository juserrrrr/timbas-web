export type EaClubPlatform = "common-gen5" | (string & {})

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

export interface EaSyncResult {
  imported: number
  skipped?: number
  failed?: number
  errors?: string[]
  lastSyncAt?: string
}
