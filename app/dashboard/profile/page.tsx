"use client"

import { useState, useEffect } from "react"
import { Trophy, Swords, TrendingUp, Star, Hash, Flame, Zap, BarChart3 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { getToken, decodeToken, TokenPayload } from "@/lib/auth"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getPlayerDetailStats, PlayerDetailStats } from "@/lib/services/playerStats"
import { useServer } from "@/lib/server-context"

export default function ProfilePage() {
  const { selectedServer, serverName } = useServer()
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [detail, setDetail] = useState<PlayerDetailStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const token = getToken()
        if (!token) return
        const decoded = decodeToken(token)
        if (!decoded) return
        setPayload(decoded)
        const uid = Number(decoded.sub)
        const [ranking, playerDetail] = await Promise.all([
          getRanking(token, selectedServer),
          getPlayerDetailStats(token, selectedServer, uid).catch(() => null),
        ])
        setStats(ranking.find((p) => p.userId === uid) ?? null)
        setDetail(playerDetail)
      } catch { /* silent */ }
      finally { setIsLoading(false) }
    }
    load()
  }, [selectedServer])

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner className="size-8 text-blue-500" /></div>

  const initials = payload?.name ? payload.name.slice(0, 2).toUpperCase() : "?"
  const winRatePct = stats ? Math.round(stats.winRate * 100) : 0
  const blueWinRatePct = detail ? Math.round(detail.blueSide.winRate * 100) : null
  const redWinRatePct = detail ? Math.round(detail.redSide.winRate * 100) : null

  return (
    <div className="content-enter space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Meu Perfil</h1>
        <p className="mt-1 text-sm text-gray-500">Desempenho em <span className="text-white">{serverName}</span></p>
      </div>

      {/* Top row: avatar card + main stats */}
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">

        {/* Avatar card */}
        <div className="flex flex-col items-center rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
          {/* Gradient border avatar */}
          <div className="mb-5 rounded-full p-[2px] bg-gradient-to-br from-blue-500/60 via-purple-500/30 to-red-500/50">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-[#0d0d15] text-3xl font-black text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="text-xl font-black text-white mb-1">{payload?.name ?? "—"}</h2>

          {stats && (
            <span className="mb-5 flex items-center gap-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-400">
              <Trophy className="h-3.5 w-3.5" />Rank #{stats.rank}
            </span>
          )}

          <div className="w-full space-y-2 text-sm">
            {stats?.discordId && (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <Hash className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                <span className="truncate text-xs text-gray-500 font-mono">{stats.discordId}</span>
              </div>
            )}
            <p className="text-center text-xs text-gray-700">Avatar sincronizado via Discord</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="space-y-4">
          {/* Main numbers */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Partidas",  value: stats?.totalGames ?? "—", icon: Swords,      color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/15"   },
              { label: "Vitórias",  value: stats?.wins ?? "—",       icon: Trophy,      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/15"  },
              { label: "Win Rate",  value: stats ? `${winRatePct}%` : "—", icon: Star,  color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/15" },
              { label: "Pontos",    value: stats?.score ?? "—",      icon: TrendingUp,  color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/15"   },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} bg-white/[0.02] p-4`}>
                <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-xs text-gray-600">{label}</p>
                <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Streak + form */}
          {detail && (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Streak */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  Sequência atual
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-black ${detail.currentStreakType === 'W' ? 'text-green-400' : detail.currentStreakType === 'L' ? 'text-red-400' : 'text-gray-500'}`}>
                    {detail.currentStreakCount}
                  </span>
                  <span className={`mb-1 text-sm font-bold ${detail.currentStreakType === 'W' ? 'text-green-500' : detail.currentStreakType === 'L' ? 'text-red-500' : 'text-gray-600'}`}>
                    {detail.currentStreakType === 'W' ? 'vitórias' : detail.currentStreakType === 'L' ? 'derrotas' : '—'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">Melhor sequência: <span className="text-white font-semibold">{detail.longestWinStreak}V</span></p>
              </div>

              {/* Recent form */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                  Forma recente
                </div>
                <div className="flex gap-1.5">
                  {detail.recentForm.length === 0 ? (
                    <span className="text-xs text-gray-600">Sem dados</span>
                  ) : (
                    detail.recentForm.slice(0, 10).map((r, i) => (
                      <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-black ${r === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {r}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Blue / Red side */}
          {detail && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                Desempenho por lado
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Lado Azul", wr: blueWinRatePct, games: detail.blueSide.total, wins: detail.blueSide.wins, color: "bg-blue-500", text: "text-blue-400" },
                  { label: "Lado Vermelho", wr: redWinRatePct, games: detail.redSide.total, wins: detail.redSide.wins, color: "bg-red-500", text: "text-red-400" },
                ].map(({ label, wr, games, wins, color, text }) => (
                  <div key={label}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className={`font-semibold ${text}`}>{label}</span>
                      <span className="text-gray-500">{wins}V / {games} jogos</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${wr ?? 0}%` }} />
                    </div>
                    <p className={`mt-1 text-right text-xs font-bold ${text}`}>{wr ?? 0}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
