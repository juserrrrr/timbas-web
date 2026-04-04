"use client"

import { useMemo } from "react"
import { Users, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"

import { getToken, decodeToken } from "@/lib/auth"
import { useServer } from "@/lib/server-context"

interface DuoStat {
  userId: number
  name: string
  games: number
  wins: number
  winRate: number
}

export default function TeamsPage() {
  const { matches, dashboardLoading } = useServer()

  const token = getToken()
  const payload = token ? decodeToken(token) : null
  const userId = payload ? Number(payload.sub) : null

  const duoStats = useMemo((): DuoStat[] => {
    if (userId === null || matches.length === 0) return []

    const map: Record<number, { name: string; games: number; wins: number }> = {}

    for (const match of matches) {
      const inBlue = match.blueTeam.players.some((p) => p.userId === userId)
      const inRed = match.redTeam.players.some((p) => p.userId === userId)
      if (!inBlue && !inRed) continue

      const myTeam = inBlue ? match.blueTeam : match.redTeam
      const won = match.winnerId !== null && match.winnerId === myTeam.id

      for (const player of myTeam.players) {
        if (player.userId === userId) continue
        if (!map[player.userId]) map[player.userId] = { name: player.name, games: 0, wins: 0 }
        map[player.userId].games++
        if (won) map[player.userId].wins++
      }
    }

    return Object.entries(map)
      .map(([id, d]) => ({
        userId: Number(id),
        name: d.name,
        games: d.games,
        wins: d.wins,
        winRate: d.games > 0 ? d.wins / d.games : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
  }, [matches, userId])

  const top3 = duoStats.slice(0, 3)

  if (dashboardLoading) return null

  return (
    <div className="animate-in fade-in duration-700 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Melhores Duplas</h1>
        <p className="text-gray-400">Com quem você mais ganha partidas</p>
      </div>

      {duoStats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">Nenhuma partida encontrada para este servidor.</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
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
                  className={`border bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-sm shadow-lg ${borders[idx]}`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="text-4xl">{medals[idx]}</div>
                    <h3 className="text-xl font-bold text-white">{duo.name}</h3>
                    <p className={`text-3xl font-bold ${duo.winRate >= 0.5 ? "text-green-400" : "text-red-400"}`}>
                      {Math.round(duo.winRate * 100)}%
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">{duo.wins}V</span>
                      <span className="text-gray-500">/</span>
                      <span className="text-red-400">{duo.games - duo.wins}D</span>
                      <span className="text-gray-500">em {duo.games}</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Full leaderboard */}
          <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Todos os Parceiros</h2>
            </div>
            <div className="space-y-2">
              {duoStats.map((duo, idx) => (
                <div
                  key={duo.userId}
                  className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
                    <span className="font-medium text-white">{duo.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400 hidden sm:block">{duo.games} partidas</span>
                    <span className="text-green-400">{duo.wins}V</span>
                    <span className="text-red-400">{duo.games - duo.wins}D</span>
                    <span
                      className={`font-bold w-12 text-right ${
                        duo.winRate >= 0.5 ? "text-green-400" : "text-red-400"
                      }`}
                    >
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
