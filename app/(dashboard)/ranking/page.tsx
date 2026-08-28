import { getSession } from "@/lib/session"
import { fetchRanking } from "@/lib/services/leaderboard"
import { DEFAULT_RANKING_GAME_MODE, DEFAULT_RANKING_PLAYERS_PER_TEAM } from "@/lib/ranking-filters"
import { RankingSection } from "@/components/ranking-section"

export const dynamic = "force-dynamic"

export default async function RankingPage() {
  const { token, serverId } = await getSession()
  const players = await fetchRanking(
    token,
    serverId,
    DEFAULT_RANKING_PLAYERS_PER_TEAM,
    DEFAULT_RANKING_GAME_MODE,
  ).catch(() => [])

  return <RankingSection initialPlayers={players} />
}
