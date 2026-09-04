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

type FieldLineConfig = { id: string; key: FieldLine; grid: string; positions: string[]; priority: number[] }

const RESERVE_SECTORS: Array<{ key: FieldLine; label: string; position: string }> = [
  { key: "attack", label: "Ataque", position: "ATA" },
  { key: "midfield", label: "Meio", position: "MEI" },
  { key: "defense", label: "Defesa", position: "ZAG" },
  { key: "goalkeeper", label: "Goleiro", position: "GOL" },
]

const FORMATION_OPTIONS = ["3-5-2", "4-3-3", "4-4-2", "4-2-3-1", "4-1-2-1-2", "3-4-2-1", "5-3-2", "5-4-1", "3-4-3"]

function gridFor(count: number) {
  if (count === 1) return "grid-cols-1 px-[42%]"
  if (count === 2) return "grid-cols-2 px-[27%]"
  if (count === 3) return "grid-cols-3 px-[10%]"
  if (count === 4) return "grid-cols-4 px-[3%]"
  return "grid-cols-5"
}

function priorityFor(count: number) {
  if (count === 1) return [0]
  if (count === 2) return [0, 1]
  if (count === 3) return [1, 0, 2]
  if (count === 4) return [1, 2, 0, 3]
  return [2, 1, 3, 0, 4]
}

function positionLabels(line: FieldLine, count: number) {
  const labels: Record<Exclude<FieldLine, "goalkeeper">, Record<number, string[]>> = {
    attack: { 1: ["ATA"], 2: ["ATE", "ATD"], 3: ["PE", "ATA", "PD"] },
    midfield: { 2: ["MC", "MC"], 3: ["MC", "VOL", "MEI"], 4: ["ME", "MC", "MC", "MD"], 5: ["ME", "MC", "VOL", "MC", "MD"] },
    defense: { 3: ["ZGE", "ZAG", "ZGD"], 4: ["LE", "ZAG", "ZAG", "LD"], 5: ["LE", "ZGE", "ZAG", "ZGD", "LD"] },
  }
  if (line === "goalkeeper") return ["GOL"]
  return labels[line][count] ?? Array.from({ length: count }, () => line === "attack" ? "ATA" : line === "defense" ? "ZAG" : "MC")
}

function formationLines(formation: string | null): FieldLineConfig[] {
  const values = formation?.split("-").map(Number).filter(Number.isFinite)
  const parsed = values && values.length >= 3 ? values : [4, 3, 3]
  const defense = parsed[0]
  const attack = parsed[parsed.length - 1]
  const midfield = parsed.slice(1, -1)
  const makeLine = (id: string, key: FieldLine, positions: string[]): FieldLineConfig => ({ id, key, grid: gridFor(positions.length), positions, priority: priorityFor(positions.length) })
  const midfieldLabels = (count: number, index: number, total: number) => {
    if (total === 1) return positionLabels("midfield", count)
    if (count === 1) return index === total - 1 ? ["VOL"] : ["MEI"]
    if (count === 2) return index === total - 1 ? ["VLE", "VLD"] : ["MEI", "MEI"]
    if (count === 3) return ["ME", "MEI", "MD"]
    return positionLabels("midfield", count)
  }
  const midfieldLines = midfield.length === 1 && midfield[0] === 5
    ? [
        makeLine("midfield-advanced", "midfield", ["ME", "MEI", "MD"]),
        makeLine("midfield-holding", "midfield", ["VLE", "VLD"]),
      ]
    : [...midfield].reverse().map((count, index, rows) => makeLine(`midfield-${index}`, "midfield", midfieldLabels(count, index, rows.length)))
  return [
    makeLine("attack", "attack", positionLabels("attack", attack)),
    ...midfieldLines,
    makeLine("defense", "defense", positionLabels("defense", defense)),
    makeLine("goalkeeper", "goalkeeper", ["GOL"]),
  ]
}

const LINE_ORDER: FieldLine[] = ["goalkeeper", "defense", "midfield", "attack"]

function lineFor(position: string): FieldLine {
  const value = position.toUpperCase()
  if (value === "GK" || value === "GOALKEEPER") return "goalkeeper"
  if (/(CB|LB|RB|LWB|RWB|SW|DEFENDER|DEF)/.test(value)) return "defense"
  if (/(ST|CF|LW|RW|LF|RF|FORWARD|ATT)/.test(value)) return "attack"
  return "midfield"
}

const SLOT_POSITION_MATCHES: Record<string, { exact: string[]; nearby: string[] }> = {
  ATE: { exact: ["LW", "LF", "LS"], nearby: ["ST", "CF"] },
  ATD: { exact: ["RW", "RF", "RS"], nearby: ["ST", "CF"] },
  PE: { exact: ["LW", "LF"], nearby: ["LM", "LAM", "ST"] },
  ATA: { exact: ["ST", "CF"], nearby: ["LF", "RF", "LW", "RW"] },
  PD: { exact: ["RW", "RF"], nearby: ["RM", "RAM", "ST"] },
  ME: { exact: ["LM", "LAM", "LCM"], nearby: ["LW", "LDM", "CM", "CAM"] },
  MEI: { exact: ["CAM", "CM"], nearby: ["LAM", "RAM", "LCM", "RCM"] },
  MD: { exact: ["RM", "RAM", "RCM"], nearby: ["RW", "RDM", "CM", "CAM"] },
  VLE: { exact: ["LDM"], nearby: ["CDM", "LCM", "LM", "LB", "LWB"] },
  VLD: { exact: ["RDM"], nearby: ["CDM", "RCM", "RM", "RB", "RWB"] },
  MC: { exact: ["CM", "LCM", "RCM"], nearby: ["CAM", "CDM"] },
  VOL: { exact: ["CDM", "LDM", "RDM"], nearby: ["CM", "LCM", "RCM"] },
  LE: { exact: ["LB", "LWB"], nearby: ["LCB", "LM"] },
  ZGE: { exact: ["LCB"], nearby: ["CB", "LB", "LWB"] },
  ZAG: { exact: ["CB", "SW"], nearby: ["LCB", "RCB"] },
  ZGD: { exact: ["RCB"], nearby: ["CB", "RB", "RWB"] },
  LD: { exact: ["RB", "RWB"], nearby: ["RCB", "RM"] },
  GOL: { exact: ["GK", "GOALKEEPER"], nearby: [] },
}

function slotFitFor(player: EaClubFieldPlayer, slot: string) {
  const matches = SLOT_POSITION_MATCHES[slot]
  if (!matches) return 0
  const positions = player.positionRatings?.length
    ? player.positionRatings
    : [{ position: player.position, appearances: player.appearances }]

  return positions.reduce((best, performance) => {
    const code = performance.position.trim().toUpperCase()
    const sample = cappedShare(performance.appearances, 5)
    if (matches.exact.includes(code)) return Math.max(best, 3 + sample)
    if (matches.nearby.includes(code)) return Math.max(best, 1.5 + sample * 0.5)
    return best
  }, 0)
}

function resultLabel(result: "WIN" | "DRAW" | "LOSS") {
  if (result === "WIN") return { text: "Vitória", tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" }
  if (result === "DRAW") return { text: "Empate", tone: "border-amber-400/25 bg-amber-400/10 text-amber-300" }
  return { text: "Derrota", tone: "border-rose-400/25 bg-rose-400/10 text-rose-300" }
}

function performanceFor(player: EaClubFieldPlayer, sector: FieldLine) {
  return player.positionRatings?.find(performance => lineFor(performance.position) === sector)
}

function ratingFor(player: EaClubFieldPlayer, sector: FieldLine) {
  return performanceFor(player, sector)?.averageRating ?? player.rating ?? -1
}

function appearancesFor(player: EaClubFieldPlayer, sector: FieldLine) {
  return performanceFor(player, sector)?.appearances ?? player.appearances
}

const RATING_PRIOR = { games: 2, average: 6.5 }

function cappedShare(value: number, reference: number) {
  return Math.min(Math.max(value, 0) / reference, 1)
}

function lineupScoreFor(player: EaClubFieldPlayer, sector: FieldLine) {
  const performance = performanceFor(player, sector)
  const appearances = appearancesFor(player, sector)
  const rating = ratingFor(player, sector)
  if (rating < 0) return -1

  const adjustedRating =
    (rating * appearances + RATING_PRIOR.average * RATING_PRIOR.games) /
    (appearances + RATING_PRIOR.games)
  const presence = 0.3 * cappedShare(appearances, 10)
  if (!performance || appearances === 0) return adjustedRating + presence

  if (sector === "attack") {
    const contributions = performance.goals + performance.assists * 0.7
    return (
      adjustedRating +
      1.4 * Math.min(contributions / appearances, 2) +
      0.6 * cappedShare(contributions, 10) +
      0.35 * cappedShare(performance.shotConversion ?? 0, 50) +
      presence
    )
  }

  if (sector === "midfield") {
    const contributions = performance.goals + performance.assists * 0.7
    return (
      adjustedRating +
      cappedShare(contributions / appearances, 1) +
      0.55 * cappedShare(performance.passesCompleted / appearances, 35) +
      0.25 * cappedShare(performance.passAccuracy ?? 0, 90) +
      0.2 * cappedShare(performance.tacklesCompleted / appearances, 3) +
      presence
    )
  }

  if (sector === "defense") {
    return (
      adjustedRating +
      0.9 * cappedShare(performance.tacklesCompleted / appearances, 4) +
      0.4 * cappedShare(performance.tackleAccuracy ?? 0, 80) +
      0.3 * cappedShare(performance.passesCompleted / appearances, 25) +
      0.2 * cappedShare(performance.passAccuracy ?? 0, 90) +
      presence
    )
  }

  return adjustedRating + 1.2 * cappedShare(performance.saves / appearances, 8) + presence
}

function comparePlayers(a: EaClubFieldPlayer, b: EaClubFieldPlayer, sector: FieldLine) {
  const aAppearances = appearancesFor(a, sector)
  const bAppearances = appearancesFor(b, sector)
  return (
    Number(bAppearances >= 3) - Number(aAppearances >= 3) ||
    lineupScoreFor(b, sector) - lineupScoreFor(a, sector) ||
    ratingFor(b, sector) - ratingFor(a, sector) ||
    bAppearances - aAppearances
  )
}

function comparePlayersForSlot(a: EaClubFieldPlayer, b: EaClubFieldPlayer, sector: FieldLine, slot: string) {
  return slotFitFor(b, slot) - slotFitFor(a, slot) || comparePlayers(a, b, sector)
}

function performanceStats(player: EaClubFieldPlayer, sector: FieldLine) {
  const performance = performanceFor(player, sector) ?? player.positionRatings?.[0]
  if (!performance) return []
  const percent = (value: number | null) => value === null ? "-" : `${Math.round(value)}%`
  const games = `${performance.appearances}/${player.appearances}`
  if (sector === "attack") return [
    { label: "Gols", value: String(performance.goals) },
    { label: "Assist.", value: String(performance.assists) },
    { label: "Conversão", value: percent(performance.shotConversion) },
    { label: "Jogos", value: games },
  ]
  if (sector === "midfield") return [
    { label: "Assist.", value: String(performance.assists) },
    { label: "Passes", value: String(performance.passesCompleted) },
    { label: "Precisão", value: percent(performance.passAccuracy) },
    { label: "Jogos", value: games },
  ]
  if (sector === "defense") return [
    { label: "Desarmes", value: String(performance.tacklesCompleted) },
    { label: "Precisão", value: percent(performance.tackleAccuracy) },
    { label: "Passes", value: String(performance.passesCompleted) },
    { label: "Jogos", value: games },
  ]
  return [
    { label: "Defesas", value: String(performance.saves) },
    { label: "Jogos", value: games },
  ]
}

function PlayerCard({ player, position, sector, clubId, adapted = false }: { player: EaClubFieldPlayer | null; position: string; sector: FieldLine; clubId: string; adapted?: boolean }) {
  const performance = player ? performanceFor(player, sector) : undefined
  const card = <PlayerRatingCard player={player ? { playerName: player.playerName, averageRating: performance?.averageRating ?? player.rating ?? null, primaryPosition: player.position } : null} position={position} adapted={adapted} compact stats={player ? performanceStats(player, sector) : []} className="max-w-[128px]" emptyLabel="CPU da EA" />
  return player ? <Link href={`/ea-clubs/${clubId}/players/${player.id}`} className="w-[128px]">{card}</Link> : <div className="w-[128px]">{card}</div>
}

export default function EaClubFieldPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [field, setField] = useState<EaClubField | null>(null)
  const [manualFormation, setManualFormation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [clubData, fieldData] = await Promise.all([getEaClub(clubId), getEaClubField(clubId)])
      setClub(clubData)
      setField(fieldData)
      setManualFormation(null)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o campo")
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => { void load() }, [load])

  const activeFormation = manualFormation ?? field?.formation ?? "4-3-3"
  const lines = useMemo(() => formationLines(activeFormation), [activeFormation])

  const selection = useMemo(() => {
    const groups = new Map<FieldLine, EaClubFieldPlayer[]>()
    const starters = new Map<string, Array<{ player: EaClubFieldPlayer | null; adapted: boolean }>>()
    const reserves = new Map<FieldLine, EaClubFieldPlayer[]>()
    for (const sector of LINE_ORDER) groups.set(sector, [])
    for (const player of field?.players ?? []) groups.get(lineFor(player.position))?.push(player)
    const assigned = new Set<string>()
    for (const sector of LINE_ORDER) {
      const ranked = [...(groups.get(sector) ?? [])].sort((a, b) => comparePlayers(a, b, sector))
      const sectorLines = lines.filter(item => item.key === sector)
      const available = ranked.slice(0, sectorLines.reduce((total, line) => total + line.positions.length, 0))
      for (const line of sectorLines) {
        const slots = line.positions.map(() => ({ player: null as EaClubFieldPlayer | null, adapted: false }))
        for (const slotIndex of line.priority) {
          available.sort((a, b) => comparePlayersForSlot(a, b, sector, line.positions[slotIndex]))
          const player = available.shift()
          if (!player) continue
          slots[slotIndex] = { player, adapted: false }
          assigned.add(player.id)
        }
        starters.set(line.id, slots)
      }
    }

    const unassigned = (field?.players ?? []).filter(player => !assigned.has(player.id))
    for (const line of lines) {
      if (line.key === "goalkeeper") continue
      const slots = starters.get(line.id) ?? []
      for (let index = 0; index < slots.length; index += 1) {
        if (slots[index].player || !unassigned.length) continue
        const target = LINE_ORDER.indexOf(line.key)
        unassigned.sort((a, b) =>
          Math.abs(LINE_ORDER.indexOf(lineFor(a.position)) - target) -
            Math.abs(LINE_ORDER.indexOf(lineFor(b.position)) - target) ||
          comparePlayersForSlot(a, b, line.key, line.positions[index]),
        )
        const player = unassigned.shift() ?? null
        slots[index] = { player, adapted: player !== null && !performanceFor(player, line.key) }
        if (player) assigned.add(player.id)
      }
    }
    for (const sector of LINE_ORDER) {
      reserves.set(sector, unassigned.filter(player => lineFor(player.position) === sector).sort((a, b) => comparePlayers(a, b, sector)))
    }
    return { starters, reserves }
  }, [field, lines])

  const fieldHeight = lines.length >= 6 ? "min-h-[1240px]" : lines.length === 5 ? "min-h-[1060px]" : "min-h-[900px]"
  const lineupHeight = lines.length >= 6 ? "min-h-[1184px]" : lines.length === 5 ? "min-h-[1004px]" : "min-h-[844px]"

  if (loading) return <PageLoading />
  if (error || !field) return <ErrorState message={error} retry={() => void load()} />

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <ClubPageHeader name="Campo do clube" subtitle={`Melhor escalação pelas últimas 25 partidas do ${club?.nickname || club?.name || "clube"}`} />

    <section className="overflow-hidden rounded-[26px] border border-emerald-400/15 bg-gradient-to-b from-emerald-500/[0.07] to-transparent">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Seleção do clube</p><h2 className="mt-1 text-2xl font-black text-white">Melhor 11 em um {activeFormation}</h2><p className="mt-1 text-[11px] text-gray-500">{manualFormation ? `Formação alterada manualmente. A sugestão automática pelas últimas 25 partidas é ${field.formation ?? "4-3-3"}. O encaixe respeita a posição recente e depois compara produção e nota.` : field.formationSummary ? `${field.summary?.matches ?? 0} jogos analisados. O ${field.formation} apareceu ${field.formationSummary.matches} vezes, com ${field.formationSummary.wins} ${field.formationSummary.wins === 1 ? "vitória" : "vitórias"}, ${field.formationSummary.draws} ${field.formationSummary.draws === 1 ? "empate" : "empates"} e ${field.formationSummary.losses} ${field.formationSummary.losses === 1 ? "derrota" : "derrotas"}. O encaixe respeita a posição recente e depois compara produção, eficiência, nota e amostra.` : "Sem uma formação completa nas partidas analisadas; exibindo o 4-3-3 como base."}</p></div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end"><label className="text-[8px] font-black uppercase tracking-wider text-gray-500" htmlFor="field-formation">Formação</label><select id="field-formation" value={manualFormation ?? "auto"} onChange={event => setManualFormation(event.target.value === "auto" ? null : event.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-400/50"><option value="auto">Melhor sugerida ({field.formation ?? "4-3-3"})</option>{FORMATION_OPTIONS.map(formation => <option key={formation} value={formation}>{formation}</option>)}</select><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">Atualizado: {formatDate(field.match?.playedAt, true)}</span></div>
      </div>

      {field.players.length ? <div className="grid items-start gap-5 p-4 xl:grid-cols-[minmax(720px,1fr)_250px] xl:p-5">
        <div className="overflow-x-auto"><div className={`relative mx-auto min-w-[720px] max-w-[980px] overflow-hidden rounded-[28px] border border-emerald-300/20 bg-emerald-950/70 p-7 shadow-2xl shadow-black/30 ${fieldHeight}`}><div aria-hidden className="pointer-events-none absolute inset-5 rounded-[20px] border border-white/10" /><div aria-hidden className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-white/10" /><div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" /><div aria-hidden className="pointer-events-none absolute left-1/2 top-5 h-14 w-48 -translate-x-1/2 border border-t-0 border-white/10" /><div aria-hidden className="pointer-events-none absolute bottom-5 left-1/2 h-14 w-48 -translate-x-1/2 border border-b-0 border-white/10" /><div className={`relative flex flex-col justify-around ${lineupHeight}`}>{lines.map(line => <div key={line.id} className={`grid min-h-[214px] items-center justify-items-center gap-4 ${line.grid}`}>{(selection.starters.get(line.id) ?? []).map((slot, index) => <PlayerCard key={slot.player?.id ?? `${line.id}-${index}`} player={slot.player} position={line.positions[index]} sector={line.key} clubId={clubId} adapted={slot.adapted} />)}</div>)}</div></div></div>

        <aside className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Banco por setor</p><h3 className="mt-1 text-lg font-black text-white">Todos os reservas</h3><p className="mt-1 text-[10px] leading-relaxed text-gray-500">Todos que jogaram nas últimas 25 partidas aparecem como titulares ou no banco. O time equilibra nota, produção, eficiência e amostra.</p></div><div className="grid grid-cols-2 justify-items-center gap-5 xl:grid-cols-1">{RESERVE_SECTORS.map(sector => { const reserves = selection.reserves.get(sector.key) ?? []; return <div key={sector.key} className="w-full space-y-2 text-center"><p className="text-[9px] font-black uppercase tracking-wider text-gray-500">{sector.label}</p>{reserves.length ? <div className="grid justify-items-center gap-3">{reserves.map(player => <PlayerCard key={player.id} player={player} position={sector.position} sector={sector.key} clubId={clubId} />)}</div> : <p className="rounded-xl border border-dashed border-white/10 px-2 py-4 text-[9px] font-bold uppercase text-gray-700">Sem reserva</p>}</div> })}</div></aside>
      </div> : <Card className="m-5 border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-bold text-white">Ainda não há escalação registrada</p><p className="mt-1 text-sm text-gray-500">Sincronize as partidas do clube para formar o campo.</p></Card>}
    </section>

    <section className="overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.02]"><div className="border-b border-white/[0.07] p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Histórico recente</p><h2 className="mt-1 text-xl font-black text-white">Últimas {field.history.length} partidas</h2><p className="mt-1 text-[11px] text-gray-500">A formação da partida só é exibida quando os 10 jogadores de linha estão registrados. A EA não informa as posições ocupadas pela CPU.</p></div><div className="divide-y divide-white/[0.06]">{field.history.map(match => { const result = resultLabel(match.result); return <div key={match.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"><div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${result.tone}`}>{result.text}</span><p className="mt-1 text-[10px] text-gray-600">{formatDate(match.playedAt, true)}</p></div><div><p className="font-bold text-white">{club?.nickname || club?.name} <span className="mx-2 text-lg font-black tabular-nums text-white">{match.goalsFor} × {match.goalsAgainst}</span> {match.opponentName}</p><p className="mt-1 text-[10px] text-gray-500">{match.positions.defense} DEF · {match.positions.midfield} MEI · {match.positions.attack} ATA{match.positions.goalkeeper > 0 ? ` · ${match.positions.goalkeeper} GOL humano` : " · goleiro da CPU"}</p></div><span className="w-fit rounded-xl border border-blue-400/20 bg-blue-400/[0.08] px-3 py-2 text-center"><span className="block text-[8px] font-black uppercase tracking-wider text-blue-300">Formação da partida</span><strong className="mt-0.5 block text-lg font-black text-white">{match.formation ?? "Não identificada"}</strong></span></div>})}</div></section>
  </div>
}
