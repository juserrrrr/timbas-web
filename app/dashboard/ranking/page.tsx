import { getSession } from "@/lib/session"
import { fetchRanking } from "@/lib/services/leaderboard"
import { RankingSection } from "@/components/ranking-section"

export const dynamic = "force-dynamic"

export default async function RankingPage() {
  const { token, serverId } = await getSession()
  const players = await fetchRanking(token, serverId).catch(() => [])

  return <RankingSection initialPlayers={players} />
}
