import { getSession } from "@/lib/session"
import { fetchRanking } from "@/lib/services/leaderboard"
import { VersusClient } from "./versus-client"

export const dynamic = "force-dynamic"

export default async function VersusPage() {
  const { token, serverId } = await getSession()
  const players = await fetchRanking(token, serverId).catch(() => [])

  return <VersusClient players={players} serverId={serverId} />
}
