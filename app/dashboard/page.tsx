import { Calendar, Trophy, Swords, TrendingUp, Star, LayoutDashboard } from "lucide-react"
import { getSession } from "@/lib/session"
import { fetchRanking, fetchMatchHistory } from "@/lib/services/leaderboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { token, serverId, userId } = await getSession()

  const [ranking, history] = await Promise.all([
    fetchRanking(token, serverId).catch(() => []),
    fetchMatchHistory(token, serverId, 1, 5).catch(() => ({ data: [], total: 0, page: 1, pages: 1, hasNext: false })),
  ])

  const stats = ranking.find((p) => p.userId === userId) ?? null
  const recentMatches = history.data

  const statCards = [
    { label: "Partidas",  value: stats?.totalGames ?? "—", icon: Swords,     color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/15"   },
    { label: "Vitórias",  value: stats?.wins ?? "—",       icon: Trophy,     color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/15"  },
    { label: "Derrotas",  value: stats?.losses ?? "—",     icon: TrendingUp, color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/15"    },
    { label: "Win Rate",  value: stats ? `${Math.round(stats.winRate * 100)}%` : "—", icon: Star, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/15" },
  ]

  return (
    <div className="dashboard-view space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 shadow-lg shadow-blue-500/10">
            <LayoutDashboard className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">Seu desempenho no servidor</p>
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">Rank #{stats.rank}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`group rounded-2xl border ${border} bg-white/[0.02] p-5 transition-all hover:-translate-y-1 hover:bg-white/[0.045] hover:shadow-xl`}>
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${color}`} />
            </div>
            <p className="text-xs text-gray-600 mb-1">{label}</p>
            <p className={`text-3xl font-black tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.08] to-transparent p-5">
            <p className="text-xs text-gray-600 mb-1">Pontuação Total</p>
            <p className="text-3xl font-black text-blue-400 tabular-nums">{stats.score} pts</p>
          </div>
          <div className="rounded-2xl border border-yellow-500/15 bg-gradient-to-br from-yellow-500/[0.08] to-transparent p-5">
            <p className="text-xs text-gray-600 mb-1">Posição Global</p>
            <p className="text-3xl font-black text-yellow-400">#{stats.rank}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-white">Partidas Recentes</h2>
        </div>

        {recentMatches.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Swords className="mx-auto mb-3 h-8 w-8 text-gray-700" />
            <p className="text-sm text-gray-600">Nenhuma partida encontrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentMatches.map((match) => {
              const inBlue = match.blueTeam.players.some((p) => p.userId === userId)
              const myTeamId = inBlue ? match.blueTeam.id : match.redTeam.id
              const won = match.winnerId === myTeamId
              const pending = match.winnerId === null
              const date = new Date(match.dateCreated)

              return (
                <div key={match.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
                  <div className={`h-2 w-2 flex-shrink-0 rounded-full ${pending ? "bg-yellow-400" : won ? "bg-green-400" : "bg-red-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Partida #{match.id}</p>
                    <p className="text-xs text-gray-600">
                      {date.toLocaleDateString("pt-BR")} · {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    pending ? "bg-yellow-500/10 text-yellow-400" : won ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {pending ? "Em andamento" : won ? "Vitória" : "Derrota"}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
