"use client"

import { useState, useEffect } from "react"
import { getToken, decodeToken } from "@/lib/auth"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getMatchHistory, Match } from "@/lib/services/matches"
import { Spinner } from "@/components/ui/spinner"
import { Calendar, Trophy } from "lucide-react"
import { useServer } from "@/lib/server-context"

export default function DashboardPage() {
  const { selectedServer } = useServer()
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken()
        if (!token) return
        const payload = decodeToken(token)
        if (!payload) return
        const uid = Number(payload.sub)
        setUserId(uid)
        const [ranking, matches] = await Promise.all([
          getRanking(token, selectedServer),
          getMatchHistory(token, selectedServer),
        ])
        const myStats = ranking.find((p) => p.userId === uid) ?? null
        setStats(myStats)
        setRecentMatches(matches.slice(0, 5))
      } catch {
        // silently fail, show empty state
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [selectedServer])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="size-8 text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Bem-vindo ao Dashboard</h1>
        <p className="text-gray-400">Gerencie suas partidas e acompanhe seu desempenho</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Total de Partidas</p>
            <p className="text-3xl font-bold text-white">{stats?.totalGames ?? "—"}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Vitórias</p>
            <p className="text-3xl font-bold text-white">{stats?.wins ?? "—"}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Derrotas</p>
            <p className="text-3xl font-bold text-white">{stats?.losses ?? "—"}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Win Rate</p>
            <p className="text-3xl font-bold text-white">
              {stats ? `${Math.round(stats.winRate * 100)}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl">
            <p className="text-sm text-gray-400 mb-1">Posição no Ranking</p>
            <p className="text-3xl font-bold text-yellow-400">#{stats.rank}</p>
          </div>
          <div className="rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl">
            <p className="text-sm text-gray-400 mb-1">Pontuação</p>
            <p className="text-3xl font-bold text-blue-400">{stats.score}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Partidas Recentes</h2>
        {recentMatches.length === 0 ? (
          <p className="text-gray-400">Nenhuma partida encontrada.</p>
        ) : (
          <div className="space-y-4">
            {recentMatches.map((match) => {
              const inBlue = userId !== null && match.blueTeam.players.some((p) => p.userId === userId)
              const myTeamId = inBlue ? match.blueTeam.id : match.redTeam.id
              const won = match.winnerId === myTeamId
              const pending = match.winnerId === null
              const date = new Date(match.dateCreated)

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800/50 bg-gray-900/30 p-4 transition-all hover:border-gray-700/50 hover:bg-gray-900/50"
                >
                  <div>
                    <p className="font-medium text-white">Partida #{match.id}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {date.toLocaleDateString("pt-BR")} às{" "}
                      {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {pending ? (
                    <div className="rounded-lg px-3 py-1 text-sm font-medium bg-yellow-500/10 text-yellow-400">
                      Em andamento
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-medium ${
                        won ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      <Trophy className="h-3 w-3" />
                      {won ? "Vitória" : "Derrota"}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
