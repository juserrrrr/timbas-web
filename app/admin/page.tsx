"use client"

import { useEffect, useState } from "react"
import { Users, Server, Trophy, Activity, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getMatchHistory, Match } from "@/lib/services/matches"
import { getToken } from "@/lib/auth"
import { SERVERS } from "@/lib/server-context"
import { toast } from "sonner"

interface ServerSnapshot {
  id: string
  name: string
  players: number
  totalGames: number
  topPlayer: string | null
  loading: boolean
  error: boolean
}

export default function AdminPage() {
  const [snapshots, setSnapshots] = useState<ServerSnapshot[]>(
    SERVERS.map((s) => ({ id: s.id, name: s.name, players: 0, totalGames: 0, topPlayer: null, loading: true, error: false }))
  )
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async (silent = false) => {
    if (!silent) setRefreshing(true)
    const token = getToken()
    if (!token) return

    const results = await Promise.allSettled(
      SERVERS.map(async (server) => {
        const [ranking, matches] = await Promise.all([
          getRanking(token, server.id).catch(() => [] as PlayerStats[]),
          getMatchHistory(token, server.id).catch(() => [] as Match[]),
        ])
        return {
          id: server.id,
          name: server.name,
          players: ranking.length,
          totalGames: matches.length,
          topPlayer: ranking[0]?.name ?? null,
          loading: false,
          error: false,
        }
      })
    )

    setSnapshots(
      results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { ...SERVERS[i], players: 0, totalGames: 0, topPlayer: null, loading: false, error: true }
      )
    )

    if (!silent) {
      setRefreshing(false)
      toast.success("Dados atualizados", { duration: 2500 })
    }
  }

  useEffect(() => {
    fetchAll(true)
  }, [])

  const totalPlayers = snapshots.reduce((a, s) => a + s.players, 0)
  const totalGames   = snapshots.reduce((a, s) => a + s.totalGames, 0)
  const allLoaded    = snapshots.every((s) => !s.loading)

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Visão Geral</h1>
          <p className="text-gray-500 text-sm mt-1">Resumo de todos os servidores</p>
        </div>
        <button
          onClick={() => fetchAll(false)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Servidores</p>
              <p className="text-3xl font-black text-white">{SERVERS.length}</p>
            </div>
            <div className="rounded-xl bg-orange-500/10 p-3">
              <Server className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Jogadores (total)</p>
              {allLoaded ? (
                <p className="text-3xl font-black text-blue-400">{totalPlayers}</p>
              ) : (
                <Spinner className="mt-2 size-5 text-blue-400" />
              )}
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Partidas (total)</p>
              {allLoaded ? (
                <p className="text-3xl font-black text-green-400">{totalGames}</p>
              ) : (
                <Spinner className="mt-2 size-5 text-green-400" />
              )}
            </div>
            <div className="rounded-xl bg-green-500/10 p-3">
              <Activity className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Média partidas/servidor</p>
              {allLoaded ? (
                <p className="text-3xl font-black text-purple-400">
                  {SERVERS.length > 0 ? Math.round(totalGames / SERVERS.length) : 0}
                </p>
              ) : (
                <Spinner className="mt-2 size-5 text-purple-400" />
              )}
            </div>
            <div className="rounded-xl bg-purple-500/10 p-3">
              <Trophy className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Per-server cards */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">Por Servidor</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {snapshots.map((s) => (
            <Card
              key={s.id}
              className="border-gray-800/50 bg-gray-900/50 p-5 backdrop-blur-sm space-y-4"
            >
              {/* Server header */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
                <span className="font-semibold text-white text-sm truncate">{s.name}</span>
              </div>

              {s.loading ? (
                <div className="flex justify-center py-4">
                  <Spinner className="size-5 text-gray-500" />
                </div>
              ) : s.error ? (
                <p className="text-xs text-red-400/70 py-2">Falha ao carregar dados</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Jogadores</span>
                    <span className="font-bold text-blue-400">{s.players}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Partidas</span>
                    <span className="font-bold text-green-400">{s.totalGames}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Top 1</span>
                    <span className="font-bold text-yellow-400 truncate max-w-[100px] text-right">
                      {s.topPlayer ?? "—"}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

    </div>
  )
}
