import { apiFetch } from "./api"

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")

const FALLBACK: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
]

let cached: RTCIceServer[] | null = null

export function createLivePeerConnection(iceServers: RTCIceServer[]) {
  return new RTCPeerConnection({
    iceServers,
    // "all" keeps host and server-reflexive candidates enabled. ICE gives
    // those direct routes priority over relay candidates, so TURN remains a
    // fallback instead of becoming the default media path.
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 4,
  })
}

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
