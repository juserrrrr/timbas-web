import { getSession } from "@/lib/session"
import { fetchRanking } from "@/lib/services/leaderboard"
import { StatsClient } from "./stats-client"

export const dynamic = "force-dynamic"

export default async function StatsPage() {
  const { token, serverId, userId } = await getSession()
  const players = await fetchRanking(token, serverId).catch(() => [])

  return <StatsClient players={players} serverId={serverId} currentUserId={userId} />
}
