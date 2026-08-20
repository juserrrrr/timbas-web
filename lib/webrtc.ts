import { apiFetch } from "./api"

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")

const FALLBACK: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
]

let cached: RTCIceServer[] | null = null

export async function getIceServers(token: string): Promise<RTCIceServer[]> {
  if (cached) return cached
  try {
    const res = await apiFetch(`${API_URL}/streaming/ice`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return FALLBACK
    const data = await res.json()
    cached = data.iceServers?.length ? data.iceServers : FALLBACK
    return cached!
  } catch {
    return FALLBACK
  }
}
