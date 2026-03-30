"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Target, Zap, Shield, Server, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getPlayerDetailStats, PlayerDetailStats } from "@/lib/services/playerStats"
import { getToken } from "@/lib/auth"

const SERVERS = [
  { id: "779382528821166100", name: "Timbas" },
  { id: "465211051865276426", name: "Entrosa Não" },
  { id: "1187881256508211321", name: "Fusão" },
  { id: "4", name: "TimbasBot Official" },
]

export default function StatsPage() {
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [rankingLoading, setRankingLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [detail, setDetail] = useState<PlayerDetailStats | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        const data = await getRanking(token, selectedServer)
        setPlayers(data)
      } catch (err) {
        setError("Falha ao carregar jogadores.")
        console.error(err)
      } finally {
        setRankingLoading(false)
      }
    }
    fetchPlayers()
  }, [selectedServer])

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
  }, [selectedUserId])

  const streakLabel = detail
    ? detail.currentStreakType
      ? `${detail.currentStreakCount}${detail.currentStreakType}`
      : "—"
    : "—"

  const streakColor =
    detail?.currentStreakType === "W"
      ? "text-green-400"
      : detail?.currentStreakType === "L"
      ? "text-red-400"
      : "text-gray-400"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Estatísticas</h1>
          <p className="text-gray-400">Acompanhe o desempenho detalhado por jogador</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={selectedServer} onValueChange={setSelectedServer}>
            <SelectTrigger className="w-full border-gray-700 bg-gray-800/50 text-white sm:w-[220px]">
              <Server className="mr-2 h-4 w-4 text-blue-400" />
              <SelectValue placeholder="Servidor" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900 text-white">
              {SERVERS.map((s) => (
                <SelectItem key={s.id} value={s.id} className="focus:bg-gray-800 focus:text-white">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            disabled={rankingLoading || players.length === 0}
          >
            <SelectTrigger className="w-full border-gray-700 bg-gray-800/50 text-white sm:w-[220px]">
              <User className="mr-2 h-4 w-4 text-purple-400" />
              <SelectValue placeholder={rankingLoading ? "Carregando..." : "Selecione um jogador"} />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900 text-white">
              {players.map((p) => (
                <SelectItem key={p.userId} value={String(p.userId)} className="focus:bg-gray-800 focus:text-white">
                  {p.rank}º {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-32" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
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
                  <p className="text-3xl font-bold text-purple-400">{detail.longestWinStreak}W</p>
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
              <span className="text-sm font-normal text-gray-400">
                (últimas {detail.recentForm.length} partidas)
              </span>
            </h2>
            {detail.recentForm.length === 0 ? (
              <p className="text-gray-500">Sem partidas finalizadas ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.recentForm.map((result, i) => (
                  <span
                    key={i}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                      result === "W" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
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
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                      Lado Azul
                    </span>
                    <span className="text-white">
                      {detail.blueSide.wins}V / {detail.blueSide.losses}D
                      {detail.blueSide.total > 0 && (
                        <span className="ml-2 text-gray-400">({Math.round(detail.blueSide.winRate * 100)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.round(detail.blueSide.winRate * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{detail.blueSide.total} partidas</p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-red-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                      Lado Vermelho
                    </span>
                    <span className="text-white">
                      {detail.redSide.wins}V / {detail.redSide.losses}D
                      {detail.redSide.total > 0 && (
                        <span className="ml-2 text-gray-400">({Math.round(detail.redSide.winRate * 100)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all"
                      style={{ width: `${Math.round(detail.redSide.winRate * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{detail.redSide.total} partidas</p>
                </div>
              </div>
            </Card>

            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-bold text-white">Desempenho Semanal</h2>
              {detail.weeklyPerformance.length === 0 ? (
                <p className="text-gray-500">Sem dados suficientes.</p>
              ) : (
                <div className="space-y-3">
                  {detail.weeklyPerformance.map((week) => {
                    const total = week.wins + week.losses
                    const winPct = total > 0 ? (week.wins / total) * 100 : 0
                    const label = new Date(week.week).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                    return (
                      <div key={week.week} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Semana de {label}</span>
                          <span className="text-white">
                            {week.wins}V — {week.losses}D
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                            style={{ width: `${winPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

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
