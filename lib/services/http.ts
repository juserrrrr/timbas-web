import { apiFetch, authHeaders } from "@/lib/api"
import { getToken } from "@/lib/auth"
import { API_URL } from "../api-base"


export function apiUrl(path: string): string {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não configurado")
  return `${API_URL}${path}`
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  if (!token) throw new Error("Sessão não encontrada")

  const res = await apiFetch(apiUrl(path), {
    ...init,
    cache: "no-store",
    headers: { ...authHeaders(token), ...(init.headers as Record<string, string> | undefined) },
  })

  const body = (await res.json().catch(() => null)) as T | { message?: string | string[] } | null
  if (!res.ok) {
    const message = body && typeof body === "object" && "message" in body ? body.message : null
    const text = Array.isArray(message) ? message.join(", ") : message
    throw new Error(text || `Não foi possível concluir a solicitação (${res.status})`)
  }
  return body as T
}

export async function fetchImageObjectUrl(url: string): Promise<string> {
  const token = getToken()
  if (!token) throw new Error("Sessão não encontrada")

  const res = await apiFetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Não foi possível carregar a imagem da prova")
  return URL.createObjectURL(await res.blob())
}

export function post<T>(path: string, payload?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: payload === undefined ? undefined : JSON.stringify(payload) })
}

export function patch<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(payload) })
}

export function remove<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" })
}
