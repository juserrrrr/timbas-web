"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { ClubPageHeader, ErrorState, PageLoading } from "@/components/ea-clubs/shared"
import { getEaClub, getEaClubField } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubFieldPlayer } from "@/lib/services/ea-clubs.types"

type FieldLine = "goleiro" | "defesa" | "meio" | "ataque"

const fieldLines: Array<{ key: FieldLine; label: string; top: string }> = [
  { key: "ataque", label: "Ataque", top: "12%" },
  { key: "meio", label: "Meio-campo", top: "38%" },
  { key: "defesa", label: "Defesa", top: "64%" },
  { key: "goleiro", label: "Goleiro", top: "87%" },
]

function lineFor(position: string): FieldLine {
  const value = position.toUpperCase()
  if (value === "GK") return "goleiro"
  if (/(CB|LB|RB|LWB|RWB|SW|DEFENDER|DEF)/.test(value)) return "defesa"
  if (/(ST|CF|LW|RW|LF|RF|FORWARD|ATT)/.test(value)) return "ataque"
  return "meio"
}

function positionName(position: string) {
  const value = position.toUpperCase()
  if (value === "FORWARD") return "Atacante"
  if (value === "DEFENDER") return "Defensor"
  if (value === "MIDFIELDER") return "Meio-campista"
  if (value === "GK") return "Goleiro"
  return value
}

export default function EaClubFieldPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [players, setPlayers] = useState<EaClubFieldPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [clubData, fieldPlayers] = await Promise.all([getEaClub(clubId), getEaClubField(clubId)])
      setClub(clubData)
      setPlayers(fieldPlayers)
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
    for (const line of fieldLines) result.set(line.key, [])
    for (const player of players) result.get(lineFor(player.primaryPosition))?.push(player)
    for (const group of result.values()) group.sort((a, b) => Number(b.averageRating ?? -1) - Number(a.averageRating ?? -1))
    return result
  }, [players])

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />

  return <div className="mx-auto max-w-7xl space-y-6">
    <ClubPageHeader name="Campo do clube" subtitle={`Posição principal nas últimas 15 partidas do ${club?.nickname || club?.name || "clube"}`} />
    <Card className="border-white/[0.07] bg-white/[0.025] p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Mapa tático</p><h2 className="text-xl font-black text-white">Onde cada jogador mais atuou</h2></div><p className="text-sm text-gray-500">A estrela marca a melhor nota da linha.</p></div>
      {players.length ? <div className="relative min-h-[690px] overflow-hidden rounded-2xl border-2 border-white/20 bg-[#0d703c] shadow-inner before:absolute before:inset-4 before:border before:border-white/40 before:content-[''] after:absolute after:left-1/2 after:top-4 after:h-[calc(100%-2rem)] after:border-l after:border-white/40 after:content-['']">
        <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        {fieldLines.map(line => {
          const group = groups.get(line.key) ?? []
          return <div key={line.key} className="absolute left-0 right-0 z-10" style={{ top: line.top }}><p className="absolute left-4 -top-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{line.label}{group.length > 1 ? ` · +${group.length - 1}` : ""}</p>{group.map((player, index) => {
            const isBest = index === 0 && player.averageRating != null
            const left = `${((index + 1) / (group.length + 1)) * 100}%`
            return <Link key={player.id} href={`/ea-clubs/${clubId}/players/${player.id}`} className="absolute w-28 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left }}><span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black shadow-lg ${isBest ? "border-amber-200 bg-amber-400 text-amber-950" : "border-white/70 bg-slate-950 text-white"}`}>{isBest ? "★" : positionName(player.primaryPosition).slice(0, 2)}</span><span className="mt-1 block truncate rounded-md bg-black/70 px-1.5 py-1 text-xs font-bold text-white">{player.playerName}</span><span className="mt-0.5 block text-[10px] font-bold text-white/80">{positionName(player.primaryPosition)} · {player.averageRating?.toFixed(1) ?? "-"}</span></Link>
          })}</div>
        })}
      </div> : <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><p className="font-bold text-white">Ainda não há atuações registradas</p><p className="mt-1 text-sm text-gray-500">Sincronize as partidas do clube para montar o campo.</p></div>}
    </Card>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{fieldLines.map(line => { const group = groups.get(line.key) ?? []; const best = group[0]; return <Card key={line.key} className="border-white/[0.07] bg-white/[0.025] p-4"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{line.label}</p><p className="mt-1 text-xl font-black text-white">{group.length} {group.length === 1 ? "jogador" : "jogadores"}</p>{best && <p className="mt-2 text-sm text-amber-300">★ Melhor: {best.playerName} ({best.averageRating?.toFixed(1) ?? "-"})</p>}</Card> })}</div>
  </div>
}
