"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Target, Zap, Shield, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getToken } from "@/lib/auth"
import { apiFetch, authHeaders } from "@/lib/api"
import type { PlayerStats, PlayerDetailStats } from "@/lib/services/leaderboard"

interface Props {
  players: PlayerStats[]
  serverId: string
  currentUserId: number
}

export function StatsClient({ players, serverId, currentUserId }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [statsLoading, setStatsLoading] = useState(false)
  const [detail, setDetail] = useState<PlayerDetailStats | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (players.length === 0) return
    const me = players.find((p) => p.userId === currentUserId)
    if (me) setSelectedUserId(String(me.userId))
  }, [players, currentUserId])

  useEffect(() => {
    if (!selectedUserId) return
    const token = getToken()
    if (!token) return

    setStatsLoading(true)
    setDetail(null)
    setError(null)
    setSelectedPlayer(players.find((p) => String(p.userId) === selectedUserId) ?? null)

    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/leaderboard/${serverId}/player/${selectedUserId}`, {
      headers: authHeaders(token),
    })
      .then((res) => res.json())
      .then((data: PlayerDetailStats) => setDetail(data))
      .catch(() => setError("Falha ao carregar estatísticas."))
      .finally(() => setStatsLoading(false))
  }, [selectedUserId, serverId])

  const streakLabel = detail
    ? detail.currentStreakType
      ? `${detail.currentStreakCount}${detail.currentStreakType === "W" ? "V" : "D"}`
      : "—"
    : "—"
  const streakColor =
    detail?.currentStreakType === "W" ? "text-green-400" : detail?.currentStreakType === "L" ? "text-red-400" : "text-gray-400"

  const weeklyChartData = detail?.weeklyPerformance.map((w) => ({
    week: new Date(w.week).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    Vitórias: w.wins,
    Derrotas: w.losses,
  })) ?? []

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Estatísticas</h1>
          <p className="text-sm text-gray-500">Acompanhe o desempenho detalhado por jogador</p>
        </div>
        <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={players.length === 0}>
          <SelectTrigger className="w-full border-white/10 bg-white/5 text-white sm:w-[280px] rounded-xl h-11">
            <User className="mr-2 h-4 w-4 text-blue-400" />
            <SelectValue placeholder="Selecione um jogador" />
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

      {!selectedUserId && !error && (
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
                  <span key={i} className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black transition-all hover:scale-110 cursor-default ${result === "W" ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"}`}>
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
                {[
                  { label: "Lado Azul", side: detail.blueSide, color: "from-blue-600 to-blue-400", text: "text-blue-400" },
                  { label: "Lado Vermelho", side: detail.redSide, color: "from-red-600 to-red-400", text: "text-red-400" },
                ].map(({ label, side, color, text }) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm items-end">
                      <span className={`flex items-center gap-2 ${text} font-bold`}>
                        <span className={`inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r ${color}`} />{label}
                      </span>
                      <span className="text-white font-bold">
                        {side.wins}V / {side.losses}D{side.total > 0 && <span className="ml-2 text-gray-500 font-black">({Math.round(side.winRate * 100)}%)</span>}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
                      <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000`} style={{ width: `${Math.round(side.winRate * 100)}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{side.total} partidas totais</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-black text-white">Desempenho Semanal</h2>
              {weeklyChartData.length === 0 ? (
                <p className="text-sm font-medium text-gray-500 italic">Sem dados suficientes.</p>
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
                          <div className="bg-green-500/80 rounded-md transition-all duration-1000 hover:bg-green-500" style={{ width: `${(w.Vitórias / maxVal) * 50}%`, height: "100%" }} />
                          <div className="bg-red-500/80 rounded-md transition-all duration-1000 hover:bg-red-500" style={{ width: `${(w.Derrotas / maxVal) * 50}%`, height: "100%" }} />
                        </div>
                        <span className="w-24 shrink-0 text-xs font-bold">
                          <span className="text-green-400">{w.Vitórias}V</span><span className="text-gray-700 mx-1">/</span><span className="text-red-400">{w.Derrotas}D</span>
                        </span>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </Card>
          </div>

          {(detail.positionStats.length > 0 || detail.matchTypeStats.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {detail.positionStats.length > 0 && (
                <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
                  <h2 className="mb-4 text-xl font-black text-white">Win Rate por Posição</h2>
                  <div className="space-y-4">
                    {detail.positionStats.map((pos) => (
                      <div key={pos.position} className="space-y-2">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-300 font-black uppercase tracking-widest text-[10px]">{pos.position}</span>
                          <span className="text-white font-bold">
                            {pos.wins}V / {pos.losses}D <span className="text-gray-500 ml-1">({Math.round(pos.winRate * 100)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
                          <div className={`h-full rounded-full transition-all duration-1000 ${pos.winRate >= 0.5 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.round(pos.winRate * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {detail.matchTypeStats.length > 0 && (
                <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
                  <h2 className="mb-4 text-xl font-black text-white">Win Rate por Tipo</h2>
                  <div className="space-y-4">
                    {detail.matchTypeStats.map((t) => (
                      <div key={t.type} className="space-y-2">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-300 font-bold">{t.label}</span>
                          <span className="text-white font-bold">
                            {t.wins}V / {t.losses}D <span className="text-gray-500 ml-1">({Math.round(t.winRate * 100)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
                          <div className={`h-full rounded-full transition-all duration-1000 ${t.winRate >= 0.5 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.round(t.winRate * 100)}%` }} />
                        </div>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{t.total} partidas</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          <Card className="border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-black text-white">Resumo Geral</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Pontuação", value: selectedPlayer.score, color: "text-white" },
                { label: "Vitórias", value: selectedPlayer.wins, color: "text-green-400" },
                { label: "Derrotas", value: selectedPlayer.losses, color: "text-red-400" },
                { label: "Ranking", value: `#${selectedPlayer.rank}`, color: "text-yellow-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl bg-black/40 p-5 text-center ring-1 ring-white/5 transition-all hover:bg-black/60">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mt-1">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
