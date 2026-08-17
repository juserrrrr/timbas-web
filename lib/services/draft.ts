import { apiUrl, fetchImageObjectUrl, patch, post, remove, request } from "./http"
import type {
  AuctionStatus,
  DraftLeagueDetail,
  DraftLeagueSummary,
  DraftMatch,
  DraftBudgetTxType,
  DraftPlayer,
  DraftResultMode,
  DraftRoster,
  TacticIntensity,
  TacticMentality,
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
  resultMode?: DraftResultMode
  startingBudget?: number
  paySalaries?: boolean
  auctionsEnabled?: boolean
  auctionHours?: number
  auctionMinIncrementPercent?: number
  auctionAntiSnipeMinutes?: number
  marketAutoManaged?: boolean
  marketClosesMinutesBefore?: number
  sourceCompetitionIds?: string[]
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

export function setTactics(
  id: string,
  input: {
    rosterId?: string
    formation?: string
    mentality?: TacticMentality
    pressing?: TacticIntensity
    tempo?: TacticIntensity
  },
) {
  return post<DraftRoster>(`/draft/${id}/tactics`, input)
}

export interface Auction {
  id: string
  playerId: string
  startingBid: number
  currentBid: number
  bidCount: number
  minimumBid: number
  status: AuctionStatus
  endsAt: string
  closedAt: string | null
  isMine: boolean
  isLeading: boolean
  canManage: boolean
  player: {
    id: string
    name: string
    position: string
    overall: number
    price: number
    salary: number
    photoUrl: string | null
    realTeam: string | null
  }
  sellerRoster: { id: string; name: string; tag: string | null } | null
  leaderRoster: { id: string; name: string; tag: string | null } | null
  bids: Array<{ id: string; amount: number; createdAt: string; roster: { id: string; name: string } }>
}

export function listAuctions(id: string): Promise<Auction[]> {
  return request(`/draft/${id}/auctions`)
}

export function createAuction(id: string, input: { playerId: string; startingBid?: number; hours?: number }) {
  return post<Auction>(`/draft/${id}/auctions`, input)
}

export function placeBid(id: string, auctionId: string, amount: number) {
  return post<Auction>(`/draft/${id}/auctions/${auctionId}/bid`, { amount })
}

export function cancelAuction(id: string, auctionId: string) {
  return remove<Auction>(`/draft/${id}/auctions/${auctionId}`)
}

export interface BudgetEntry {
  id: string
  amount: number
  balanceAfter: number
  type: DraftBudgetTxType
  description: string
  round: number | null
  createdAt: string
}

export interface BudgetStatement {
  id: string
  name: string
  budget: number
  earned: number
  spent: number
  wageBill: number
  entries: BudgetEntry[]
}

export function getBudget(id: string, rosterId?: string): Promise<BudgetStatement> {
  return request(`/draft/${id}/budget${rosterId ? `?rosterId=${rosterId}` : ""}`)
}

export interface BaseMarketPlayer {
  id: string
  name: string
  position: string
  overall: number
  price: number
  photoUrl: string | null
  nationality: string | null
  pace: number | null
  shooting: number | null
  passing: number | null
  dribbling: number | null
  defending: number | null
  physical: number | null
  form: number
  ratingAvg: number | null
  team: { name: string; competition: { id: string; name: string } }
}

export function listBaseMarket(
  id: string,
  params: { search?: string; competitionId?: string } = {},
): Promise<{
  competitions: Array<{ id: string; name: string; country: string | null }>
  players: BaseMarketPlayer[]
}> {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][],
  )
  return request(`/draft/${id}/base-market${search.size ? `?${search}` : ""}`)
}

export function signFromBase(id: string, catalogPlayerId: string) {
  return post<{ signed: boolean; price: number }>(`/draft/${id}/base-market/sign`, { catalogPlayerId })
}

export function simulateDraftMatch(id: string, matchId: string) {
  return post<{ homeScore: number; awayScore: number; summary: string }>(`/draft/${id}/matches/${matchId}/simulate`)
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

export interface Scorer {
  id: string
  name: string
  position: string
  goals: number
  assists: number
  appearances: number
  rating: number | null
  photoUrl: string | null
  roster: { id: string; name: string; tag: string | null; logoUrl: string | null } | null
}

export function listScorers(id: string): Promise<Scorer[]> {
  return request(`/draft/${id}/scorers`)
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
