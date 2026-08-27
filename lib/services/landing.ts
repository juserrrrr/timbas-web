import { apiFetch, authHeaders } from "../api"
import { TIMBAS_SERVER_ID } from "../servers"
import { getRanking, type PlayerStats } from "./ranking"
import { API_URL } from "../api-base"

type LandingData = {
  players: PlayerStats[]
  totalMatches: number
}

let cachedToken: string | null = null
let cachedRequest: Promise<LandingData> | null = null

async function getTotalMatches(token: string): Promise<number> {
  const apiUrl = API_URL
  if (!apiUrl) return 0

  const response = await apiFetch(
    `${apiUrl}/leaderboard/${TIMBAS_SERVER_ID}/matches?page=1&limit=1`,
    { headers: authHeaders(token) },
  )
  if (!response.ok) return 0

  const result = await response.json()
  if (Array.isArray(result)) return result.length
  return typeof result?.total === "number" ? result.total : 0
}

/**
 * Hero e ranking usam o mesmo snapshot. Manter uma Promise compartilhada evita
 * que a home consulte o ranking duas vezes durante a mesma sessão da página.
 */
export function getLandingData(token: string): Promise<LandingData> {
  if (cachedRequest && cachedToken === token) return cachedRequest

  cachedToken = token
  cachedRequest = Promise.all([
    getRanking(token, TIMBAS_SERVER_ID).catch(() => []),
    getTotalMatches(token).catch(() => 0),
  ]).then(([players, totalMatches]) => ({ players, totalMatches }))

  return cachedRequest
}
