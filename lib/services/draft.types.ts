import type { CompetitionRole, UserRef } from "./tournaments.types"

export type DraftLeagueStatus = "SETUP" | "DRAFTING" | "ACTIVE" | "FINISHED"
export type DraftOrderType = "SNAKE" | "LINEAR"
export type DraftMatchStatus = "SCHEDULED" | "AWAITING_PROOF" | "FINISHED"
export type TransferOfferKind = "BUY_FREE_AGENT" | "BUY_FROM_ROSTER" | "SWAP"
export type TransferOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED"

export interface DraftPlayer {
  id: string
  name: string
  position: string
  overall: number
  realTeam: string | null
  nationality: string | null
  photoUrl: string | null
  price: number
  rosterId: string | null
  starter: boolean
  slot: string | null
  appearances: number
  goals: number
  assists: number
  rating: number | null
  roster?: { id: string; name: string; tag: string | null } | null
}

export interface DraftRoster {
  id: string
  name: string
  tag: string | null
  logoUrl: string | null
  formation: string
  draftOrder: number
  userId: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
  user: UserRef
  players: DraftPlayer[]
}

export interface DraftAccess {
  isPlatformAdmin: boolean
  isOwner: boolean
  isModerator: boolean
  canManage: boolean
  canModerate: boolean
  rosterId: string | null
}

export interface DraftBoard {
  active: boolean
  totalPicks: number
  currentPickNumber: number
  currentRound?: number
  pickDeadline?: string | null
  onTheClock: { id: string; name: string; draftOrder: number } | null
  queue: Array<{ round: number; roster: { id: string; name: string; draftOrder: number } }>
}

export interface DraftStandingRow {
  position: number
  rosterId: string
  name: string
  tag: string | null
  logoUrl: string | null
  manager: UserRef
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface DraftLeagueSummary {
  id: string
  name: string
  description: string | null
  status: DraftLeagueStatus
  orderType: DraftOrderType
  rosterSize: number
  formation: string
  pickSeconds: number
  matchDays: number[]
  matchHour: number
  totalRounds: number
  currentRound: number
  transferWindowOpen: boolean
  createdAt: string
  _count?: { rosters: number; players: number }
  staff?: Array<{ user: UserRef }>
}

export interface DraftLeagueDetail extends DraftLeagueSummary {
  currentPickNumber: number
  pickDeadline: string | null
  pointsWin: number
  pointsDraw: number
  coinsWin: number
  coinsDraw: number
  coinsLoss: number
  startedAt: string | null
  finishedAt: string | null
  staff: Array<{ id: string; userId: number; role: CompetitionRole; user: UserRef }>
  rosters: DraftRoster[]
  access: DraftAccess
  standings: DraftStandingRow[]
  board: DraftBoard
}

export interface DraftMatch {
  id: string
  round: number
  homeRosterId: string
  awayRosterId: string
  homeScore: number | null
  awayScore: number | null
  status: DraftMatchStatus
  scheduledAt: string
  playedAt: string | null
  homeRoster: { id: string; name: string; tag: string | null; logoUrl: string | null; userId: number }
  awayRoster: { id: string; name: string; tag: string | null; logoUrl: string | null; userId: number }
  proofs: Array<{
    id: string
    status: string
    claimedHomeScore: number
    claimedAwayScore: number
    aiHomeScore: number | null
    aiAwayScore: number | null
    aiConfidence: number | null
    aiAgrees: boolean | null
    aiNotes: string | null
    createdAt: string
  }>
}

export interface TransferOffer {
  id: string
  kind: TransferOfferKind
  status: TransferOfferStatus
  price: number
  message: string | null
  offeredPlayerId: string | null
  createdAt: string
  respondedAt: string | null
  expiresAt: string | null
  fromRosterId: string
  toRosterId: string | null
  player: { id: string; name: string; position: string; overall: number; photoUrl: string | null }
  fromRoster: { id: string; name: string; tag: string | null; logoUrl: string | null }
  toRoster: { id: string; name: string; tag: string | null; logoUrl: string | null } | null
  canRespond: boolean
  canCancel: boolean
}

export const DRAFT_STATUS_LABELS: Record<DraftLeagueStatus, string> = {
  SETUP: "Montando a liga",
  DRAFTING: "Draft ao vivo",
  ACTIVE: "Temporada em andamento",
  FINISHED: "Temporada encerrada",
}

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export const OFFER_KIND_LABELS: Record<TransferOfferKind, string> = {
  BUY_FREE_AGENT: "Contratação de jogador livre",
  BUY_FROM_ROSTER: "Proposta de compra",
  SWAP: "Proposta de troca",
}

export const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"]

export const POSITION_GROUPS: Record<string, string[]> = {
  GOL: ["GOL", "GK"],
  DEF: ["ZAG", "LD", "LE", "CB", "LB", "RB", "DEF"],
  MEI: ["VOL", "MC", "MEI", "CDM", "CM", "CAM", "MD", "ME"],
  ATA: ["ATA", "PD", "PE", "SA", "ST", "LW", "RW", "CF"],
}
