import { patch, post, remove, request } from "./http"

export type CatalogSource = "MANUAL" | "FOOTBALL_DATA" | "GENERIC" | "WIKIPEDIA" | "AI"

export interface CatalogCompetition {
  id: string
  code: string
  name: string
  country: string | null
  source: CatalogSource
  sourcePath: string | null
  lastSyncAt: string | null
  lastSyncOk: boolean | null
  lastSyncMessage: string | null
  teamCount: number
  playerCount: number
  simulationEnabled: boolean
  worldRound: number
  lastWorldTickAt: string | null
}

export interface CatalogTeam {
  id: string
  competitionId: string
  name: string
  shortName: string | null
  crestUrl: string | null
  source: CatalogSource
  syncedAt: string | null
  _count: { players: number }
}

export interface CatalogPlayer {
  id: string
  teamId: string
  name: string
  position: string
  shirtNumber: number | null
  overall: number
  nationality: string | null
  photoUrl: string | null
  price: number
  active: boolean
  source: CatalogSource
  pace: number | null
  shooting: number | null
  passing: number | null
  dribbling: number | null
  defending: number | null
  physical: number | null
  attributesModel: string | null
  attributesNote: string | null
  attributesAt: string | null
}

export interface ExtractedPlayer {
  name: string
  position: string
  overall: number | null
  nationality: string | null
  realTeam?: string | null
}

export interface SquadExtraction {
  teamName: string | null
  players: ExtractedPlayer[]
  notes: string
  provider: string | null
  model: string | null
}

export const SOURCE_LABELS: Record<CatalogSource, string> = {
  MANUAL: "Manual",
  FOOTBALL_DATA: "football-data.org",
  GENERIC: "URL própria",
  WIKIPEDIA: "Wikipedia",
  AI: "IA",
}

export interface BasePlayer extends CatalogPlayer {
  team: { id: string; name: string; competition: { id: string; name: string } }
}

/// A base é uma só: essa é a lista dela, sem passar por competição.
export function listBasePlayers(params: { search?: string; missingAttributes?: boolean } = {}): Promise<{
  players: BasePlayer[]
  total: number
  withAttributes: number
}> {
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "" && value !== false)
      .map(([key, value]) => [key, String(value)]),
  )
  return request(`/admin/catalog/players${search.size ? `?${search}` : ""}`)
}

export function createBasePlayer(input: {
  name: string
  position: string
  realTeam?: string
  overall?: number
  price?: number
}): Promise<BasePlayer> {
  return post("/admin/catalog/players", input)
}

export function saveBasePlayers(
  players: Array<{ name: string; position: string; overall?: number }>,
): Promise<{ created: number; skipped: number; total: number }> {
  return post("/admin/catalog/players/bulk", { players })
}

export function estimateMissingAttributes(limit = 24): Promise<{ updated: number; requested: number; model: string }> {
  return post("/admin/catalog/players/estimate-missing", { limit })
}

export function listCompetitions(): Promise<{ items: CatalogCompetition[]; footballDataReady: boolean }> {
  return request("/admin/catalog/competitions")
}

export function createCompetition(input: {
  code: string
  name: string
  country?: string | null
  source?: CatalogSource
  sourcePath?: string | null
}): Promise<CatalogCompetition> {
  return post("/admin/catalog/competitions", input)
}

export function updateCompetition(id: string, input: Record<string, unknown>) {
  return patch<CatalogCompetition>(`/admin/catalog/competitions/${id}`, input)
}

export function removeCompetition(id: string) {
  return remove<{ deleted: boolean }>(`/admin/catalog/competitions/${id}`)
}

export function syncCompetition(id: string): Promise<{ teams: number; players: number }> {
  return post(`/admin/catalog/competitions/${id}/sync`)
}

export function syncWikipediaSquads(teams: string[]): Promise<{ teams: number; players: number; failures: string[] }> {
  return post("/admin/catalog/wikipedia/sync", { teams })
}

export interface AiSquadPlayer {
  shirtNumber: number | null
  name: string
  position: string
  rawPosition: string | null
  nationality: string | null
  birthDate: string | null
  onLoan: boolean
  fromYouth: boolean
  confidence: number
  attributes: Record<"pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical", number> | null
  overall: number | null
  price: number | null
  note: string
}

export interface AiSquadResult {
  team: string
  teamName: string | null
  competition: string | null
  coach: string | null
  referenceDate: string
  players: AiSquadPlayer[]
  beyondKnowledge: boolean
  notes: string
  provider: string
  model: string
}

export interface AiSquadInput {
  teams: string[]
  referenceDate?: string
  competition?: string | null
}

/// Só pergunta e devolve o JSON, sem gravar. Serve para conferir antes de trazer.
export function fetchAiSquads(input: AiSquadInput): Promise<{ squads: AiSquadResult[]; failures: string[] }> {
  return post("/admin/catalog/ai/squad", input)
}

export function syncAiSquads(
  input: AiSquadInput,
): Promise<{ teams: number; players: number; failures: string[]; squads: AiSquadResult[] }> {
  return post("/admin/catalog/ai/sync", input)
}

/// A IA diz quais clubes disputam a competição e cria a pasta com todos eles.
export function createAiCompetition(input: {
  name: string
  code?: string
  referenceDate?: string
  withSquads?: boolean
}): Promise<{
  competition: CatalogCompetition
  teams: Array<{ name: string; shortName: string | null; country: string | null }>
  created: number
  season: string | null
  beyondKnowledge: boolean
  notes: string
  model: string
  players: number
  pending: number
}> {
  return post("/admin/catalog/ai/competition", input)
}

export function listCatalogTeams(competitionId: string): Promise<CatalogTeam[]> {
  return request(`/admin/catalog/competitions/${competitionId}/teams`)
}

export function createCatalogTeam(competitionId: string, input: { name: string; shortName?: string | null }) {
  return post<CatalogTeam>(`/admin/catalog/competitions/${competitionId}/teams`, input)
}

export function removeCatalogTeam(teamId: string) {
  return remove<{ deleted: boolean }>(`/admin/catalog/teams/${teamId}`)
}

export function listCatalogPlayers(teamId: string): Promise<CatalogPlayer[]> {
  return request(`/admin/catalog/teams/${teamId}/players`)
}

export function saveCatalogPlayers(
  teamId: string,
  players: Array<{ name: string; position: string; overall?: number; nationality?: string | null; price?: number }>,
): Promise<{ created: number; updated: number }> {
  return post(`/admin/catalog/teams/${teamId}/players`, { players })
}

export function updateCatalogPlayer(playerId: string, input: Record<string, unknown>) {
  return patch<CatalogPlayer>(`/admin/catalog/players/${playerId}`, input)
}

export function removeCatalogPlayer(playerId: string) {
  return remove<{ deleted: boolean }>(`/admin/catalog/players/${playerId}`)
}

export function estimateTeamAttributes(
  teamId: string,
  onlyMissing: boolean,
): Promise<{ updated: number; requested: number; model: string; missing: number }> {
  return post(`/admin/catalog/teams/${teamId}/estimate-attributes`, { onlyMissing })
}

export function estimatePlayerAttributes(playerId: string): Promise<CatalogPlayer> {
  return post(`/admin/catalog/players/${playerId}/estimate-attributes`)
}

export interface ExtractedTeam {
  name: string
  shortName: string | null
}

export function parsePastedPlayers(text: string): Promise<{ players: ExtractedPlayer[] }> {
  return post("/admin/catalog/parse-pasted-players", { text })
}

export function parsePastedTeams(text: string): Promise<{ teams: ExtractedTeam[] }> {
  return post("/admin/catalog/parse-pasted-teams", { text })
}

export function parseSquadWithAi(text: string, teamName?: string): Promise<SquadExtraction> {
  return post("/admin/catalog/parse-squad-text", { text, teamName })
}

export function extractTeamsWithAi(input: {
  imageBase64?: string
  mimeType?: string
  text?: string
}): Promise<{ teams: ExtractedTeam[]; notes: string }> {
  return post("/admin/catalog/extract-teams", input)
}

export function createCatalogTeams(
  competitionId: string,
  teams: Array<{ name: string; shortName?: string | null }>,
): Promise<{ created: number; total: number }> {
  return post(`/admin/catalog/competitions/${competitionId}/teams/bulk`, { teams })
}

export function extractSquadFromImage(input: {
  imageBase64: string
  mimeType: string
  teamName?: string
}): Promise<SquadExtraction> {
  return post("/admin/catalog/extract-squad", input)
}

export function importCatalogToLeague(input: {
  leagueId: string
  competitionId?: string
  teamIds?: string[]
  minOverall?: number
  replace?: boolean
}): Promise<{ imported: number; total: number }> {
  return post("/admin/catalog/import-to-league", input)
}
