"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Activity, Crosshair, Goal, Hand, Medal, Percent, Shield, Star, Target, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getEaClub, getEaClubPlayer } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubPlayerProfile } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, PageLoading } from "@/components/ea-clubs/shared"

function display(value?: number | null, decimals = 0) { return value == null ? "—" : value.toFixed(decimals) }

export default function EaClubPlayerPage() {
  const { clubId, playerId } = useParams<{ clubId: string; playerId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [player, setPlayer] = useState<EaClubPlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => { setLoading(true); try { const [c, p] = await Promise.all([getEaClub(clubId), getEaClubPlayer(clubId, playerId)]); setClub(c); setPlayer(p); setError("") } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") } finally { setLoading(false) } }, [clubId, playerId])
  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error || !player) return <ErrorState message={error} retry={() => void load()} />
  const metrics = [
    { label: "Partidas", value: player.matches, icon: Trophy }, { label: "Gols", value: player.goals, icon: Goal }, { label: "Assistências", value: player.assists, icon: Hand }, { label: "Gols + Assistências", value: player.goalContributions, icon: Activity },
    { label: "Média de nota", value: display(player.averageRating, 1), icon: Star }, { label: "MVP", value: player.manOfTheMatch, icon: Medal }, { label: "Chutes", value: display(player.shots), icon: Crosshair }, { label: "Passes certos", value: display(player.passesCompleted), icon: Target }, { label: "Desarmes", value: display(player.tacklesCompleted), icon: Shield }, { label: "Defesas", value: display(player.saves), icon: Shield },
  ]
  const rates = [{ label: "Gols por partida", value: display(player.goalsPerMatch, 2) }, { label: "Assistências por partida", value: display(player.assistsPerMatch, 2) }, { label: "Participações por partida", value: display(player.goalContributionsPerMatch, 2) }, { label: "Taxa de passes certos", value: player.passAccuracy == null ? "—" : `${display(player.passAccuracy <= 1 ? player.passAccuracy * 100 : player.passAccuracy, 1)}%` }, { label: "Taxa de desarmes", value: player.tackleAccuracy == null ? "—" : `${display(player.tackleAccuracy <= 1 ? player.tackleAccuracy * 100 : player.tackleAccuracy, 1)}%` }]
  return <div className="space-y-6"><ClubPageHeader name={player.playerName} subtitle={`Carreira no ${club?.nickname || club?.name || "clube"}`} /><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{metrics.map(({ label, value, icon: Icon }) => <Card key={label} className="border-white/[0.07] bg-white/[0.025] p-4"><Icon className="mb-3 h-4 w-4 text-blue-400" /><p className="text-2xl font-black tabular-nums text-white">{value}</p><p className="text-xs text-gray-500">{label}</p></Card>)}</div><Card className="border-white/[0.07] bg-white/[0.025] p-5"><div className="mb-4 flex items-center gap-2"><Percent className="h-5 w-5 text-blue-400" /><h2 className="font-black text-white">Médias e eficiência</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{rates.map(rate => <div key={rate.label} className="rounded-xl border border-white/[0.06] bg-black/30 p-4"><p className="text-xl font-black text-white">{rate.value}</p><p className="mt-1 text-xs text-gray-500">{rate.label}</p></div>)}</div></Card></div>
}
