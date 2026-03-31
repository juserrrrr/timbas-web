"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Target, Zap, Shield, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getPlayerDetailStats, PlayerDetailStats } from "@/lib/services/playerStats"
import { getMatchHistory, Match } from "@/lib/services/matches"
import { getToken, decodeToken } from "@/lib/auth"
import { useServer } from "@/lib/server-context"

function computePositionStats(matches: Match[], userId: number) {
  const map: Record<string, { wins: number; games: number }> = {}
  for (const match of matches) {
    const inBlue = match.blueTeam.players.some((p) => p.userId === userId)
    const inRed = match.redTeam.players.some((p) => p.userId === userId)
    if (!inBlue && !inRed) continue
    const myTeam = inBlue ? match.blueTeam : match.redTeam
    const myPlayer = myTeam.players.find((p) => p.userId === userId)
    if (!myPlayer?.position) continue
    const won = match.winnerId !== null && match.winnerId === myTeam.id
    if (!map[myPlayer.position]) map[myPlayer.position] = { wins: 0, games: 0 }
    map[myPlayer.position].games++
    if (won) map[myPlayer.position].wins++
  }
  return map
}

function computeMatchTypeStats(matches: Match[], userId: number) {
  const labels: Record<string, string> = {
    ALEATORIO: "Aleatório",
    LIVRE: "Livre",
    BALANCEADO: "Balanceado",
    ALEATORIO_COMPLETO: "Aleat. Completo",
  }
  const map: Record<string, { wins: number; games: number }> = {}
  for (const match of matches) {
    const inBlue = match.blueTeam.players.some((p) => p.userId === userId)
    const inRed = match.redTeam.players.some((p) => p.userId === userId)
    if (!inBlue && !inRed) continue
    const myTeam = inBlue ? match.blueTeam : match.redTeam
    const won = match.winnerId !== null && match.winnerId === myTeam.id
    const label = labels[match.matchType] ?? match.matchType
    if (!map[label]) map[label] = { wins: 0, games: 0 }
    map[label].games++
    if (won) map[label].wins++
  }
  return map
}

export default function StatsPage() {
  const { selectedServer } = useServer()
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [rankingLoading, setRankingLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [detail, setDetail] = useState<PlayerDetailStats | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    const token = getToken()
    if (token) {
      const payload = decodeToken(token)
      if (payload) setCurrentUserId(Number(payload.sub))
    }
  }, [])

  useEffect(() => {
    const fetchPlayers = async () => {
      setRankingLoading(true)
      setPlayers([])
      setSelectedUserId("")
      setDetail(null)
      setSelectedPlayer(null)
      setError(null)
      try {
        const token = getToken()
        if (!token) throw new Error("Usuário não autenticado.")
        const [data, matchData] = await Promise.all([
          getRanking(token, selectedServer),
          getMatchHistory(token, selectedServer),
        ])
        setPlayers(data)
        setMatches(matchData)
        if (currentUserId !== null) {
          const me = data.find((p) => p.userId === currentUserId)
          if (me) setSelectedUserId(String(me.userId))
        }
      } catch (err) {
        setError("Falha ao carregar jogadores.")
        console.error(err)
      } finally {
        setRankingLoading(false)
      }
    }
    fetchPlayers()
  }, [selectedServer, currentUserId])

  useEffect(() => {
    if (!selectedUserId) return
    const fetchDetail = async () => {
      setStatsLoading(true)
      setDetail(null)
      setError(null)
      try {
        const token = getToken()
        if (!token) throw new Error("Usuário não autenticado.")
        const player = players.find((p) => String(p.userId) === selectedUserId)
        setSelectedPlayer(player ?? null)
        const data = await getPlayerDetailStats(token, selectedServer, Number(selectedUserId))
        setDetail(data)
      } catch (err) {
        setError("Falha ao carregar estatísticas.")
        console.error(err)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchDetail()
  }, [selectedUserId, selectedServer])

  const streakLabel = detail
    ? detail.currentStreakType
      ? `${detail.currentStreakCount}${detail.currentStreakType === "W" ? "V" : "D"}`
      : "—"
    : "—"
  const streakColor =
    detail?.currentStreakType === "W"
      ? "text-green-400"
      : detail?.currentStreakType === "L"
      ? "text-red-400"
      : "text-gray-400"

  const weeklyChartData =
    detail?.weeklyPerformance.map((w) => ({
      week: new Date(w.week).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      Vitórias: w.wins,
      Derrotas: w.losses,
    })) ?? []

  const positionStats = selectedUserId ? computePositionStats(matches, Number(selectedUserId)) : {}
  const matchTypeStats = selectedUserId ? computeMatchTypeStats(matches, Number(selectedUserId)) : {}
  const hasPositionData = Object.keys(positionStats).length > 0
  const hasMatchTypeData = Object.keys(matchTypeStats).length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Estatísticas</h1>
          <p className="text-gray-400">Acompanhe o desempenho detalhado por jogador</p>
        </div>
        <Select
          value={selectedUserId}
          onValueChange={setSelectedUserId}
          disabled={rankingLoading || players.length === 0}
        >
          <SelectTrigger className="w-full border-gray-700 bg-gray-800/50 text-white sm:w-[260px]">
            <User className="mr-2 h-4 w-4 text-purple-400" />
            <SelectValue placeholder={rankingLoading ? "Carregando..." : "Selecione um jogador"} />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900 text-white">
            {players.map((p) => (
              <SelectItem key={p.userId} value={String(p.userId)} className="focus:bg-gray-800 focus:text-white">
                {p.rank}º {p.name}{p.userId === currentUserId ? " (Você)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-dashed border-red-500/50 bg-red-500/10 p-4 text-center text-red-400">
          {error}
        </div>
      )}

      {!selectedUserId && !rankingLoading && !error && (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-12 text-center text-gray-400">
          Selecione um jogador para ver as estatísticas
        </div>
      )}

      {statsLoading && (
        <div className="flex items-center justify-center h-48">
          <Spinner className="size-8 text-blue-500" />
        </div>
      )}

      {detail && selectedPlayer && !statsLoading && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total de Partidas</p>
                  <p className="text-3xl font-bold text-blue-400">{selectedPlayer.totalGames}</p>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-3">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Taxa de Vitória</p>
                  <p className="text-3xl font-bold text-green-400">{Math.round(selectedPlayer.winRate * 100)}%</p>
                </div>
                <div className="rounded-xl bg-green-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Sequência Atual</p>
                  <p className={`text-3xl font-bold ${streakColor}`}>{streakLabel}</p>
                </div>
                <div className="rounded-xl bg-yellow-500/10 p-3">
                  <Zap className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </Card>

            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Maior Win Streak</p>
                  <p className="text-3xl font-bold text-purple-400">{detail.longestWinStreak}V</p>
                </div>
                <div className="rounded-xl bg-purple-500/10 p-3">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-bold text-white">
              Forma Recente{" "}
              <span className="text-sm font-normal text-gray-400">(últimas {detail.recentForm.length} partidas)</span>
            </h2>
            {detail.recentForm.length === 0 ? (
              <p className="text-gray-500">Sem partidas finalizadas ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.recentForm.map((result, i) => (
                  <span
                    key={i}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                      result === "W"
                        ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                        : "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                    }`}
                  >
                    {result === "W" ? "V" : "D"}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-bold text-white">Win Rate por Lado</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-blue-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />Lado Azul
                    </span>
                    <span className="text-white">
                      {detail.blueSide.wins}V / {detail.blueSide.losses}D
                      {detail.blueSide.total > 0 && (
                        <span className="ml-2 text-gray-400">({Math.round(detail.blueSide.winRate * 100)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.round(detail.blueSide.winRate * 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">{detail.blueSide.total} partidas</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-red-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />Lado Vermelho
                    </span>
                    <span className="text-white">
                      {detail.redSide.wins}V / {detail.redSide.losses}D
                      {detail.redSide.total > 0 && (
                        <span className="ml-2 text-gray-400">({Math.round(detail.redSide.winRate * 100)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${Math.round(detail.redSide.winRate * 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">{detail.redSide.total} partidas</p>
                </div>
              </div>
            </Card>

            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-bold text-white">Desempenho Semanal</h2>
              {weeklyChartData.length === 0 ? (
                <p className="text-gray-500">Sem dados suficientes.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyChartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="week" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />
                    <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
                    <Bar dataKey="Vitórias" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Derrotas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {(hasPositionData || hasMatchTypeData) && (
            <div className="grid gap-6 md:grid-cols-2">
              {hasPositionData && (
                <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
                  <h2 className="mb-4 text-xl font-bold text-white">Win Rate por Posição</h2>
                  <div className="space-y-3">
                    {Object.entries(positionStats)
                      .sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games)
                      .map(([pos, stat]) => {
                        const wr = stat.games > 0 ? stat.wins / stat.games : 0
                        return (
                          <div key={pos} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300 font-medium">{pos}</span>
                              <span className="text-white">
                                {stat.wins}V / {stat.games - stat.wins}D{" "}
                                <span className="text-gray-400">({Math.round(wr * 100)}%)</span>
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                              <div
                                className={`h-full rounded-full transition-all ${wr >= 0.5 ? "bg-green-500" : "bg-red-500"}`}
                                style={{ width: `${Math.round(wr * 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </Card>
              )}

              {hasMatchTypeData && (
                <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
                  <h2 className="mb-4 text-xl font-bold text-white">Win Rate por Tipo</h2>
                  <div className="space-y-3">
                    {Object.entries(matchTypeStats)
                      .sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games)
                      .map(([type, stat]) => {
                        const wr = stat.games > 0 ? stat.wins / stat.games : 0
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300 font-medium">{type}</span>
                              <span className="text-white">
                                {stat.wins}V / {stat.games - stat.wins}D{" "}
                                <span className="text-gray-400">({Math.round(wr * 100)}%)</span>
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                              <div
                                className={`h-full rounded-full transition-all ${wr >= 0.5 ? "bg-green-500" : "bg-red-500"}`}
                                style={{ width: `${Math.round(wr * 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500">{stat.games} partidas</p>
                          </div>
                        )
                      })}
                  </div>
                </Card>
              )}
            </div>
          )}

          <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-bold text-white">Resumo Geral</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-black/30 p-4 text-center">
                <p className="text-2xl font-bold text-white">{selectedPlayer.score}</p>
                <p className="text-sm text-gray-400">Pontuação</p>
              </div>
              <div className="rounded-lg bg-black/30 p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{selectedPlayer.wins}</p>
                <p className="text-sm text-gray-400">Vitórias</p>
              </div>
              <div className="rounded-lg bg-black/30 p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{selectedPlayer.losses}</p>
                <p className="text-sm text-gray-400">Derrotas</p>
              </div>
              <div className="rounded-lg bg-black/30 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">#{selectedPlayer.rank}</p>
                <p className="text-sm text-gray-400">Ranking</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
