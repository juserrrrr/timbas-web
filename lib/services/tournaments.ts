import { apiUrl, fetchImageObjectUrl, patch, post, remove, request } from "./http"
import type {
  CompetitionGame,
  CompetitionRole,
  PendingProof,
  ReportResultResponse,
  TournamentDetail,
  TournamentFormat,
  TournamentSummary,
  TournamentTeam,
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
  coinsWin?: number
  coinsDraw?: number
  coinsLoss?: number
  coinsChampion?: number
  coinsRunnerUp?: number
  requireProof?: boolean
  autoApproveProof?: boolean
  autoApproveMinConfidence?: number
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
  input: { name: string; tag?: string; logoUrl?: string; eaClubId?: string; memberIds?: number[] },
) {
  return post<TournamentTeam>(`/tournaments/${id}/teams`, input)
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

export function listPendingProofs(id: string): Promise<PendingProof[]> {
  return request(`/tournaments/${id}/proofs/pending`)
}

export function reviewProof(id: string, proofId: string, approve: boolean, note?: string) {
  return post(`/tournaments/${id}/proofs/${proofId}/review`, { approve, note })
}

export function fetchProofImage(id: string, proofId: string): Promise<string> {
  return fetchImageObjectUrl(apiUrl(`/tournaments/${id}/proofs/${proofId}/image`))
}
