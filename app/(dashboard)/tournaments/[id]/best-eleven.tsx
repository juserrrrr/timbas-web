import { Info, Sparkles, Users } from "lucide-react"
import { PlayerRatingCard } from "@/components/competitions/player-rating-card"
import type { TournamentEaPlayerStats } from "@/lib/services/tournaments.types"
import { buildBestEleven, type FormationLine } from "@/lib/tournament-best-eleven"

const LINE_LAYOUT: Array<{
  line: FormationLine
  grid: string
}> = [
  { line: "attack", grid: "grid-cols-3 px-[8%]" },
  { line: "midfield", grid: "grid-cols-3 px-[17%]" },
  { line: "defense", grid: "grid-cols-4 px-[3%]" },
  { line: "goalkeeper", grid: "grid-cols-1 px-[42%]" },
]

const TIER_LEGEND = [
  { label: "10,0 Lenda", tone: "border-amber-300/40 bg-amber-300/10 text-amber-200" },
  { label: "9,0+ Elite", tone: "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-200" },
  { label: "8,0+ Destaque", tone: "border-rose-400/35 bg-rose-400/10 text-rose-200" },
  { label: "7,0+ Titular", tone: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" },
  { label: "Abaixo de 7", tone: "border-white/15 bg-white/[0.04] text-gray-400" },
]

export function BestEleven({ players }: { players: TournamentEaPlayerStats[] }) {
  const selection = buildBestEleven(players)
  const selectedCount = selection.filter((slot) => slot.player).length
  const adaptedCount = selection.filter((slot) => slot.adapted).length

  return (
    <section className="overflow-hidden rounded-[26px] border border-emerald-400/15 bg-gradient-to-b from-emerald-500/[0.07] to-transparent">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Seleção do campeonato
          </p>
          <h3 className="mt-1 text-2xl font-black text-white">Os 11 da competição em um 4-3-3</h3>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-gray-500">
            A posição mais jogada vem das partidas sincronizadas com a EA. A maior nota média define cada posição; índice e jogos entram apenas no desempate.
          </p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">
          <Users className="h-3.5 w-3.5 text-emerald-300" /> {selectedCount}/11 definidos
        </span>
      </div>

      <div className="overflow-x-auto p-3 sm:p-5">
        <div className="relative mx-auto min-w-[720px] max-w-[980px] overflow-hidden rounded-[28px] border border-emerald-300/20 bg-emerald-950/70 p-5 shadow-2xl shadow-black/30 sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-5 rounded-[20px] border border-white/10" />
          <div aria-hidden className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-white/10" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-5 h-14 w-48 -translate-x-1/2 border border-t-0 border-white/10" />
          <div aria-hidden className="pointer-events-none absolute bottom-5 left-1/2 h-14 w-48 -translate-x-1/2 border border-b-0 border-white/10" />

          <div className="relative space-y-6">
            {LINE_LAYOUT.map(({ line, grid }) => (
              <div key={line} className={`grid items-center justify-items-center gap-6 ${grid}`}>
                {selection
                  .filter((slot) => slot.line === line)
                  .map((slot) => (
                    <PlayerRatingCard
                      key={slot.key}
                      player={slot.player}
                      position={slot.position}
                      adapted={slot.adapted}
                      compact
                      className="max-w-[130px]"
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TIER_LEGEND.map((item) => (
            <span key={item.label} className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${item.tone}`}>
              {item.label}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-[9px] text-gray-600">
          <Info className="h-3.5 w-3.5" /> {adaptedCount > 0 ? `${adaptedCount} jogador${adaptedCount > 1 ? "es" : ""} adaptado${adaptedCount > 1 ? "s" : ""} para completar a formação.` : "Todos escalados em sua posição principal."}
        </p>
      </div>
    </section>
  )
}
