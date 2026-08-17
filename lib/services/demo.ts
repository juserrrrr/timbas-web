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
