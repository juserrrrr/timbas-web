"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Goal, Hand, Shield, ShieldCheck, Star, Target } from "lucide-react"
import { ClubPageHeader, ErrorState, formatDate, PageLoading } from "@/components/ea-clubs/shared"
import { Card } from "@/components/ui/card"
import { getEaClubDashboard, getEaClubLeaderboard } from "@/lib/services/ea-clubs"
import type { EaClubDashboard, EaLeaderboardCategory } from "@/lib/services/ea-clubs.types"

const HIGHLIGHTS = [
  { key: "eaClubGoals", label: "Artilheiro", icon: Goal, color: "text-emerald-400", suffix: "gols no clube" },
  { key: "eaClubAssists", label: "Garçom", icon: Target, color: "text-sky-400", suffix: "assistências no clube" },
  { key: "defenders", label: "Melhor defensor", icon: Shield, color: "text-blue-400", suffix: "de nota" },
  { key: "eaClubTackles", label: "Rei dos desarmes", icon: ShieldCheck, color: "text-orange-400", suffix: "desarmes no clube" },
  { key: "saves", label: "Paredão", icon: Hand, color: "text-purple-400", suffix: "defesas registradas" },
  { key: "eaClubRating", label: "Craque do clube", icon: Star, color: "text-amber-400", suffix: "de nota no clube" },
] as const

export default function EaClubDashboardPage({ params }: { params: Promise<{ clubId: string }> }) {
  const [clubId, setClubId] = useState("")
  const [data, setData] = useState<EaClubDashboard | null>(null)
  const [categories, setCategories] = useState<EaLeaderboardCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => { void params.then((value) => setClubId(value.clubId)) }, [params])

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

    {eaTotals.length > 0 ? <section><div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Estatísticas do clube</p><h2 className="text-xl font-black text-white">Números gerais</h2></div><p className="text-xs text-gray-500">Atualizado em {formatDate(data.eaAllTimeStats?.updatedAt, true)}</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{eaTotals.map((item) => <Card key={item.label} className="border-emerald-500/10 bg-emerald-500/[0.035] p-5 text-center"><p className="text-3xl font-black tabular-nums text-white">{item.value ?? "—"}</p><p className="mt-1 text-xs font-medium text-gray-500">{item.label}</p></Card>)}</div></section> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-8 text-center"><p className="font-bold text-white">Estatísticas gerais ainda indisponíveis</p><p className="mt-1 text-sm text-gray-500">Os números serão preenchidos na próxima sincronização com a EA.</p></Card>}

    <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">Destaques do elenco</p><h2 className="text-xl font-black text-white">Os donos do jogo</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{HIGHLIGHTS.map((highlight) => { const category = categories.find((item) => item.key === highlight.key); const entry = category?.entries[0]; const Icon = highlight.icon; const isRating = highlight.key === "eaClubRating" || highlight.key === "defenders"; return <Card key={highlight.key} className="relative overflow-hidden border-white/[0.07] bg-white/[0.025] p-5"><div className="flex items-start justify-between"><div className={`rounded-xl bg-white/[0.04] p-3 ${highlight.color}`}><Icon className="h-5 w-5" /></div>{category?.source === "EA_CLUB" && <span className="text-[10px] font-bold uppercase text-emerald-500">Total no clube</span>}</div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">{highlight.label}</p>{entry ? <Link href={`/dashboard/ea-clubs/${clubId}/players/${entry.player.id}`} className="mt-1 block"><p className="truncate text-xl font-black text-white hover:text-blue-300">{entry.player.playerName}</p><p className={`mt-1 text-sm font-bold ${highlight.color}`}>{isRating ? entry.value.toFixed(1) : entry.value} {highlight.suffix}</p></Link> : <p className="mt-2 text-sm text-gray-600">Sem dados disponíveis</p>}</Card> })}</div></section>
  </div>
}
