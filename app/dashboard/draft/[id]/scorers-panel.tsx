"use client"

import { useCallback, useEffect, useState } from "react"
import { Goal, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState, TeamCrest } from "@/components/competitions/shared"
import { listScorers, type Scorer } from "@/lib/services/draft"
import type { DraftLeagueDetail } from "@/lib/services/draft.types"

export function ScorersPanel({ league }: { league: DraftLeagueDetail }) {
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setScorers(await listScorers(league.id))
    } finally {
      setLoading(false)
    }
  }, [league.id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    )
  }

  if (scorers.length === 0) {
    return (
      <EmptyState
        icon={Goal}
        title="Ninguém marcou ainda"
        description={
          league.resultMode === "SIMULATED"
            ? "A artilharia se enche sozinha conforme as rodadas simuladas acontecem."
            : "Ao lançar o placar de uma rodada, marque quem fez os gols. É daí que sai a artilharia."
        }
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-gray-600">
            <th className="w-8 px-3 py-2 text-left font-bold">#</th>
            <th className="px-2 py-2 text-left font-bold">Jogador</th>
            <th className="px-2 py-2 text-left font-bold">Elenco</th>
            <th className="w-12 px-1 py-2 text-center font-bold">Gols</th>
            <th className="w-12 px-1 py-2 text-center font-bold">Ass.</th>
            <th className="w-12 px-1 py-2 text-center font-bold">Jogos</th>
            <th className="w-14 px-2 py-2 text-center font-bold">Nota</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((scorer, index) => (
            <tr key={scorer.id} className="border-b border-white/[0.03] last:border-0">
              <td className="px-3 py-2 text-[11px] font-black text-gray-600">{index + 1}</td>
              <td className="px-2 py-2">
                <p className="truncate font-semibold text-white">{scorer.name}</p>
                <p className="text-[10px] text-gray-600">{scorer.position}</p>
              </td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <TeamCrest name={scorer.roster?.name} logoUrl={scorer.roster?.logoUrl} size={20} />
                  <span className="truncate text-[12px] text-gray-400">{scorer.roster?.name ?? "sem elenco"}</span>
                </div>
              </td>
              <td className="px-1 py-2 text-center text-[15px] font-black tabular-nums text-emerald-400">
                {scorer.goals}
              </td>
              <td className="px-1 py-2 text-center tabular-nums text-blue-400">{scorer.assists}</td>
              <td className="px-1 py-2 text-center tabular-nums text-gray-500">{scorer.appearances}</td>
              <td className="px-2 py-2 text-center tabular-nums text-gray-300">
                {scorer.rating?.toFixed(1) ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
