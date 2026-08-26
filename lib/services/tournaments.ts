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
  TournamentEaAwardsResponse,
  TournamentRegistrationInvite,
  TournamentStaffCandidate,
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

const tournamentListCache = new Map<string, { expiresAt: number; request: Promise<{ total: number; items: TournamentSummary[] }> }>()

export function listTournaments(params: {
  status?: string
  game?: string
} = {}): Promise<{ total: number; items: TournamentSummary[] }> {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][],
  )
  const path = `/tournaments${search.size ? `?${search}` : ""}`
  const cached = tournamentListCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.request

  const next = request<{ total: number; items: TournamentSummary[] }>(path).catch((error) => {
    tournamentListCache.delete(path)
    throw error
  })
  tournamentListCache.set(path, { expiresAt: Date.now() + 2_000, request: next })
  return next
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

export function createTournamentRegistrationInvite(id: string): Promise<{ tournamentId: string; code: string }> {
  return post(`/tournaments/${id}/invites`)
}

export function listTournamentRegistrationInvites(id: string): Promise<TournamentRegistrationInvite[]> {
  return request(`/tournaments/${id}/invites`)
}

export function revokeTournamentRegistrationInvite(id: string, inviteId: string) {
  return remove<{ revoked: boolean }>(`/tournaments/${id}/invites/${inviteId}`)
}

export function searchTournamentStaffCandidates(id: string, search = ""): Promise<TournamentStaffCandidate[]> {
  const query = new URLSearchParams({ search })
  return request(`/tournaments/${id}/staff-candidates?${query}`)
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

export interface EaMatchChoice {
  eaMatchId: string
  playedAt: string
  homeScore: number
  awayScore: number
  officialHomeScore?: number
  officialAwayScore?: number
  suspiciousScore?: boolean
  warning?: string
  durationSeconds?: number
}

export type CheckTournamentEaResultResponse =
  | TournamentMatch
  | { selectionRequired: true; candidates: EaMatchChoice[] }

export function checkTournamentEaResult(id: string, matchId: string, eaMatchId?: string) {
  return post<CheckTournamentEaResultResponse>(`/tournaments/${id}/matches/${matchId}/check-ea`, { eaMatchId })
}

export interface LabEaRescanResult {
  eaMatchId: string
  kind: "CONSISTENT" | "SCORE_MISMATCH" | "INTERRUPTED"
  officialHomeScore: number
  officialAwayScore: number
  inferredHomeScore: number
  inferredAwayScore: number
  durationSeconds: number
  nonZeroUserResults: number
  playerCount: number
  restoredPlayerStats: number
}

export function rescanClosedLabEaResult(id: string, matchId: string) {
  return post<LabEaRescanResult>(`/tournaments/${id}/matches/${matchId}/lab/rescan-ea`)
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

export function rejectTournamentEaAudit(id: string, matchId: string) {
  return post(`/tournaments/${id}/matches/${matchId}/reject-ea-audit`)
}

export function getTournamentEaStats(id: string) {
  return request<TournamentEaPlayerStats[]>(`/tournaments/${id}/ea-stats`)
}

export function getTournamentEaAwards(id: string) {
  return request<TournamentEaAwardsResponse>(`/tournaments/${id}/ea-awards`)
}

export function updateTeam(id: string, teamId: string, input: Record<string, unknown>) {
  return patch<TournamentTeam>(`/tournaments/${id}/teams/${teamId}`, input)
}

export function replaceTournamentTeamEaClub(id: string, teamId: string, name: string) {
  return patch<TournamentTeam>(`/tournaments/${id}/teams/${teamId}/ea-club`, {
    name,
    platform: "common-gen5",
  })
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

export function correctLabTournamentResult(id: string, matchId: string, homeScore: number, awayScore: number) {
  return patch<TournamentMatch>(`/tournaments/${id}/matches/${matchId}/correct-result`, { homeScore, awayScore })
}

export function buildLabTournamentKnockout(id: string) {
  return post<TournamentMatch[]>(`/tournaments/${id}/lab/knockout`)
}

export function rebuildLabTournamentKnockout(id: string) {
  return post<TournamentMatch[]>(`/tournaments/${id}/lab/knockout/rebuild`)
}

export interface LabEaScoreAuditItem {
  matchId: string
  label: string | null
  homeTeamName: string
  awayTeamName: string
  officialHomeScore: number
  officialAwayScore: number
  inferredHomeScore: number
  inferredAwayScore: number
  eaMatchId: string | null
  kind: "SCORE_MISMATCH" | "INTERRUPTED"
  durationSeconds: number
  nonZeroUserResults: number
  playerCount: number
  reason: string
}

export function getLabEaScoreAudit(id: string) {
  return request<LabEaScoreAuditItem[]>(`/tournaments/${id}/lab/score-audit`)
}

export function discardInterruptedLabEaResult(id: string, matchId: string) {
  return post<TournamentMatch>(`/tournaments/${id}/matches/${matchId}/lab/discard-ea-result`)
}

export function cancelTournamentWalkover(id: string, matchId: string, homeScore: number, awayScore: number) {
  return post<TournamentMatch>(`/tournaments/${id}/matches/${matchId}/cancel-walkover`, { homeScore, awayScore })
}

export function scheduleMatch(id: string, matchId: string, scheduledAt: string) {
  return patch(`/tournaments/${id}/matches/${matchId}/schedule`, { scheduledAt })
}

export function declareWalkover(
  id: string,
  matchId: string,
  winnerTeamId: string,
  reason: string | undefined,
  homeScore: number,
  awayScore: number,
) {
  return post(`/tournaments/${id}/matches/${matchId}/walkover`, { winnerTeamId, reason, homeScore, awayScore })
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
  eaAutoSyncEnabled: boolean
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

export function setTournamentMatchReady(id: string, matchId: string, ready: boolean) {
  return post(`/tournaments/${id}/matches/${matchId}/ready`, { ready })
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
