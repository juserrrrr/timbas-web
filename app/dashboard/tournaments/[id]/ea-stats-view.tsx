"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, Loader2, Medal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState, TeamCrest } from "@/components/competitions/shared"
import { getTournamentEaStats } from "@/lib/services/tournaments"
import type { TournamentEaPlayerStats } from "@/lib/services/tournaments.types"

const TAGS: Record<string, string> = {
  MVP: "MVP",
  HAT_TRICK: "Hat-trick",
  DOIS_GOLS: "Doblete",
  MAESTRO: "Maestro",
  PAREDAO: "Paredão",
  NOTA_9_PLUS: "Nota 9+",
}

export function EaStatsView({ tournamentId }: { tournamentId: string }) {
  const [players, setPlayers] = useState<TournamentEaPlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPlayers(await getTournamentEaStats(tournamentId))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as estatísticas da EA.")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  if (error) return <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">{error}</p>
  if (!players.length) {
    return <EmptyState icon={BarChart3} title="Nenhuma estatística sincronizada" description="Depois que alguém checar uma partida na EA, gols, assistências, notas e destaques aparecem aqui." />
  }

  return (
    <Card className="overflow-hidden border-white/[0.07] bg-white/[0.025]">
      <div className="border-b border-white/[0.06] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-white"><Medal className="h-4 w-4 text-amber-400" />Estatísticas do campeonato</h3>
        <p className="mt-1 text-[11px] text-gray-500">Dados sincronizados dos amistosos no EA Sports FC Clubs.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-gray-600">
            <tr><th className="px-4 py-3">Jogador</th><th className="px-3 py-3">J</th><th className="px-3 py-3">G</th><th className="px-3 py-3">A</th><th className="px-3 py-3">G+A</th><th className="px-3 py-3">Nota</th><th className="px-3 py-3">MVP</th><th className="px-4 py-3">Destaques</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {players.map((player, index) => (
              <tr key={`${player.team?.id}:${player.externalPlayerId ?? player.playerName}`} className="text-gray-300">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="w-5 text-center font-black text-gray-600">{index + 1}</span><TeamCrest name={player.team?.name} logoUrl={player.team?.logoUrl} size={28} /><div><p className="font-bold text-white">{player.playerName}</p><p className="text-[10px] text-gray-600">{player.team?.name ?? "-"}</p></div></div></td>
                <td className="px-3 py-3">{player.appearances}</td><td className="px-3 py-3 font-black text-emerald-300">{player.goals}</td><td className="px-3 py-3 text-blue-300">{player.assists}</td><td className="px-3 py-3 font-bold text-white">{player.goalContributions}</td><td className="px-3 py-3">{player.averageRating?.toFixed(1) ?? "-"}</td><td className="px-3 py-3">{player.mvps}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{player.tags.map((tag) => <span key={tag} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">{TAGS[tag] ?? tag}</span>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
