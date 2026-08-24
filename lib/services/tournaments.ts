import { apiUrl, fetchImageObjectUrl, patch, post, remove, request } from "./http"
import type {
  CompetitionGame,
  CompetitionRole,
  PendingProof,
  ReportResultResponse,
  TournamentDetail,
  TournamentFormat,
  TournamentMatch,
  TournamentSummary,
  TournamentTeam,
  TournamentEaPlayerStats,
} from "./tournaments.types"

export interface CreateTournamentInput {
  name: string
  description?: string
  game?: CompetitionGame
  gameLabel?: string
  format?: TournamentFormat
  maxTeams?: number
  teamSize?: number
  groupCount?: number
  advancePerGroup?: number
  legs?: number
  thirdPlace?: boolean
  allowDraws?: boolean
  requireProof?: boolean
  autoApproveProof?: boolean
  autoApproveMinConfidence?: number
  accessMode?: "PUBLIC" | "INVITE_ONLY"
  invitedUsernames?: string[]
  registrationEndsAt?: string
  autoStartOnClose?: boolean
  startsAt?: string
  woAfterHours?: number
  matchWindowMinutes?: number
  graceMinutes?: number
}

export function listTournaments(params: {
  status?: string
  game?: string
} = {}): Promise<{ total: number; items: TournamentSummary[] }> {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][],
  )
  return request(`/tournaments${search.size ? `?${search}` : ""}`)
}

export function getTournament(id: string): Promise<TournamentDetail> {
  return request(`/tournaments/${id}`)
}

export function createTournament(input: CreateTournamentInput): Promise<TournamentSummary> {
  return post("/tournaments", input)
}

export function joinTournamentByInvite(code: string): Promise<{ tournamentId: string }> {
  return post("/tournaments/join-by-invite", { code })
}

export function updateTournament(id: string, input: Partial<CreateTournamentInput> & { status?: string }) {
  return patch<TournamentSummary>(`/tournaments/${id}`, input)
}

export function deleteTournament(id: string) {
  return remove<{ deleted: boolean }>(`/tournaments/${id}`)
}

export function startTournament(id: string) {
  return post<TournamentSummary>(`/tournaments/${id}/start`)
}

export function addTeam(
  id: string,
  input: { name: string; tag?: string; logoUrl?: string; eaClubId?: string; eaPlatform?: string; memberIds?: number[]; captainUsername?: string },
) {
  return post<TournamentTeam>(`/tournaments/${id}/teams`, input)
}

export function validateTournamentEaClub(id: string, name: string) {
  return post<{ externalClubId: string; name: string; platform: string }>(`/tournaments/${id}/ea-club/validate`, {
    name,
    platform: "common-gen5",
  })
}

export function checkTournamentEaResult(id: string, matchId: string) {
  return post<TournamentMatch>(`/tournaments/${id}/matches/${matchId}/check-ea`)
}

export function requestTournamentMatchReview(id: string, matchId: string, reason: string) {
  return post(`/tournaments/${id}/matches/${matchId}/request-review`, { reason })
}

export function listPendingMatchReviews(id: string): Promise<TournamentMatch[]> {
  return request(`/tournaments/${id}/reviews/pending`)
}

export function resolveTournamentMatchReview(id: string, matchId: string, homeScore: number, awayScore: number) {
  return post(`/tournaments/${id}/matches/${matchId}/resolve-review`, { homeScore, awayScore })
}

export function getTournamentEaStats(id: string) {
  return request<TournamentEaPlayerStats[]>(`/tournaments/${id}/ea-stats`)
}

export function updateTeam(id: string, teamId: string, input: Record<string, unknown>) {
  return patch<TournamentTeam>(`/tournaments/${id}/teams/${teamId}`, input)
}

export function removeTeam(id: string, teamId: string) {
  return remove<{ deleted: boolean }>(`/tournaments/${id}/teams/${teamId}`)
}

export function setSeeds(id: string, seeds: Array<{ teamId: string; seed: number }>) {
  return post<TournamentTeam[]>(`/tournaments/${id}/seeds`, { seeds })
}

export function setStaff(id: string, userId: number, role: CompetitionRole) {
  return post(`/tournaments/${id}/staff`, { userId, role })
}

export function removeStaff(id: string, userId: number) {
  return remove(`/tournaments/${id}/staff/${userId}`)
}

export function transferOwnership(id: string, userId: number) {
  return post(`/tournaments/${id}/staff/${userId}/transfer-ownership`)
}

export function reportResult(
  id: string,
  matchId: string,
  input: { homeScore: number; awayScore: number; imageBase64?: string; mimeType?: string },
): Promise<ReportResultResponse> {
  return post(`/tournaments/${id}/matches/${matchId}/report`, input)
}

export function scheduleMatch(id: string, matchId: string, scheduledAt: string) {
  return patch(`/tournaments/${id}/matches/${matchId}/schedule`, { scheduledAt })
}

export function declareWalkover(id: string, matchId: string, winnerTeamId: string, reason?: string) {
  return post(`/tournaments/${id}/matches/${matchId}/walkover`, { winnerTeamId, reason })
}

export interface MatchMessage {
  id: string
  body: string
  system: boolean
  teamId: string | null
  createdAt: string
  user: { id: number; name: string; avatar: string | null } | null
}

export interface MatchRoom {
  match: TournamentMatch & {
    readyAt: string | null
    scheduleProposedAt: string | null
    scheduleProposedByTeamId: string | null
    claimedHomeScore: number | null
    claimedAwayScore: number | null
    claimedByTeamId: string | null
  }
  messages: MatchMessage[]
  mySide: "HOME" | "AWAY" | null
  canModerate: boolean
  deadlineAt: string | null
  matchWindowMinutes: number
  graceMinutes: number
  requireOpponentConfirm: boolean
  resultMode: "EA_API" | "AI_IMAGE" | "MANUAL"
}

export function getMatchRoom(id: string, matchId: string): Promise<MatchRoom> {
  return request(`/tournaments/${id}/matches/${matchId}/chat`)
}

export function postMatchMessage(id: string, matchId: string, body: string): Promise<MatchMessage> {
  return post(`/tournaments/${id}/matches/${matchId}/chat`, { body })
}

export function proposeMatchSchedule(id: string, matchId: string, scheduledAt: string) {
  return post(`/tournaments/${id}/matches/${matchId}/propose`, { scheduledAt })
}

export function respondMatchSchedule(id: string, matchId: string, accept: boolean) {
  return post(`/tournaments/${id}/matches/${matchId}/propose/respond`, { accept })
}

export function requestMatchGrace(id: string, matchId: string) {
  return post(`/tournaments/${id}/matches/${matchId}/grace`)
}

export function claimMatchResult(id: string, matchId: string, homeScore: number, awayScore: number) {
  return post(`/tournaments/${id}/matches/${matchId}/claim`, { homeScore, awayScore })
}

export function respondMatchClaim(id: string, matchId: string, agree: boolean) {
  return post(`/tournaments/${id}/matches/${matchId}/claim/respond`, { agree })
}

export function listPendingProofs(id: string): Promise<PendingProof[]> {
  return request(`/tournaments/${id}/proofs/pending`)
}

export function reviewProof(id: string, proofId: string, approve: boolean, note?: string) {
  return post(`/tournaments/${id}/proofs/${proofId}/review`, { approve, note })
}

export function fetchProofImage(id: string, proofId: string): Promise<string> {
  return fetchImageObjectUrl(apiUrl(`/tournaments/${id}/proofs/${proofId}/image`))
}
