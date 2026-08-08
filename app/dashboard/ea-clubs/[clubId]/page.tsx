"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Activity, CalendarClock, CirclePercent, Goal, Hand, History, Shield, ShieldCheck, Star, Swords, Target, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getEaClubDashboard, getEaClubLeaderboard } from "@/lib/services/ea-clubs"
import type { EaClubDashboard, EaLeaderboardCategory } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, formatDate, MatchRow, PageLoading } from "@/components/ea-clubs/shared"

const HIGHLIGHTS = [
  { key: "eaClubGoals", label: "Artilheiro", icon: Goal, color: "text-emerald-400", suffix: "gols no clube" },
  { key: "eaClubAssists", label: "Garçom", icon: Target, color: "text-sky-400", suffix: "assistências no clube" },
  { key: "defenders", label: "Melhor defensor", icon: Shield, color: "text-blue-400", suffix: "de nota" },
  { key: "eaClubTackles", label: "Rei dos desarmes", icon: ShieldCheck, color: "text-orange-400", suffix: "desarmes no clube" },
  { key: "saves", label: "Paredão", icon: Hand, color: "text-purple-400", suffix: "defesas" },
  { key: "eaClubRating", label: "Craque do clube", icon: Star, color: "text-amber-400", suffix: "de nota no clube" },
] as const

export default function EaClubDashboardPage({ params }: { params: Promise<{ clubId: string }> }) {
  const [clubId, setClubId] = useState("")
  const [data, setData] = useState<EaClubDashboard | null>(null)
  const [categories, setCategories] = useState<EaLeaderboardCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => { void params.then(value => setClubId(value.clubId)) }, [params])

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)
    try {
      const [dashboard, leaderboard] = await Promise.all([
        getEaClubDashboard(clubId),
        getEaClubLeaderboard(clubId),
      ])
      setData(dashboard)
      setCategories(leaderboard)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o clube")
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => { void load() }, [load])

  if (loading || !clubId) return <PageLoading />
  if (error || !data) return <ErrorState message={error} retry={() => void load()} />

  const stats = [
    { label: "Partidas", value: data.matches, icon: Swords },
    { label: "Vitórias", value: data.wins, icon: Trophy },
    { label: "Empates", value: data.draws, icon: ShieldCheck },
    { label: "Derrotas", value: data.losses, icon: Shield },
    { label: "Aproveitamento", value: `${Math.round(data.winRate <= 1 ? data.winRate * 100 : data.winRate)}%`, icon: CirclePercent },
    { label: "Gols marcados", value: data.goalsFor, icon: Activity },
    { label: "Gols sofridos", value: data.goalsAgainst, icon: Activity },
  ]

  const eaTotals = data.eaAllTimeStats ? [
    { label: "Partidas", value: data.eaAllTimeStats.gamesPlayed },
    { label: "Vitórias", value: data.eaAllTimeStats.wins },
    { label: "Empates", value: data.eaAllTimeStats.draws },
    { label: "Derrotas", value: data.eaAllTimeStats.losses },
    { label: "Gols marcados", value: data.eaAllTimeStats.goalsFor },
    { label: "Gols sofridos", value: data.eaAllTimeStats.goalsAgainst },
  ] : []

  return <div className="mx-auto max-w-7xl space-y-8">
    <ClubPageHeader name={data.club.nickname || data.club.name} subtitle={`Última atualização: ${formatDate(data.club.lastSyncAt, true)}`} />

    <div className="grid gap-3 md:grid-cols-2"><Card className="flex items-center gap-4 border-blue-500/15 bg-blue-500/[0.06] p-4"><CalendarClock className="h-5 w-5 text-blue-400" /><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">Monitoramento ativo desde</p><p className="mt-1 font-bold text-white">{formatDate(data.trackingStartedAt, true)}</p></div></Card><Card className="flex items-center gap-4 border-white/[0.07] bg-white/[0.025] p-4"><History className="h-5 w-5 text-gray-400" /><div><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Partida mais antiga armazenada</p><p className="mt-1 font-bold text-white">{formatDate(data.earliestImportedMatchAt, true)}</p></div></Card></div>

    <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">Dados auditáveis</p><h2 className="text-xl font-black text-white">Desde o início do monitoramento</h2></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <Card key={label} className="border-white/[0.07] bg-white/[0.025] p-4"><Icon className="mb-3 h-4 w-4 text-blue-400" /><p className="text-2xl font-black tabular-nums text-white">{value}</p><p className="text-xs font-medium text-gray-500">{label}</p></Card>)}</div></section>

    {eaTotals.length > 0 && <section><div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Totais informados pela EA</p><h2 className="text-xl font-black text-white">Histórico geral disponível</h2></div><p className="text-xs text-gray-500">Atualizado em {formatDate(data.eaAllTimeStats?.updatedAt, true)}</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{eaTotals.map(item => <Card key={item.label} className="border-emerald-500/10 bg-emerald-500/[0.035] p-4 text-center"><p className="text-2xl font-black tabular-nums text-white">{item.value ?? "—"}</p><p className="mt-1 text-xs font-medium text-gray-500">{item.label}</p></Card>)}</div><p className="mt-2 text-xs text-gray-600">Estes totais podem incluir jogos anteriores ao monitoramento; a EA não fornece o detalhe dessas partidas antigas.</p></section>}

    <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">Destaques do elenco</p><h2 className="text-xl font-black text-white">Os donos do jogo</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{HIGHLIGHTS.map(highlight => { const category = categories.find(item => item.key === highlight.key); const entry = category?.entries[0]; const Icon = highlight.icon; return <Card key={highlight.key} className="relative overflow-hidden border-white/[0.07] bg-white/[0.025] p-5"><div className="flex items-start justify-between"><div className={`rounded-xl bg-white/[0.04] p-3 ${highlight.color}`}><Icon className="h-5 w-5" /></div>{category?.minimumMatches != null && <span className="text-[10px] font-bold uppercase text-gray-600">mín. {category.minimumMatches} jogos</span>}</div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">{highlight.label}</p>{entry ? <Link href={`/dashboard/ea-clubs/${clubId}/players/${entry.player.id}`} className="mt-1 block"><p className="truncate text-xl font-black text-white hover:text-blue-300">{entry.player.playerName}</p><p className={`mt-1 text-sm font-bold ${highlight.color}`}>{highlight.key === "averageRating" || highlight.key === "defenders" ? entry.value.toFixed(1) : entry.value} {highlight.suffix}</p></Link> : <p className="mt-2 text-sm text-gray-600">Sem dados suficientes</p>}</Card> })}</div></section>

    <section><h2 className="mb-3 text-lg font-black text-white">Últimas 20 partidas</h2>{data.recentMatches.length ? <div className="space-y-3">{data.recentMatches.map(match => <MatchRow key={match.id} clubId={clubId} clubName={data.club.name} match={match} />)}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-bold text-white">Nenhuma partida sincronizada</p><p className="mt-1 text-sm text-gray-500">A sincronização é gerenciada pelo painel administrativo.</p></Card>}</section>
  </div>
}
