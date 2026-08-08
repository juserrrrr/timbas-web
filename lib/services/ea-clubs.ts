import { apiFetch, authHeaders } from "@/lib/api"
import { getToken } from "@/lib/auth"
import type {
  EaClub, EaClubDashboard, EaClubMatch, EaClubMatchDetail, EaClubPlayer,
  EaClubPlayerProfile, EaClubPreview, EaLeaderboardCategory, EaMatchFilters,
  EaSyncResult, Paginated,
} from "./ea-clubs.types"

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")

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
  return request<EaClubDashboard & { pointsPercentage?: number }>(`/ea-clubs/${encodeURIComponent(clubId)}/dashboard`).then(body => ({ ...body, winRate: body.pointsPercentage ?? body.winRate }))
}

export async function getEaClubMatches(clubId: string, filters: EaMatchFilters = {}): Promise<Paginated<EaClubMatch>> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value))
  })
  const body = await request<Paginated<EaClubMatch> | (Omit<Paginated<EaClubMatch>, "data" | "pages"> & { items: EaClubMatch[]; perPage: number }) | EaClubMatch[]>(`/ea-clubs/${encodeURIComponent(clubId)}/matches?${params}`)
  if (Array.isArray(body)) return { data: body, page: 1, pages: 1, total: body.length }
  if ("data" in body) return body
  return { data: body.items, page: body.page, total: body.total, pages: Math.ceil(body.total / body.perPage) }
}

export function getEaClubMatch(clubId: string, matchId: string): Promise<EaClubMatchDetail> {
  return request(`/ea-clubs/${encodeURIComponent(clubId)}/matches/${encodeURIComponent(matchId)}`)
}

export async function getEaClubPlayers(clubId: string): Promise<EaClubPlayer[]> {
  const body = await request<EaClubPlayer[] | { data: EaClubPlayer[] }>(`/ea-clubs/${encodeURIComponent(clubId)}/players`)
  return Array.isArray(body) ? body : body.data
}

export function getEaClubPlayer(clubId: string, playerId: string): Promise<EaClubPlayerProfile> {
  return request(`/ea-clubs/${encodeURIComponent(clubId)}/players/${encodeURIComponent(playerId)}`)
}

export async function getEaClubLeaderboard(clubId: string): Promise<EaLeaderboardCategory[]> {
  const body = await request<EaLeaderboardCategory[] | { categories: EaLeaderboardCategory[] }>(`/ea-clubs/${encodeURIComponent(clubId)}/leaderboard`)
  return Array.isArray(body) ? body : body.categories
}
