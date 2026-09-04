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

const LINES: Array<{ key: FieldLine; label: string; grid: string; positions: string[]; priority: number[] }> = [
  { key: "attack", label: "Ataque", grid: "grid-cols-3 px-[8%]", positions: ["PE", "ATA", "PD"], priority: [1, 0, 2] },
  { key: "midfield", label: "Meio", grid: "grid-cols-3 px-[17%]", positions: ["MC", "VOL", "MEI"], priority: [1, 0, 2] },
  { key: "defense", label: "Defesa", grid: "grid-cols-4 px-[3%]", positions: ["LE", "ZAG", "ZAG", "LD"], priority: [1, 2, 0, 3] },
  { key: "goalkeeper", label: "Goleiro", grid: "grid-cols-1 px-[42%]", positions: ["GOL"], priority: [0] },
]

const LINE_ORDER: FieldLine[] = ["goalkeeper", "defense", "midfield", "attack"]

function lineFor(position: string): FieldLine {
  const value = position.toUpperCase()
  if (value === "GK" || value === "GOALKEEPER") return "goalkeeper"
  if (/(CB|LB|RB|LWB|RWB|SW|DEFENDER|DEF)/.test(value)) return "defense"
  if (/(ST|CF|LW|RW|LF|RF|FORWARD|ATT)/.test(value)) return "attack"
  return "midfield"
}

function positionName(position: string) {
  const value = position.toUpperCase()
  if (value === "FORWARD") return "ATA"
  if (value === "DEFENDER") return "DEF"
  if (value === "MIDFIELDER") return "MEI"
  if (value === "GK" || value === "GOALKEEPER") return "GOL"
  return value
}

function resultLabel(result: "WIN" | "DRAW" | "LOSS") {
  if (result === "WIN") return { text: "Vitória", tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" }
  if (result === "DRAW") return { text: "Empate", tone: "border-amber-400/25 bg-amber-400/10 text-amber-300" }
  return { text: "Derrota", tone: "border-rose-400/25 bg-rose-400/10 text-rose-300" }
}

function PlayerCard({ player, position, clubId, adapted = false }: { player: EaClubFieldPlayer | null; position: string; clubId: string; adapted?: boolean }) {
  const card = <PlayerRatingCard player={player ? { playerName: player.playerName, averageRating: player.rating, primaryPosition: player.position } : null} position={position} adapted={adapted} compact className="max-w-[104px]" emptyLabel="CPU da EA" />
  return player ? <Link href={`/ea-clubs/${clubId}/players/${player.id}`} className="w-[104px]">{card}</Link> : <div className="w-[104px]">{card}</div>
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

  const selection = useMemo(() => {
    const groups = new Map<FieldLine, EaClubFieldPlayer[]>()
    const starters = new Map<FieldLine, Array<{ player: EaClubFieldPlayer | null; adapted: boolean }>>()
    const reserves = new Map<FieldLine, EaClubFieldPlayer | null>()
    for (const line of LINES) groups.set(line.key, [])
    for (const player of field?.players ?? []) groups.get(lineFor(player.position))?.push(player)
    const assigned = new Set<string>()
    for (const line of LINES) {
      const ranked = (groups.get(line.key) ?? []).sort((a, b) => Number(b.rating ?? -1) - Number(a.rating ?? -1) || b.appearances - a.appearances)
      const slots = line.positions.map(() => ({ player: null as EaClubFieldPlayer | null, adapted: false }))
      line.priority.forEach((slotIndex, playerIndex) => {
        const player = ranked[playerIndex]
        if (!player) return
        slots[slotIndex] = { player, adapted: false }
        assigned.add(player.id)
      })
      starters.set(line.key, slots)
    }

    const unassigned = (field?.players ?? []).filter(player => !assigned.has(player.id))
    for (const line of LINES) {
      const slots = starters.get(line.key) ?? []
      for (let index = 0; index < slots.length; index += 1) {
        if (slots[index].player || !unassigned.length) continue
        const target = LINE_ORDER.indexOf(line.key)
        unassigned.sort((a, b) => Math.abs(LINE_ORDER.indexOf(lineFor(a.position)) - target) - Math.abs(LINE_ORDER.indexOf(lineFor(b.position)) - target) || Number(b.rating ?? -1) - Number(a.rating ?? -1))
        const player = unassigned.shift() ?? null
        slots[index] = { player, adapted: player !== null && lineFor(player.position) !== line.key }
        if (player) assigned.add(player.id)
      }
    }
    for (const line of LINES) {
      const ranked = (groups.get(line.key) ?? []).filter(player => !assigned.has(player.id))
      reserves.set(line.key, ranked[0] ?? null)
    }
    return { starters, reserves }
  }, [field])

  if (loading) return <PageLoading />
  if (error || !field) return <ErrorState message={error} retry={() => void load()} />

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <ClubPageHeader name="Campo do clube" subtitle={`Melhor escalação pelas últimas 25 partidas do ${club?.nickname || club?.name || "clube"}`} />

    <section className="overflow-hidden rounded-[26px] border border-emerald-400/15 bg-gradient-to-b from-emerald-500/[0.07] to-transparent">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Seleção do clube</p><h2 className="mt-1 text-2xl font-black text-white">Melhor 11 em um 4-3-3</h2><p className="mt-1 text-[11px] text-gray-500">{field.summary ? `${field.summary.matches} jogos analisados, ${field.summary.wins} vitórias e ${field.summary.draws} empates. Nota média e número de atuações ordenam cada setor.` : "Ainda não há partidas com posições registradas."}</p></div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">Atualizado: {formatDate(field.match?.playedAt, true)}</span>
      </div>

      {field.players.length ? <div className="grid items-start gap-5 p-4 xl:grid-cols-[minmax(720px,1fr)_250px] xl:p-5">
        <div className="overflow-x-auto"><div className="relative mx-auto min-w-[720px] max-w-[980px] overflow-hidden rounded-[28px] border border-emerald-300/20 bg-emerald-950/70 p-7 shadow-2xl shadow-black/30"><div aria-hidden className="pointer-events-none absolute inset-5 rounded-[20px] border border-white/10" /><div aria-hidden className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-white/10" /><div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" /><div aria-hidden className="pointer-events-none absolute left-1/2 top-5 h-14 w-48 -translate-x-1/2 border border-t-0 border-white/10" /><div aria-hidden className="pointer-events-none absolute bottom-5 left-1/2 h-14 w-48 -translate-x-1/2 border border-b-0 border-white/10" /><div className="relative space-y-6">{LINES.map(line => <div key={line.key} className={`grid min-h-[142px] items-center justify-items-center gap-5 ${line.grid}`}>{(selection.starters.get(line.key) ?? []).map((slot, index) => <PlayerCard key={slot.player?.id ?? `${line.key}-${index}`} player={slot.player} position={line.positions[index]} clubId={clubId} adapted={slot.adapted} />)}</div>)}</div></div></div>

        <aside className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Banco por setor</p><h3 className="mt-1 text-lg font-black text-white">Primeiros reservas</h3><p className="mt-1 text-[10px] leading-relaxed text-gray-500">O próximo melhor avaliado depois dos titulares de cada linha.</p></div><div className="grid grid-cols-2 justify-items-center gap-4 xl:grid-cols-1">{LINES.map(line => <div key={line.key} className="space-y-1 text-center"><p className="text-[9px] font-black uppercase tracking-wider text-gray-500">{line.label}</p><PlayerCard player={selection.reserves.get(line.key) ?? null} position={line.positions[0]} clubId={clubId} /></div>)}</div></aside>
      </div> : <Card className="m-5 border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-bold text-white">Ainda não há escalação registrada</p><p className="mt-1 text-sm text-gray-500">Sincronize as partidas do clube para formar o campo.</p></Card>}
    </section>

    <section className="overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.02]"><div className="border-b border-white/[0.07] p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Histórico recente</p><h2 className="mt-1 text-xl font-black text-white">Últimas {field.history.length} partidas</h2><p className="mt-1 text-[11px] text-gray-500">A EA não informa a formação tática completa. As posições abaixo representam somente os jogadores humanos registrados.</p></div><div className="divide-y divide-white/[0.06]">{field.history.map(match => { const result = resultLabel(match.result); return <div key={match.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[110px_1fr] sm:items-center"><div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${result.tone}`}>{result.text}</span><p className="mt-1 text-[10px] text-gray-600">{formatDate(match.playedAt, true)}</p></div><div><p className="font-bold text-white">{club?.nickname || club?.name} <span className="mx-2 text-lg font-black tabular-nums text-white">{match.goalsFor} × {match.goalsAgainst}</span> {match.opponentName}</p><p className="mt-1 text-[10px] text-gray-500">Humanos: {match.positions.attack} ATA · {match.positions.midfield} MEI · {match.positions.defense} DEF · {match.positions.goalkeeper} GOL</p></div></div>})}</div></section>
  </div>
}
