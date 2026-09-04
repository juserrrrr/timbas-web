import { apiFetch, authHeaders } from "@/lib/api"
import { getToken } from "@/lib/auth"
import type {
  EaClub, EaClubDashboard, EaClubPlayer, EaClubPlayerProfile, EaClubPreview,
  EaClubField, EaLeaderboardCategory, EaSyncResult,
} from "./ea-clubs.types"
import { API_URL } from "../api-base"


function endpoint(path: string) {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não configurado")
  return `${API_URL}${path}`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  if (!token) throw new Error("Sessão não encontrada")
  const res = await apiFetch(endpoint(path), {
    ...init,
    cache: "no-store",
    headers: { ...authHeaders(token), ...(init.headers as Record<string, string> | undefined) },
  })
  const body = await res.json().catch(() => null) as T | { message?: string } | null
  if (!res.ok) {
    const message = body && typeof body === "object" && "message" in body ? body.message : null
    throw new Error(message || `Não foi possível concluir a solicitação (${res.status})`)
  }
  return body as T
}

export async function getEaClubs(): Promise<EaClub[]> {
  const body = await request<EaClub[] | { data: EaClub[] }>("/ea-clubs")
  return Array.isArray(body) ? body : body.data
}

export function validateEaClub(input: { externalClubId: string; platform: string }): Promise<EaClubPreview> {
  return request("/ea-clubs/validate", { method: "POST", body: JSON.stringify(input) })
}

export async function searchEaClubs(name: string): Promise<EaClubPreview[]> {
  const params = new URLSearchParams({ name })
  const body = await request<EaClubPreview[] | { data: EaClubPreview[] }>(`/ea-clubs/search?${params}`)
  return Array.isArray(body) ? body : body.data
}

export function createEaClub(input: { externalClubId: string; name: string; platform: string; nickname?: string }): Promise<EaClub> {
  return request("/ea-clubs", { method: "POST", body: JSON.stringify(input) })
}

export function getEaClub(clubId: string): Promise<EaClub> {
  return request(`/ea-clubs/${encodeURIComponent(clubId)}`)
}

export function syncEaClub(clubId: string): Promise<EaSyncResult> {
  return request(`/ea-clubs/${encodeURIComponent(clubId)}/sync`, { method: "POST" })
}

export function getEaClubDashboard(clubId: string): Promise<EaClubDashboard> {
  return request(`/ea-clubs/${encodeURIComponent(clubId)}/dashboard`)
}

export async function getEaClubPlayers(clubId: string): Promise<EaClubPlayer[]> {
  const body = await request<EaClubPlayer[] | { data: EaClubPlayer[] }>(`/ea-clubs/${encodeURIComponent(clubId)}/players`)
  return Array.isArray(body) ? body : body.data
}

export function getEaClubPlayer(clubId: string, playerId: string): Promise<EaClubPlayerProfile> {
  return request(`/ea-clubs/${encodeURIComponent(clubId)}/players/${encodeURIComponent(playerId)}`)
}

export function getEaClubField(clubId: string): Promise<EaClubField> {
  return request(`/ea-clubs/${encodeURIComponent(clubId)}/field`)
}

export async function getEaClubLeaderboard(clubId: string): Promise<EaLeaderboardCategory[]> {
  const body = await request<EaLeaderboardCategory[] | { categories: EaLeaderboardCategory[] }>(`/ea-clubs/${encodeURIComponent(clubId)}/leaderboard`)
  return Array.isArray(body) ? body : body.categories
}
