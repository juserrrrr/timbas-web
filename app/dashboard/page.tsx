import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  Calendar,
  CircleDot,
  History,
  Radio,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react"

import { getSession } from "@/lib/session"
import { fetchMatchHistory, fetchRanking } from "@/lib/services/leaderboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { token, serverId, serverName, userId, payload } = await getSession()
  const [ranking, history] = await Promise.all([
    fetchRanking(token, serverId).catch(() => []),
    fetchMatchHistory(token, serverId, 1, 5).catch(() => ({ data: [], total: 0, page: 1, pages: 1, hasNext: false })),
  ])

  const stats = ranking.find((player) => player.userId === userId) ?? null
  const recentMatches = history.data
  const winRate = stats ? Math.round(stats.winRate * 100) : null
  const firstName = payload.name?.split(" ")[0] || "jogador"

  const statCards = [
    { label: "Partidas", value: stats?.totalGames ?? "-", hint: "jogos registrados", icon: Swords, tone: "blue" },
    { label: "Vitórias", value: stats?.wins ?? "-", hint: "resultados positivos", icon: Trophy, tone: "emerald" },
    { label: "Desempenho", value: winRate === null ? "-" : `${winRate}%`, hint: "taxa de vitória", icon: TrendingUp, tone: "violet" },
    { label: "Pontuação", value: stats?.score ?? "-", hint: "pontos acumulados", icon: Star, tone: "amber" },
  ] as const

  const tones = {
    blue: "border-blue-400/15 bg-blue-400/[0.05] text-blue-300",
    emerald: "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300",
    violet: "border-violet-400/15 bg-violet-400/[0.05] text-violet-300",
    amber: "border-amber-400/15 bg-amber-400/[0.05] text-amber-300",
  } as const

  return (
    <div className="dashboard-view space-y-5 sm:space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-zinc-950/60 px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
        <div aria-hidden className="absolute -right-24 -top-36 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-44 left-1/3 h-72 w-72 rounded-full bg-red-500/[0.07] blur-3xl" />
        <div aria-hidden className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-blue-400/0 via-blue-400/70 to-red-400/0" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300/80">Central do jogador</span>
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-[1.05] text-white sm:text-4xl lg:text-[46px]">
              Bora pra cima, <span className="bg-gradient-to-r from-blue-300 via-white to-red-300 bg-clip-text text-transparent">{firstName}</span>.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-[15px]">
              Seu resumo em {serverName}. Veja o momento atual, retome uma partida e encontre o próximo desafio sem perder tempo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href="/dashboard/active" className="group flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-zinc-950 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-white/10">
              <Radio className="h-4 w-4" />
              Ver partidas
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="/dashboard/profile" className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-xs font-bold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white">
              <UserRound className="h-4 w-4" />
              Meu perfil
            </Link>
          </div>
        </div>

        <div className="relative mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5 text-emerald-400" /> Dados sincronizados</span>
          <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-blue-400" /> {history.total} partidas no histórico</span>
          {stats && <span className="ml-auto rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-3 py-1 font-bold text-amber-300">Posição #{stats.rank}</span>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-zinc-600">{label}</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
                <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}>
                <Icon className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110" />
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-black text-white">Últimas partidas</h2>
              </div>
              <p className="mt-1 text-[11px] text-zinc-600">O que aconteceu mais recentemente</p>
            </div>
            <Link href="/dashboard/history" className="group flex items-center gap-1 text-[11px] font-bold text-zinc-500 transition hover:text-white">
              Ver histórico <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          {recentMatches.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Swords className="mx-auto mb-3 h-8 w-8 text-zinc-800" />
              <p className="text-sm font-bold text-zinc-400">Seu histórico começa na próxima partida</p>
              <p className="mt-1 text-xs text-zinc-600">Quando o primeiro jogo terminar, ele aparece aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.045]">
              {recentMatches.map((match) => {
                const inBlue = match.blueTeam.players.some((player) => player.userId === userId)
                const myTeamId = inBlue ? match.blueTeam.id : match.redTeam.id
                const won = match.winnerId === myTeamId
                const pending = match.winnerId === null
                const date = new Date(match.dateCreated)

                return (
                  <Link key={match.id} href={`/dashboard/match/${match.id}`} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.035] sm:px-6">
                    <span className={`h-8 w-1 flex-shrink-0 rounded-full ${pending ? "bg-amber-400" : won ? "bg-emerald-400" : "bg-red-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-200 transition group-hover:text-white">Partida #{match.id}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-600">
                        <Calendar className="h-3 w-3" />
                        {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${pending ? "border-amber-400/15 bg-amber-400/[0.06] text-amber-300" : won ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300" : "border-red-400/15 bg-red-400/[0.06] text-red-300"}`}>
                      {pending ? "Ao vivo" : won ? "Vitória" : "Derrota"}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-zinc-800 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-black text-white">Continue jogando</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">Tudo que você mais usa, a um clique de distância.</p>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/tournaments", label: "Campeonatos", icon: Trophy, tone: "text-amber-400" },
                { href: "/dashboard/stats", label: "Estatísticas", icon: TrendingUp, tone: "text-violet-400" },
                { href: "/dashboard/active", label: "Partidas ativas", icon: Radio, tone: "text-emerald-400" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/15 px-3.5 py-3 transition hover:border-white/12 hover:bg-white/[0.04]">
                  <item.icon className={`h-4 w-4 ${item.tone}`} />
                  <span className="flex-1 text-xs font-bold text-zinc-400 group-hover:text-white">{item.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-800 group-hover:text-zinc-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
