"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Activity, CirclePercent, Goal, Hand, Shield, ShieldCheck, Star, Swords, Target, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getEaClubDashboard, getEaClubLeaderboard } from "@/lib/services/ea-clubs"
import type { EaClubDashboard, EaLeaderboardCategory } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, formatDate, MatchRow, PageLoading } from "@/components/ea-clubs/shared"

const HIGHLIGHTS = [
  { key: "goals", label: "Artilheiro", icon: Goal, color: "text-emerald-400", suffix: "gols" },
  { key: "assists", label: "Garçom", icon: Target, color: "text-sky-400", suffix: "assistências" },
  { key: "defenders", label: "Melhor defensor", icon: Shield, color: "text-blue-400", suffix: "de nota" },
  { key: "tackles", label: "Rei dos desarmes", icon: ShieldCheck, color: "text-orange-400", suffix: "desarmes" },
  { key: "saves", label: "Paredão", icon: Hand, color: "text-purple-400", suffix: "defesas" },
  { key: "averageRating", label: "Craque do clube", icon: Star, color: "text-amber-400", suffix: "de nota" },
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

  return <div className="space-y-8">
    <ClubPageHeader name={data.club.nickname || data.club.name} subtitle={`Última atualização: ${formatDate(data.club.lastSyncAt, true)}`} />

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <Card key={label} className="border-white/[0.07] bg-white/[0.025] p-4"><Icon className="mb-3 h-4 w-4 text-blue-400" /><p className="text-2xl font-black tabular-nums text-white">{value}</p><p className="text-xs font-medium text-gray-500">{label}</p></Card>)}</div>

    <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">Destaques do elenco</p><h2 className="text-xl font-black text-white">Os donos do jogo</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{HIGHLIGHTS.map(highlight => { const category = categories.find(item => item.key === highlight.key); const entry = category?.entries[0]; const Icon = highlight.icon; return <Card key={highlight.key} className="relative overflow-hidden border-white/[0.07] bg-white/[0.025] p-5"><div className="flex items-start justify-between"><div className={`rounded-xl bg-white/[0.04] p-3 ${highlight.color}`}><Icon className="h-5 w-5" /></div>{category?.minimumMatches != null && <span className="text-[10px] font-bold uppercase text-gray-600">mín. {category.minimumMatches} jogos</span>}</div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">{highlight.label}</p>{entry ? <Link href={`/dashboard/ea-clubs/${clubId}/players/${entry.player.id}`} className="mt-1 block"><p className="truncate text-xl font-black text-white hover:text-blue-300">{entry.player.playerName}</p><p className={`mt-1 text-sm font-bold ${highlight.color}`}>{highlight.key === "averageRating" || highlight.key === "defenders" ? entry.value.toFixed(1) : entry.value} {highlight.suffix}</p></Link> : <p className="mt-2 text-sm text-gray-600">Sem dados suficientes</p>}</Card> })}</div></section>

    <section><h2 className="mb-3 text-lg font-black text-white">Últimas partidas</h2>{data.recentMatches.length ? <div className="space-y-2">{data.recentMatches.map(match => <MatchRow key={match.id} clubId={clubId} clubName={data.club.name} match={match} />)}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-bold text-white">Nenhuma partida sincronizada</p><p className="mt-1 text-sm text-gray-500">A sincronização é gerenciada pelo painel administrativo.</p></Card>}</section>
  </div>
}
