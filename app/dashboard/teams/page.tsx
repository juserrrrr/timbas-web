import { Users, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getSession } from "@/lib/session"
import { fetchDuoStats } from "@/lib/services/leaderboard"

export const dynamic = "force-dynamic"

export default async function TeamsPage() {
  const { token, serverId, userId } = await getSession()

  const duoData = await fetchDuoStats(token, serverId, userId).catch(() => ({ partners: [], opponents: [] }))
  const duoStats = duoData.partners
  const top3 = duoStats.slice(0, 3)

  return (
    <div className="dashboard-view space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Melhores Duplas</h1>
        <p className="mt-1 text-sm text-gray-500">Com quem você mais ganha partidas</p>
      </div>

      {duoStats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center sm:p-12">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">Nenhuma partida encontrada para este servidor.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {top3.map((duo, idx) => {
              const medals = ["🥇", "🥈", "🥉"]
              const borders = [
                "border-yellow-500/50 shadow-yellow-500/10",
                "border-gray-400/50 shadow-gray-400/10",
                "border-orange-700/50 shadow-orange-700/10",
              ]
              return (
                <Card
                  key={duo.userId}
                  className={`group border bg-gradient-to-br from-gray-900/60 to-black/60 p-6 backdrop-blur-sm shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${borders[idx]}`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="text-4xl transition-transform duration-300 group-hover:scale-110">{medals[idx]}</div>
                    <h3 className="text-xl font-bold text-white">{duo.name}</h3>
                    <p className={`text-3xl font-bold ${duo.winRate >= 0.5 ? "text-green-400" : "text-red-400"}`}>
                      {Math.round(duo.winRate * 100)}%
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">{duo.wins}V</span>
                      <span className="text-gray-500">/</span>
                      <span className="text-red-400">{duo.losses}D</span>
                      <span className="text-gray-500">em {duo.games}</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <Card className="border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Todos os Parceiros</h2>
            </div>
            <div className="space-y-2">
              {duoStats.map((duo, idx) => (
                <div
                  key={duo.userId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-transparent bg-black/30 px-3 py-3 transition-all hover:border-white/[0.07] hover:bg-white/[0.04] sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
                    <span className="truncate font-medium text-white">{duo.name}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2 text-xs sm:gap-4 sm:text-sm">
                    <span className="text-gray-400 hidden sm:block">{duo.games} partidas</span>
                    <span className="text-green-400">{duo.wins}V</span>
                    <span className="text-red-400">{duo.losses}D</span>
                    <span className={`font-bold w-12 text-right ${duo.winRate >= 0.5 ? "text-green-400" : "text-red-400"}`}>
                      {Math.round(duo.winRate * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
