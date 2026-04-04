"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Target, Zap, Shield, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPlayerDetailStats, PlayerDetailStats } from "@/lib/services/playerStats"
import { getToken, decodeToken } from "@/lib/auth"
import { useServer } from "@/lib/server-context"
import { Match } from "@/lib/services/matches"
import { PlayerStats } from "@/lib/services/ranking"

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
  const { selectedServer, ranking: players, matches, dashboardLoading } = useServer()
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [statsLoading, setStatsLoading] = useState(false)
  const [detail, setDetail] = useState<PlayerDetailStats | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const token = getToken()
  const payload = token ? decodeToken(token) : null
  const currentUserId = payload ? Number(payload.sub) : null

  // Pré-seleciona o usuário atual quando o ranking carregar
  useEffect(() => {
    if (players.length === 0 || currentUserId === null) return
    const me = players.find((p) => p.userId === currentUserId)
    if (me) setSelectedUserId(String(me.userId))
  }, [players, currentUserId])

  // Reseta seleção ao trocar servidor
  useEffect(() => {
    setSelectedUserId("")
    setDetail(null)
    setSelectedPlayer(null)
    setError(null)
  }, [selectedServer])

  // Busca stats detalhados ao selecionar jogador
  useEffect(() => {
    if (!selectedUserId || !token) return
    const fetchDetail = async () => {
      setStatsLoading(true)
      setDetail(null)
      setError(null)
      try {
        const player = players.find((p) => String(p.userId) === selectedUserId)
        setSelectedPlayer(player ?? null)
        const data = await getPlayerDetailStats(token, selectedServer, Number(selectedUserId))
        setDetail(data)
      } catch {
        setError("Falha ao carregar estatísticas.")
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

  const weeklyChartData = detail?.weeklyPerformance.map((w) => ({
    week: new Date(w.week).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    Vitórias: w.wins,
    Derrotas: w.losses,
  })) ?? []

  const positionStats = selectedUserId ? computePositionStats(matches, Number(selectedUserId)) : {}
  const matchTypeStats = selectedUserId ? computeMatchTypeStats(matches, Number(selectedUserId)) : {}
  const hasPositionData = Object.keys(positionStats).length > 0
  const hasMatchTypeData = Object.keys(matchTypeStats).length > 0

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Estatísticas</h1>
          <p className="text-sm text-gray-500">Acompanhe o desempenho detalhado por jogador</p>
        </div>
        <Select
          value={selectedUserId}
          onValueChange={setSelectedUserId}
          disabled={dashboardLoading || players.length === 0}
        >
          <SelectTrigger className="w-full border-white/10 bg-white/5 text-white sm:w-[280px] rounded-xl h-11">
            <User className="mr-2 h-4 w-4 text-blue-400" />
            <SelectValue placeholder={dashboardLoading ? "Carregando..." : "Selecione um jogador"} />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0d0d14] text-white rounded-xl backdrop-blur-xl">
            {players.map((p) => (
              <SelectItem key={p.userId} value={String(p.userId)} className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg">
                <span className="font-bold">{p.rank}º</span> {p.name}{p.userId === currentUserId ? " (Você)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-2xl border border-dashed border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {!selectedUserId && !dashboardLoading && !error && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500 font-medium animate-in fade-in duration-500">
          Selecione um jogador para ver as estatísticas
        </div>
      )}

      {detail && selectedPlayer && !statsLoading && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total de Partidas</p>
                  <p className="text-3xl font-black text-blue-400">{selectedPlayer.totalGames}</p>
                </div>
                <div className="rounded-2xl bg-blue-500/10 p-3 ring-1 ring-blue-500/20">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Taxa de Vitória</p>
                  <p className="text-3xl font-black text-green-400">{Math.round(selectedPlayer.winRate * 100)}%</p>
                </div>
                <div className="rounded-2xl bg-green-500/10 p-3 ring-1 ring-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sequência Atual</p>
                  <p className={`text-3xl font-black ${streakColor}`}>{streakLabel}</p>
                </div>
                <div className="rounded-2xl bg-yellow-500/10 p-3 ring-1 ring-yellow-500/20">
                  <Zap className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Maior Win Streak</p>
                  <p className="text-3xl font-black text-purple-400">{detail.longestWinStreak}V</p>
                </div>
                <div className="rounded-2xl bg-purple-500/10 p-3 ring-1 ring-purple-500/20">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-black text-white">
              Forma Recente{" "}
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest ml-2">(últimas {detail.recentForm.length} partidas)</span>
            </h2>
            {detail.recentForm.length === 0 ? (
              <p className="text-sm font-medium text-gray-500 italic">Sem partidas finalizadas ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {detail.recentForm.map((result, i) => (
                  <span
                    key={i}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black transition-all hover:scale-110 cursor-default ${
                      result === "W"
                        ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]"
                        : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]"
                    }`}
                  >
                    {result === "W" ? "V" : "D"}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-black text-white">Win Rate por Lado</h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm items-end">
                    <span className="flex items-center gap-2 text-blue-400 font-bold">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />Lado Azul
                    </span>
                    <span className="text-white font-bold">
                      {detail.blueSide.wins}V / {detail.blueSide.losses}D
                      {detail.blueSide.total > 0 && (
                        <span className="ml-2 text-gray-500 font-black">({Math.round(detail.blueSide.winRate * 100)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" style={{ width: `${Math.round(detail.blueSide.winRate * 100)}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{detail.blueSide.total} partidas totais</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm items-end">
                    <span className="flex items-center gap-2 text-red-400 font-bold">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />Lado Vermelho
                    </span>
                    <span className="text-white font-bold">
                      {detail.redSide.wins}V / {detail.redSide.losses}D
                      {detail.redSide.total > 0 && (
                        <span className="ml-2 text-gray-500 font-black">({Math.round(detail.redSide.winRate * 100)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000" style={{ width: `${Math.round(detail.redSide.winRate * 100)}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{detail.redSide.total} partidas totais</p>
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-black text-white">Desempenho Semanal</h2>
              {weeklyChartData.length === 0 ? (
                <p className="text-sm font-medium text-gray-500 italic">Sem dados suficientes para gerar o gráfico.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-4 mb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-green-500" />Vitórias</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-red-500" />Derrotas</span>
                  </div>
                  {(() => {
                    const maxVal = Math.max(...weeklyChartData.map((w) => w.Vitórias + w.Derrotas), 1)
                    return weeklyChartData.map((w, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <span className="w-12 shrink-0 text-right text-[10px] font-bold text-gray-600">{w.week}</span>
                        <div className="flex-1 flex gap-1 h-7 items-center">
                          <div
                            className="bg-green-500/80 rounded-md transition-all duration-1000 hover:bg-green-500 shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]"
                            style={{ width: `${(w.Vitórias / maxVal) * 50}%`, height: "100%" }}
                            title={`${w.Vitórias} vitórias`}
                          />
                          <div
                            className="bg-red-500/80 rounded-md transition-all duration-1000 hover:bg-red-500 shadow-[0_0_10px_-3px_rgba(239,68,68,0.5)]"
                            style={{ width: `${(w.Derrotas / maxVal) * 50}%`, height: "100%" }}
                            title={`${w.Derrotas} derrotas`}
                          />
                        </div>
                        <span className="w-24 shrink-0 text-xs font-bold">
                          <span className="text-green-400">{w.Vitórias}V</span>
                          <span className="text-gray-700 mx-1">/</span>
                          <span className="text-red-400">{w.Derrotas}D</span>
                        </span>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </Card>
          </div>

          {(hasPositionData || hasMatchTypeData) && (
            <div className="grid gap-6 md:grid-cols-2">
              {hasPositionData && (
                <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
                  <h2 className="mb-4 text-xl font-black text-white">Win Rate por Posição</h2>
                  <div className="space-y-4">
                    {Object.entries(positionStats)
                      .sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games)
                      .map(([pos, stat]) => {
                        const wr = stat.games > 0 ? stat.wins / stat.games : 0
                        return (
                          <div key={pos} className="space-y-2">
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-gray-300 font-black uppercase tracking-widest text-[10px]">{pos}</span>
                              <span className="text-white font-bold">
                                {stat.wins}V / {stat.games - stat.wins}D{" "}
                                <span className="text-gray-500 ml-1">({Math.round(wr * 100)}%)</span>
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${wr >= 0.5 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"}`}
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
                <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
                  <h2 className="mb-4 text-xl font-black text-white">Win Rate por Tipo</h2>
                  <div className="space-y-4">
                    {Object.entries(matchTypeStats)
                      .sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games)
                      .map(([type, stat]) => {
                        const wr = stat.games > 0 ? stat.wins / stat.games : 0
                        return (
                          <div key={type} className="space-y-2">
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-gray-300 font-bold">{type}</span>
                              <span className="text-white font-bold">
                                {stat.wins}V / {stat.games - stat.wins}D{" "}
                                <span className="text-gray-500 ml-1">({Math.round(wr * 100)}%)</span>
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${wr >= 0.5 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"}`}
                                style={{ width: `${Math.round(wr * 100)}%` }}
                              />
                            </div>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{stat.games} partidas</p>
                          </div>
                        )
                      })}
                  </div>
                </Card>
              )}
            </div>
          )}

          <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-black text-white">Resumo Geral</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-black/40 p-5 text-center ring-1 ring-white/5 transition-all hover:bg-black/60">
                <p className="text-3xl font-black text-white">{selectedPlayer.score}</p>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mt-1">Pontuação</p>
              </div>
              <div className="rounded-2xl bg-black/40 p-5 text-center ring-1 ring-white/5 transition-all hover:bg-black/60">
                <p className="text-3xl font-black text-green-400">{selectedPlayer.wins}</p>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mt-1">Vitórias</p>
              </div>
              <div className="rounded-2xl bg-black/40 p-5 text-center ring-1 ring-white/5 transition-all hover:bg-black/60">
                <p className="text-3xl font-black text-red-400">{selectedPlayer.losses}</p>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mt-1">Derrotas</p>
              </div>
              <div className="rounded-2xl bg-black/40 p-5 text-center ring-1 ring-white/5 transition-all hover:bg-black/60">
                <p className="text-3xl font-black text-yellow-400">#{selectedPlayer.rank}</p>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mt-1">Ranking</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
