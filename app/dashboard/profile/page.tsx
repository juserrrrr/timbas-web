import Link from "next/link"
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Flame,
  Hash,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getDiscordAvatarUrl } from "@/lib/auth"
import { getSession } from "@/lib/session"
import { fetchPlayerDetailStats, fetchRanking } from "@/lib/services/leaderboard"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const { token, serverId, serverName, userId, payload } = await getSession()
  const [ranking, detail] = await Promise.all([
    fetchRanking(token, serverId).catch(() => []),
    fetchPlayerDetailStats(token, serverId, userId).catch(() => null),
  ])

  const stats = ranking.find((player) => player.userId === userId) ?? null
  const winRate = stats ? Math.round(stats.winRate * 100) : null
  const initials = payload.name ? payload.name.slice(0, 2).toUpperCase() : "?"
  const avatarUrl = getDiscordAvatarUrl(payload.discordId, payload.avatar, 256)
  const currentStreakLabel = detail?.currentStreakType === "W" ? "vitórias" : detail?.currentStreakType === "L" ? "derrotas" : "sem sequência"
  const currentStreakTone = detail?.currentStreakType === "W" ? "text-emerald-300" : detail?.currentStreakType === "L" ? "text-red-300" : "text-zinc-500"

  const overview = [
    { label: "Partidas", value: stats?.totalGames ?? "-", icon: Swords, tone: "text-blue-300", surface: "border-blue-400/15 bg-blue-400/[0.05]" },
    { label: "Vitórias", value: stats?.wins ?? "-", icon: Trophy, tone: "text-emerald-300", surface: "border-emerald-400/15 bg-emerald-400/[0.05]" },
    { label: "MVPs", value: stats?.mvpCount ?? "-", icon: Award, tone: "text-amber-300", surface: "border-amber-400/15 bg-amber-400/[0.05]" },
    { label: "Win rate", value: winRate === null ? "-" : `${winRate}%`, icon: Star, tone: "text-violet-300", surface: "border-violet-400/15 bg-violet-400/[0.05]" },
    { label: "Pontos", value: stats?.score ?? "-", icon: TrendingUp, tone: "text-sky-300", surface: "border-sky-400/15 bg-sky-400/[0.05]" },
  ]

  return (
    <div className="dashboard-view space-y-5 sm:space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-zinc-950/60 p-5 sm:p-7 lg:p-8">
        <div aria-hidden className="absolute -left-24 -top-36 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-44 right-0 h-80 w-80 rounded-full bg-violet-500/[0.08] blur-3xl" />
        <div aria-hidden className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-blue-400/0 via-violet-300/70 to-red-400/0" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative flex-shrink-0">
            <span aria-hidden className="absolute -inset-4 rounded-full bg-gradient-to-br from-blue-500/25 to-red-500/20 blur-xl" />
            <span className="relative block rounded-[26px] bg-gradient-to-br from-blue-400 via-violet-400 to-red-400 p-[2px] shadow-2xl shadow-blue-950/40">
              <Avatar className="h-24 w-24 rounded-[24px] sm:h-28 sm:w-28">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={payload.name ?? ""} />}
                <AvatarFallback className="rounded-[22px] bg-zinc-900 text-3xl font-black text-white">{initials}</AvatarFallback>
              </Avatar>
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-zinc-950 bg-emerald-400 text-zinc-950">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300/80">Perfil do jogador</span>
              <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Discord verificado</span>
            </div>
            <h1 className="mt-2 truncate text-3xl font-black text-white sm:text-4xl">{payload.name ?? "-"}</h1>
            <p className="mt-2 text-sm text-zinc-500">Desempenho em <span className="font-bold text-zinc-300">{serverName}</span></p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {stats && <span className="flex items-center gap-1.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-3 py-1.5 text-xs font-black text-amber-300"><Trophy className="h-3.5 w-3.5" /> Posição #{stats.rank}</span>}
              {stats?.discordId && <span className="flex min-w-0 items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 font-mono text-[10px] text-zinc-600"><Hash className="h-3 w-3" />{stats.discordId}</span>}
            </div>
          </div>

          <Link href="/dashboard/settings" className="group flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-bold text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white">
            <Settings className="h-3.5 w-3.5" /> Ajustes <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {overview.map(({ label, value, icon: Icon, tone, surface }) => (
          <div key={label} className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${surface} ${tone}`}><Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" /></span>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</p>
            <p className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${tone}`}>{value}</p>
          </div>
        ))}
      </section>

      {detail ? (
        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-400" /><h2 className="text-sm font-black text-white">Momento atual</h2></div>
                <Sparkles className="h-4 w-4 text-zinc-700" />
              </div>
              <div className="mt-6 flex items-end gap-3">
                <span className={`text-5xl font-black leading-none ${currentStreakTone}`}>{detail.currentStreakCount}</span>
                <span className={`mb-1 text-sm font-bold ${currentStreakTone}`}>{currentStreakLabel}</span>
              </div>
              <p className="mt-3 text-xs text-zinc-600">Melhor sequência: <span className="font-bold text-zinc-300">{detail.longestWinStreak} vitórias</span></p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-black text-white">Forma recente</h2></div>
              <div className="mt-5 flex flex-wrap gap-2">
                {detail.recentForm.length === 0 ? <span className="text-xs text-zinc-600">Ainda não há resultados suficientes.</span> : detail.recentForm.slice(0, 10).map((result, index) => (
                  <span key={`${result}-${index}`} className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-black ${result === "W" ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300" : "border-red-400/20 bg-red-400/[0.08] text-red-300"}`}>{result === "W" ? "V" : "D"}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-400" /><h2 className="text-sm font-black text-white">Desempenho por lado</h2></div>
            <p className="mt-1 text-[11px] text-zinc-600">Como seus resultados mudam em cada lado da disputa.</p>
            <div className="mt-7 space-y-7">
              {[
                { label: "Lado Azul", data: detail.blueSide, bar: "bg-blue-400", tone: "text-blue-300", glow: "shadow-blue-400/40" },
                { label: "Lado Vermelho", data: detail.redSide, bar: "bg-red-400", tone: "text-red-300", glow: "shadow-red-400/40" },
              ].map(({ label, data, bar, tone, glow }) => {
                const percentage = Math.round(data.winRate * 100)
                return (
                  <div key={label}>
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div><p className={`text-sm font-black ${tone}`}>{label}</p><p className="mt-0.5 text-[11px] text-zinc-600">{data.wins} vitórias em {data.total} jogos</p></div>
                      <span className={`text-3xl font-black tabular-nums ${tone}`}>{percentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                      <div className={`h-full rounded-full ${bar} shadow-lg ${glow}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-12 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-zinc-800" />
          <h2 className="mt-3 text-sm font-black text-white">Seu perfil está pronto</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-600">Jogue algumas partidas para liberar sequências, forma recente e comparações detalhadas.</p>
        </section>
      )}
    </div>
  )
}
