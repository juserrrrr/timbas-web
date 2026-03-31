"use client"

import { useEffect, useState } from "react"
import { Users, Server, Activity, RefreshCw, Crown, Bot, UserCheck, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getRanking } from "@/lib/services/ranking"
import { getMatchHistory } from "@/lib/services/matches"
import { adminGetUsers, AdminUser } from "@/lib/services/admin"
import { getToken, decodeToken } from "@/lib/auth"
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

const ROLE_META = {
  ADMIN:  { label: "Admins",   color: "text-orange-400", bg: "bg-orange-500/10", icon: Crown },
  BOT:    { label: "Bots",     color: "text-purple-400", bg: "bg-purple-500/10", icon: Bot },
  USER:   { label: "Users",    color: "text-blue-400",   bg: "bg-blue-500/10",   icon: UserCheck },
  PLAYER: { label: "Players",  color: "text-gray-400",   bg: "bg-gray-500/10",   icon: Users },
}

export default function AdminPage() {
  const [snapshots, setSnapshots] = useState<ServerSnapshot[]>(
    SERVERS.map((s) => ({ id: s.id, name: s.name, players: 0, totalGames: 0, topPlayer: null, loading: true, error: false }))
  )
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminName, setAdminName] = useState("")

  useEffect(() => {
    const token = getToken()
    if (token) {
      const p = decodeToken(token)
      if (p) setAdminName(p.name)
    }
  }, [])

  const fetchServers = async () => {
    const token = getToken()
    if (!token) return
    const results = await Promise.allSettled(
      SERVERS.map(async (server) => {
        const [ranking, matches] = await Promise.all([
          getRanking(token, server.id).catch(() => []),
          getMatchHistory(token, server.id).catch(() => []),
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
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const token = getToken()!
      const data = await adminGetUsers(token)
      setUsers(data)
    } catch {
      // silent
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    fetchServers()
    fetchUsers()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchServers(), fetchUsers()])
    setRefreshing(false)
    toast.success("Dados atualizados")
  }

  const allLoaded = snapshots.every((s) => !s.loading)
  const totalPlayers = snapshots.reduce((a, s) => a + s.players, 0)
  const totalGames   = snapshots.reduce((a, s) => a + s.totalGames, 0)

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Visão Geral</h1>
          <p className="mt-1 text-sm text-gray-500">
            {adminName ? `Olá, ${adminName}` : "Painel de administração"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Segment KPIs */}
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
              <p className="text-sm text-gray-500">Usuários cadastrados</p>
              {usersLoading ? <Spinner className="mt-2 size-5 text-blue-400" /> : (
                <p className="text-3xl font-black text-blue-400">{users.length}</p>
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
              <p className="text-sm text-gray-500">Partidas registradas</p>
              {!allLoaded ? <Spinner className="mt-2 size-5 text-green-400" /> : (
                <p className="text-3xl font-black text-green-400">{totalGames}</p>
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
              <p className="text-sm text-gray-500">Jogadores (leaderboards)</p>
              {!allLoaded ? <Spinner className="mt-2 size-5 text-purple-400" /> : (
                <p className="text-3xl font-black text-purple-400">{totalPlayers}</p>
              )}
            </div>
            <div className="rounded-xl bg-purple-500/10 p-3">
              <ShieldCheck className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Role breakdown + Servers side by side */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Role breakdown */}
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <h2 className="mb-5 text-base font-bold text-white">Usuários por Cargo</h2>
          {usersLoading ? (
            <div className="flex justify-center py-8"><Spinner className="size-6 text-gray-500" /></div>
          ) : (
            <div className="space-y-3">
              {(["PLAYER", "USER", "BOT", "ADMIN"] as const).map((role) => {
                const count = roleCounts[role] ?? 0
                const pct = users.length > 0 ? (count / users.length) * 100 : 0
                const m = ROLE_META[role]
                const Icon = m.icon
                return (
                  <div key={role} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-2 font-medium ${m.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {m.label}
                      </span>
                      <span className="text-gray-300 tabular-nums">
                        {count}
                        <span className="ml-2 text-gray-600">({Math.round(pct)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${m.bg} ${m.color.replace("text-", "bg-").replace("-400", "-500")}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Per-server */}
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <h2 className="mb-5 text-base font-bold text-white">Por Servidor</h2>
          <div className="space-y-3">
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-black/20 px-4 py-3"
              >
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
                <span className="flex-1 truncate text-sm font-medium text-white">{s.name}</span>
                {s.loading ? (
                  <Spinner className="size-4 text-gray-600" />
                ) : s.error ? (
                  <span className="text-xs text-red-400/70">erro</span>
                ) : (
                  <div className="flex gap-4 text-xs tabular-nums">
                    <span><span className="text-blue-400 font-bold">{s.players}</span> <span className="text-gray-600">jogadores</span></span>
                    <span><span className="text-green-400 font-bold">{s.totalGames}</span> <span className="text-gray-600">partidas</span></span>
                    {s.topPlayer && (
                      <span className="text-yellow-400 font-semibold truncate max-w-[80px]">🏆 {s.topPlayer}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  )
}
