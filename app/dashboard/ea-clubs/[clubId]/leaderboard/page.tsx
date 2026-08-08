"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Medal, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getEaClub, getEaClubLeaderboard } from "@/lib/services/ea-clubs"
import type { EaClub, EaLeaderboardCategory } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, PageLoading } from "@/components/ea-clubs/shared"

export default function EaClubLeaderboardPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [categories, setCategories] = useState<EaLeaderboardCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => { setLoading(true); try { const [c, result] = await Promise.all([getEaClub(clubId), getEaClubLeaderboard(clubId)]); setClub(c); setCategories(result); setError("") } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") } finally { setLoading(false) } }, [clubId])
  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />
  return <div className="space-y-6"><ClubPageHeader name={club?.nickname || club?.name} subtitle="Destaques e rankings do clube" />{categories.length ? <div className="grid gap-4 lg:grid-cols-2">{categories.map(category => <Card key={category.key} className="overflow-hidden border-white/[0.07] bg-white/[0.025]"><div className="flex items-center justify-between border-b border-white/[0.07] p-4"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" /><h2 className="font-black text-white">{category.label}</h2></div>{category.minimumMatches != null && <Badge variant="outline" className="border-white/10 text-gray-400">mín. {category.minimumMatches} jogos</Badge>}</div><div className="divide-y divide-white/[0.05]">{category.entries.length ? category.entries.map((entry, index) => <Link key={entry.player.id} href={`/dashboard/ea-clubs/${clubId}/players/${entry.player.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04]"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-amber-500/15 text-amber-400" : index === 1 ? "bg-gray-400/10 text-gray-300" : index === 2 ? "bg-orange-700/15 text-orange-400" : "text-gray-600"}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate font-bold text-white">{entry.player.playerName}</span>{entry.appearances != null && <span className="text-xs text-gray-600">{entry.appearances} jogos</span>}<span className="text-lg font-black tabular-nums text-blue-400">{Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(2)}</span></Link>) : <p className="p-6 text-center text-sm text-gray-500">Sem dados suficientes.</p>}</div></Card>)}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><Medal className="mx-auto mb-3 h-9 w-9 text-gray-600" /><p className="font-bold text-white">Ranking ainda indisponível</p><p className="text-sm text-gray-500">Sincronize partidas para formar os rankings.</p></Card>}</div>
}
