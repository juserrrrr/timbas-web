import { post, remove, request } from "./http"
import type { TournamentFormat, TournamentStatus } from "./tournaments.types"
import type { DraftLeagueStatus } from "./draft.types"

export type DemoTournamentStage = "REGISTRATION" | "STARTED" | "PARTIAL" | "FINISHED"
export type DemoDraftStage = "SETUP" | "DRAFTING" | "ACTIVE" | "PLAYED"

export interface DemoTournamentResult {
  message: string
  id: string
  name: string
  format: TournamentFormat
  status: TournamentStatus
  teams: number
  matches: number
  url: string
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
  stage: DemoDraftStage
}): Promise<DemoDraftResult> {
  return post("/admin/demo/draft", input)
}

export function clearDemoData(): Promise<{ tournaments: number; leagues: number; users: number }> {
  return remove("/admin/demo")
}
