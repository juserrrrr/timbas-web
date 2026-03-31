"use client"

import { useState, useEffect } from "react"
import { User, Mail, Hash, Trophy, Swords, TrendingUp, Star } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { getToken, decodeToken, TokenPayload } from "@/lib/auth"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { useServer } from "@/lib/server-context"

export default function ProfilePage() {
  const { selectedServer } = useServer()
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken()
        if (!token) return
        const decoded = decodeToken(token)
        if (!decoded) return
        setPayload(decoded)
        const ranking = await getRanking(token, selectedServer)
        setStats(ranking.find((p) => p.userId === Number(decoded.sub)) ?? null)
      } catch { /* silent */ }
      finally { setIsLoading(false) }
    }
    load()
  }, [selectedServer])

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner className="size-8 text-blue-500" /></div>

  const initials = payload?.name ? payload.name.slice(0, 2).toUpperCase() : "?"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Meu Perfil</h1>
        <p className="mt-1 text-sm text-gray-500">Suas informações e estatísticas</p>
      </div>

      {/* Profile card + info side by side */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Avatar card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/40 to-red-500/30">
            <Avatar className="h-24 w-24 rounded-[15px]">
              <AvatarFallback className="rounded-[15px] bg-gradient-to-br from-blue-600 to-red-600 text-3xl font-black text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <h2 className="text-lg font-bold text-white">{payload?.name ?? "—"}</h2>
          {stats && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">Rank #{stats.rank}</span>
            </div>
          )}
          {stats && (
            <div className="mt-4 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs text-gray-600 mb-0.5">Pontuação</p>
              <p className="text-2xl font-black text-blue-400">{stats.score} pts</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <User className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="font-bold text-white">Informações da Conta</h2>
          </div>

          <div className="space-y-3">
            {[
              { icon: User,  label: "Nome de usuário", value: payload?.name  ?? "—" },
              { icon: Mail,  label: "Email",            value: payload?.email ?? "—" },
              { icon: Hash,  label: "Discord ID",       value: stats?.discordId ?? "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                <Icon className="h-4 w-4 flex-shrink-0 text-gray-600" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-600">{label}</p>
                  <p className="truncate text-sm font-medium text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Partidas",  value: stats?.totalGames ?? "—", icon: Swords,     color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/15"   },
          { label: "Vitórias",  value: stats?.wins ?? "—",       icon: Trophy,     color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/15"  },
          { label: "Win Rate",  value: stats ? `${Math.round(stats.winRate * 100)}%` : "—", icon: Star, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/15" },
          { label: "Ranking",   value: stats ? `#${stats.rank}` : "—", icon: TrendingUp, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/15" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-2xl border ${border} bg-white/[0.02] p-5`}>
            <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-600 mb-1">{label}</p>
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
