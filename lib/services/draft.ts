import { apiUrl, fetchImageObjectUrl, patch, post, remove, request } from "./http"
import type {
  DraftLeagueDetail,
  DraftLeagueSummary,
  DraftMatch,
  DraftPlayer,
  DraftRoster,
  TransferOffer,
  TransferOfferKind,
} from "./draft.types"
import type { CompetitionRole } from "./tournaments.types"

export interface CreateDraftLeagueInput {
  name: string
  description?: string
  orderType?: "SNAKE" | "LINEAR"
  rosterSize?: number
  formation?: string
  pickSeconds?: number
  matchDays?: number[]
  matchHour?: number
  pointsWin?: number
  pointsDraw?: number
  coinsWin?: number
  coinsDraw?: number
  coinsLoss?: number
}

export interface PlayerImportInput {
  name: string
  position: string
  overall?: number
  realTeam?: string
  nationality?: string
  photoUrl?: string
  price?: number
}

export function listDraftLeagues(params: { status?: string } = {}): Promise<DraftLeagueSummary[]> {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][],
  )
  return request(`/draft${search.size ? `?${search}` : ""}`)
}

export function getDraftLeague(id: string): Promise<DraftLeagueDetail> {
  return request(`/draft/${id}`)
}

export function createDraftLeague(input: CreateDraftLeagueInput): Promise<DraftLeagueSummary> {
  return post("/draft", input)
}

export function updateDraftLeague(id: string, input: Partial<CreateDraftLeagueInput> & { status?: string; transferWindowOpen?: boolean }) {
  return patch<DraftLeagueSummary>(`/draft/${id}`, input)
}

export function deleteDraftLeague(id: string) {
  return remove<{ deleted: boolean }>(`/draft/${id}`)
}

export function joinDraftLeague(id: string, input: { name: string; tag?: string; logoUrl?: string }) {
  return post<DraftRoster>(`/draft/${id}/join`, input)
}

export function leaveDraftLeague(id: string) {
  return remove<{ left: boolean }>(`/draft/${id}/join`)
}

export function listDraftPlayers(
  id: string,
  params: { free?: boolean; search?: string; position?: string } = {},
): Promise<DraftPlayer[]> {
  const search = new URLSearchParams()
  if (params.free) search.set("free", "true")
  if (params.search) search.set("search", params.search)
  if (params.position) search.set("position", params.position)
  return request(`/draft/${id}/players${search.size ? `?${search}` : ""}`)
}

export function importDraftPlayers(id: string, players: PlayerImportInput[], replace = false) {
  return post<{ imported: number; total: number }>(`/draft/${id}/players`, { players, replace })
}

export function removeDraftPlayer(id: string, playerId: string) {
  return remove<{ deleted: boolean }>(`/draft/${id}/players/${playerId}`)
}

export function setDraftStaff(id: string, userId: number, role: CompetitionRole) {
  return post(`/draft/${id}/staff`, { userId, role })
}

export function removeDraftStaff(id: string, userId: number) {
  return remove(`/draft/${id}/staff/${userId}`)
}

export function transferDraftOwnership(id: string, userId: number) {
  return post(`/draft/${id}/staff/${userId}/transfer-ownership`)
}

export function startDraft(id: string, shuffle = true) {
  return post<DraftLeagueSummary>(`/draft/${id}/start?shuffle=${shuffle}`)
}

export function makePick(id: string, playerId: string, rosterId?: string) {
  return post(`/draft/${id}/pick`, { playerId, rosterId })
}

export function setLineup(id: string, formation: string, starters: Array<{ playerId: string; slot: string }>) {
  return post<DraftRoster>(`/draft/${id}/lineup`, { formation, starters })
}

export function listOffers(id: string): Promise<TransferOffer[]> {
  return request(`/draft/${id}/offers`)
}

export function createOffer(
  id: string,
  input: { kind: TransferOfferKind; playerId: string; offeredPlayerId?: string; price?: number; message?: string },
) {
  return post<TransferOffer>(`/draft/${id}/offers`, input)
}

export function respondOffer(id: string, offerId: string, accept: boolean) {
  return post<TransferOffer>(`/draft/${id}/offers/${offerId}/respond`, { accept })
}

export function cancelOffer(id: string, offerId: string) {
  return remove<TransferOffer>(`/draft/${id}/offers/${offerId}`)
}

export function releasePlayer(id: string, playerId: string) {
  return post<{ released: boolean; refund: number }>(`/draft/${id}/players/${playerId}/release`)
}

export function listDraftMatches(id: string, round?: number): Promise<DraftMatch[]> {
  return request(`/draft/${id}/matches${round ? `?round=${round}` : ""}`)
}

export function reportDraftResult(
  id: string,
  matchId: string,
  input: { homeScore: number; awayScore: number; imageBase64?: string; mimeType?: string },
) {
  return post<{ match: DraftMatch | null; autoApproved: boolean }>(`/draft/${id}/matches/${matchId}/report`, input)
}

export function listDraftPendingProofs(id: string) {
  return request<
    Array<{
      id: string
      claimedHomeScore: number
      claimedAwayScore: number
      aiHomeScore: number | null
      aiAwayScore: number | null
      aiConfidence: number | null
      aiAgrees: boolean | null
      aiNotes: string | null
      createdAt: string
      draftMatch: {
        id: string
        round: number
        homeRoster: { id: string; name: string; logoUrl: string | null }
        awayRoster: { id: string; name: string; logoUrl: string | null }
      }
    }>
  >(`/draft/${id}/proofs/pending`)
}

export function reviewDraftProof(id: string, proofId: string, approve: boolean, note?: string) {
  return post(`/draft/${id}/proofs/${proofId}/review`, { approve, note })
}

export function fetchDraftProofImage(id: string, proofId: string): Promise<string> {
  return fetchImageObjectUrl(apiUrl(`/draft/${id}/proofs/${proofId}/image`))
}
