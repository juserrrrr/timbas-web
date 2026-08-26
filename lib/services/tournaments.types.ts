export type CompetitionGame = "EA_FC" | "LOL" | "VALORANT" | "CS" | "ROCKET_LEAGUE" | "OTHER"
export type TournamentFormat = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "GROUPS_KNOCKOUT"
export type TournamentStatus = "DRAFT" | "REGISTRATION" | "RUNNING" | "FINISHED" | "CANCELLED"
export type TournamentPhase = "GROUP" | "LEAGUE" | "WINNERS" | "LOSERS" | "GRAND_FINAL" | "THIRD_PLACE"
export type TournamentMatchStatus = "PENDING" | "READY" | "AWAITING_PROOF" | "DISPUTED" | "FINISHED" | "WALKOVER"
export type CompetitionRole = "OWNER" | "MODERATOR"
export type TournamentAccessMode = "PUBLIC" | "INVITE_ONLY"
export type MatchProofStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface UserRef {
  id: number
  name: string
  avatar: string | null
}

export interface TournamentSummary {
  id: string
  name: string
  slug: string
  description: string | null
  game: CompetitionGame
  gameLabel: string | null
  accessMode: TournamentAccessMode
  inviteCode: string | null
  format: TournamentFormat
  status: TournamentStatus
  maxTeams: number
  bannerUrl: string | null
  startsAt: string | null
  registrationEndsAt: string | null
  finishedAt: string | null
  championTeamId: string | null
  createdAt: string
  owner: UserRef | null
  teamCount: number
  matchCount: number
}

export interface TournamentTeam {
  id: string
  name: string
  tag: string | null
  logoUrl: string | null
  seed: number | null
  groupId: string | null
  ownerDiscordId: string | null
  eaClubId: string | null
  eaPlatform: string | null
  eliminated: boolean
  played: number
  wins: number
  draws: number
  losses: number
  scoreFor: number
  scoreAgainst: number
  points: number
  members: Array<{ id: string; userId: number; captain: boolean; user: UserRef }>
}

export interface TeamRef {
  id: string
  name: string
  tag: string | null
  logoUrl: string | null
  seed: number | null
}

export interface MatchProof {
  id: string
  status: MatchProofStatus
  claimedHomeScore: number
  claimedAwayScore: number
  aiHomeScore: number | null
  aiAwayScore: number | null
  aiConfidence: number | null
  aiAgrees: boolean | null
  aiNotes: string | null
  aiProvider: string | null
  aiModel: string | null
  submittedByDiscordId: string
  reviewNote: string | null
  createdAt: string
}

export interface TournamentMatch {
  id: string
  groupId: string | null
  phase: TournamentPhase
  round: number
  position: number
  leg: number
  label: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  homeTeam: TeamRef | null
  awayTeam: TeamRef | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  status: TournamentMatchStatus
  readyAt: string | null
  homeReadyAt: string | null
  awayReadyAt: string | null
  scheduledAt: string | null
  homeGraceUsed: boolean
  awayGraceUsed: boolean
  playedAt: string | null
  eaMatchId: string | null
  eaVerifiedAt: string | null
  eaTags: string[]
  eaLastCheckedAt: string | null
  eaNextCheckAt: string | null
  eaCheckMessage: string | null
  claimedHomeScore?: number | null
  claimedAwayScore?: number | null
  reviewRequestedAt?: string | null
  reviewReason?: string | null
  reviewSource?: "HUMAN" | "AUDIT"
  reviewCanReject?: boolean
  eaPlayerStats?: Array<{
    id: string
    teamId: string
    externalPlayerId: string | null
    playerName: string
    position: string | null
    rating: number | null
    goals: number
    assists: number
    shots: number | null
    passesAttempted: number | null
    passesCompleted: number | null
    tacklesAttempted: number | null
    tacklesCompleted: number | null
  saves: number | null
  yellowCards: number | null
  redCards: number | null
    manOfTheMatch: boolean | null
    tags: string[]
  }>
  proofs: MatchProof[]
}

export interface StandingRow {
  position: number
  teamId: string
  name: string
  tag: string | null
  logoUrl: string | null
  played: number
  wins: number
  draws: number
  losses: number
  scoreFor: number
  scoreAgainst: number
  scoreDiff: number
  points: number
  eliminated: boolean
}

export interface TournamentAccess {
  isPlatformAdmin: boolean
  isOwner: boolean
  isModerator: boolean
  canManage: boolean
  canModerate: boolean
  canView: boolean
  isInvited: boolean
  teamIds: string[]
}

export interface TournamentDetail extends Omit<TournamentSummary, "owner" | "teamCount" | "matchCount"> {
  labMode: boolean
  teamSize: number
  groupCount: number
  advancePerGroup: number
  legs: number
  thirdPlace: boolean
  allowDraws: boolean
  pointsWin: number
  pointsDraw: number
  pointsLoss: number
  requireProof: boolean
  requireOpponentConfirm: boolean
  woAfterHours: number
  matchWindowMinutes: number
  graceMinutes: number
  autoApproveProof: boolean
  autoApproveMinConfidence: number
  runnerUpTeamId: string | null
  teams: TournamentTeam[]
  groups: Array<{ id: string; name: string; order: number }>
  staff: Array<{ id: string; userId: number; role: CompetitionRole; user: UserRef }>
  matches: TournamentMatch[]
  access: TournamentAccess
  standings: Array<{ groupId: string | null; groupName: string; rows: StandingRow[] }>
}

export interface PendingProof extends MatchProof {
  match: {
    id: string
    label: string | null
    round: number
    phase: TournamentPhase
    homeTeam: { id: string; name: string; logoUrl: string | null } | null
    awayTeam: { id: string; name: string; logoUrl: string | null } | null
  }
}

export interface ReportResultResponse {
  match: TournamentMatch | null
  proof: MatchProof | null
  autoApproved: boolean
  processing: boolean
}

export interface TournamentEaPlayerStats {
  playerName: string
  externalPlayerId: string | null
  team: { id: string; name: string; logoUrl: string | null } | null
  appearances: number
  ratedAppearances: number
  teamMatches: number
  goals: number
  assists: number
  goalContributions: number
  craqueScore?: number | null
  averageRating: number | null
  mvps: number
  passesAttempted: number
  passesCompleted: number
  passAccuracy: number | null
  tacklesAttempted: number
  tacklesCompleted: number
  tackleSuccess: number | null
  shots: number
  saves: number
  yellowCards: number
  redCards: number
  tags: string[]
}

export interface TournamentEaAward {
  key: "ARTILHEIRO" | "GARCOM" | "CRAQUE" | "MAESTRO" | "XERIFE" | "MURALHA"
  title: string
  subtitle: string
  player: TournamentEaPlayerStats
  value: string
}

export interface TournamentEaAwardsResponse {
  source: "EA_API"
  finalized: boolean
  players: TournamentEaPlayerStats[]
  championCard: {
    tournamentName: string
    team: { id: string; name: string; logoUrl: string | null }
    players: Array<{ playerName: string; appearances: number }>
  } | null
  criteria: {
    craqueMinimumAppearances: number
    craqueMinimumShare: number
    craquePriorGames: number
    craqueTournamentAverageRating: number
    craqueFormula: string
    tieBreakers: string[]
  }
  awards: TournamentEaAward[]
}

export const GAME_LABELS: Record<CompetitionGame, string> = {
  EA_FC: "EA Sports FC",
  LOL: "League of Legends",
  VALORANT: "Valorant",
  CS: "Counter-Strike",
  ROCKET_LEAGUE: "Rocket League",
  OTHER: "Outro jogo",
}

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  SINGLE_ELIMINATION: "Eliminação simples",
  DOUBLE_ELIMINATION: "Eliminação dupla",
  ROUND_ROBIN: "Pontos corridos",
  GROUPS_KNOCKOUT: "Grupos + mata-mata",
}

export const FORMAT_DESCRIPTIONS: Record<TournamentFormat, string> = {
  SINGLE_ELIMINATION: "Perdeu, está fora. A chave mais rápida de resolver.",
  DOUBLE_ELIMINATION: "Todo mundo tem uma segunda chance na chave dos perdedores.",
  ROUND_ROBIN: "Todos contra todos, campeão é quem somar mais pontos.",
  GROUPS_KNOCKOUT: "Fase de grupos classifica para o mata-mata, estilo Copa.",
}

export const STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: "Rascunho",
  REGISTRATION: "Inscrições abertas",
  RUNNING: "Em andamento",
  FINISHED: "Encerrado",
  CANCELLED: "Cancelado",
}

export const PHASE_LABELS: Record<TournamentPhase, string> = {
  GROUP: "Fase de grupos",
  LEAGUE: "Pontos corridos",
  WINNERS: "Chave principal",
  LOSERS: "Repescagem",
  GRAND_FINAL: "Grande final",
  THIRD_PLACE: "3º lugar",
}

export const MATCH_STATUS_LABELS: Record<TournamentMatchStatus, string> = {
  PENDING: "Aguardando times",
  READY: "Pronta para jogar",
  AWAITING_PROOF: "Aguardando validação",
  DISPUTED: "Em disputa",
  FINISHED: "Encerrada",
  WALKOVER: "W.O.",
}
