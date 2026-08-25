import { post, remove, request } from "./http"
import type { TournamentFormat, TournamentStatus } from "./tournaments.types"
import type { DraftLeagueStatus, DraftResultMode } from "./draft.types"

export type DemoTournamentStage = "REGISTRATION" | "STARTED" | "PARTIAL" | "FINISHED"
export type DemoDraftStage = "SETUP" | "DRAFTING" | "ACTIVE" | "PLAYED"

/// Cada valor do debug vira uma linha na tela de admin, então texto, número e
/// lista já chegam prontos para exibir.
export type DemoDebug = Record<string, string | number | boolean | string[] | Record<string, number>>

export interface DemoTournamentResult {
  message: string
  id: string
  name: string
  format: TournamentFormat
  status: TournamentStatus
  teams: number
  matches: number
  url: string
  debug: DemoDebug
}

export interface DemoDraftResult {
  message: string
  id: string
  name: string
  status: DraftLeagueStatus
  rosters: number
  players: number
  matches: number
  url: string
  debug: DemoDebug
}

export interface DemoInventory {
  tournaments: Array<{ id: string; name: string; format: TournamentFormat; status: TournamentStatus; createdAt: string }>
  leagues: Array<{ id: string; name: string; status: DraftLeagueStatus; createdAt: string }>
}

export function listDemoData(): Promise<DemoInventory> {
  return request("/admin/demo")
}

export function buildDemoTournament(input: {
  format?: TournamentFormat
  teamCount?: number
  groupCount?: number
  advancePerGroup?: number
  legs?: number
  thirdPlace?: boolean
  stage: DemoTournamentStage
}): Promise<DemoTournamentResult> {
  return post("/admin/demo/tournament", input)
}

export function buildDemoDraft(input: {
  rosterCount?: number
  rosterSize?: number
  resultMode?: DraftResultMode
  startingBudget?: number
  paySalaries?: boolean
  vacantRosters?: number
  auctionsEnabled?: boolean
  auctionHours?: number
  stage: DemoDraftStage
}): Promise<DemoDraftResult> {
  return post("/admin/demo/draft", input)
}

export function clearDemoData(): Promise<{ tournaments: number; leagues: number; users: number }> {
  return remove("/admin/demo")
}

export interface DemoEaMatch {
  externalMatchId: string
  playedAt: string
  homeClubId: string
  awayClubId: string
  homeClubName: string
  awayClubName: string
  homeScore: number
  awayScore: number
  playersByClub?: Record<string, unknown[]>
  rawData?: Record<string, unknown>
}

export function findDemoEaClub(name: string): Promise<{ externalClubId: string; name: string; platform: string }> {
  return post("/admin/demo/ea/club", { name })
}

export interface DemoEaClubCandidate {
  externalClubId: string
  name: string
  platform: string
}

export function searchDemoEaClubs(name: string): Promise<DemoEaClubCandidate[]> {
  return post("/admin/demo/ea/clubs/search", { name })
}

export function getDemoEaHistory(clubId: string): Promise<{ count: number; latest: DemoEaMatch | null; matches: DemoEaMatch[] }> {
  return post("/admin/demo/ea/history", { clubId })
}

export function buildRealEaTournament(input: {
  clubName: string
  teamCount: number
  maxMatches: number
}): Promise<DemoTournamentResult> {
  return post("/admin/demo/ea/tournament", input)
}

export function buildEaFourGroupsTournament(name: string, externalMatchId: string): Promise<DemoTournamentResult> {
  return post("/admin/demo/ea/tournament/four-groups", { name, externalMatchId })
}

export interface LiveEaWorkspace {
  id: string
  name: string
  status: TournamentStatus
  groupCount: number
  advancePerGroup: number
  teams: Array<{ id: string; name: string; tag: string | null; eaClubId: string | null; groupId: string | null }>
  groups: Array<{ id: string; name: string; order: number }>
  matches: Array<{
    id: string
    phase: string
    status: string
    label: string | null
    homeTeam: { id: string; name: string } | null
    awayTeam: { id: string; name: string } | null
    homeScore: number | null
    awayScore: number | null
    eaMatchId: string | null
  }>
  groupProgress: { finished: number; total: number }
  url: string
}

export function createLiveEaTournament(input: {
  name: string
  startsAt: string
  clubNames: string[]
  groupCount: number
  advancePerGroup: number
}): Promise<LiveEaWorkspace> {
  return post("/admin/demo/ea/live", input)
}

export function getLiveEaTournament(id: string): Promise<LiveEaWorkspace> {
  return request(`/admin/demo/ea/live/${id}`)
}

export function assignLiveEaGroups(id: string, assignments: Array<{ teamId: string; group: number }>): Promise<LiveEaWorkspace> {
  return post(`/admin/demo/ea/live/${id}/groups`, { assignments })
}

export function buildLiveEaKnockout(id: string): Promise<LiveEaWorkspace> {
  return post(`/admin/demo/ea/live/${id}/knockout`)
}

export function syncDemoEaMatch(tournamentId: string, matchId: string): Promise<{ id: string }> {
  return post("/admin/demo/ea/sync", { tournamentId, matchId })
}

export function prepareDemoEaMatch(input: {
  tournamentId: string
  matchId: string
  clubId: string
  externalMatchId: string
  side: "HOME" | "AWAY"
}): Promise<{ tournamentId: string; matchId: string; side: "HOME" | "AWAY"; scheduledAt: string }> {
  return post("/admin/demo/ea/prepare", input)
}
