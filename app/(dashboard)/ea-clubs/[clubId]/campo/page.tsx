"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { PlayerRatingCard } from "@/components/competitions/player-rating-card"
import { Card } from "@/components/ui/card"
import { ClubPageHeader, ErrorState, formatDate, PageLoading } from "@/components/ea-clubs/shared"
import { getEaClub, getEaClubField } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubField, EaClubFieldPlayer } from "@/lib/services/ea-clubs.types"

type FieldLine = "goalkeeper" | "defense" | "midfield" | "attack"

const LINES: Array<{ key: FieldLine; grid: string }> = [
  { key: "attack", grid: "grid-cols-3 px-[8%]" },
  { key: "midfield", grid: "grid-cols-3 px-[17%]" },
  { key: "defense", grid: "grid-cols-4 px-[3%]" },
  { key: "goalkeeper", grid: "grid-cols-1 px-[42%]" },
]

function lineFor(position: string): FieldLine {
  const value = position.toUpperCase()
  if (value === "GK") return "goalkeeper"
  if (/(CB|LB|RB|LWB|RWB|SW|DEFENDER|DEF)/.test(value)) return "defense"
  if (/(ST|CF|LW|RW|LF|RF|FORWARD|ATT)/.test(value)) return "attack"
  return "midfield"
}

function positionName(position: string) {
  const value = position.toUpperCase()
  if (value === "FORWARD") return "ATA"
  if (value === "DEFENDER") return "DEF"
  if (value === "MIDFIELDER") return "MEI"
  if (value === "GK") return "GOL"
  return value
}

export default function EaClubFieldPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [field, setField] = useState<EaClubField | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [clubData, fieldData] = await Promise.all([getEaClub(clubId), getEaClubField(clubId)])
      setClub(clubData)
      setField(fieldData)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o campo")
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => { void load() }, [load])

  const groups = useMemo(() => {
    const result = new Map<FieldLine, EaClubFieldPlayer[]>()
    for (const line of LINES) result.set(line.key, [])
    for (const player of field?.players ?? []) result.get(lineFor(player.position))?.push(player)
    return result
  }, [field])

  if (loading) return <PageLoading />
  if (error || !field) return <ErrorState message={error} retry={() => void load()} />

  return <div className="mx-auto max-w-7xl space-y-6">
    <ClubPageHeader name="Campo do clube" subtitle={`Formação predominante nas últimas 25 partidas do ${club?.nickname || club?.name || "clube"}`} />
    <section className="overflow-hidden rounded-[26px] border border-emerald-400/15 bg-gradient-to-b from-emerald-500/[0.07] to-transparent">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Escalação mais usada</p><h2 className="mt-1 text-2xl font-black text-white">Formação {field.formation ?? "a definir"}</h2><p className="mt-1 text-[11px] text-gray-500">{field.summary ? `${field.summary.matches} jogos, ${field.summary.wins} vitórias e ${field.summary.draws} empates. Exibindo a partida mais recente com esta formação.` : "Ainda não há partidas com posições registradas."}</p></div><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">Partida: {formatDate(field.match?.playedAt, true)}</span></div>
      {field.players.length ? <div className="overflow-x-auto p-3 sm:p-5"><div className="relative mx-auto min-w-[720px] max-w-[980px] overflow-hidden rounded-[28px] border border-emerald-300/20 bg-emerald-950/70 p-5 shadow-2xl shadow-black/30 sm:p-7"><div aria-hidden className="pointer-events-none absolute inset-5 rounded-[20px] border border-white/10" /><div aria-hidden className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-white/10" /><div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" /><div aria-hidden className="pointer-events-none absolute left-1/2 top-5 h-14 w-48 -translate-x-1/2 border border-t-0 border-white/10" /><div aria-hidden className="pointer-events-none absolute bottom-5 left-1/2 h-14 w-48 -translate-x-1/2 border border-b-0 border-white/10" /><div className="relative space-y-5">{LINES.map(({ key, grid }) => <div key={key} className={`grid items-center justify-items-center gap-4 ${grid}`}>{(groups.get(key) ?? []).map(player => <Link key={player.id} href={`/ea-clubs/${clubId}/players/${player.id}`} className="w-[92px]"><PlayerRatingCard player={{ playerName: player.playerName, averageRating: player.rating, primaryPosition: player.position }} position={positionName(player.position)} compact className="min-h-[116px]" /></Link>)}</div>)}</div></div></div> : <Card className="m-5 border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-bold text-white">Ainda não há escalação registrada</p><p className="mt-1 text-sm text-gray-500">Sincronize as partidas do clube para formar o campo.</p></Card>}
    </section>
  </div>
}
