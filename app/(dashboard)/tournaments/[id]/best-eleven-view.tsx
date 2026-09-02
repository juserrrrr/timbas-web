"use client"

import { useCallback, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { EmptyState } from "@/components/competitions/shared"
import { LoadingState } from "@/components/ui/loading-state"
import { useSmartPolling } from "@/hooks/use-smart-polling"
import { getTournamentEaAwards } from "@/lib/services/tournaments"
import type { TournamentEaPlayerStats } from "@/lib/services/tournaments.types"
import { BestEleven } from "./best-eleven"

export function BestElevenView({ tournamentId, finished }: { tournamentId: string; finished: boolean }) {
  const [players, setPlayers] = useState<TournamentEaPlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const dataSignature = useRef("")

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const result = await getTournamentEaAwards(tournamentId)
      const nextPlayers = Array.isArray(result.players) ? result.players : []
      const signature = JSON.stringify(nextPlayers)
      if (signature !== dataSignature.current) {
        dataSignature.current = signature
        setPlayers(nextPlayers)
      }
      setError("")
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Não foi possível carregar a seleção do campeonato.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [tournamentId])

  useSmartPolling(() => load(dataSignature.current !== ""), { intervalMs: finished ? 30_000 : 8_000 })

  if (loading) return <LoadingState className="mx-0 my-0 min-h-[320px]" message="Montando a seleção" />
  if (error) return <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">{error}</p>
  if (!players.length) {
    return <EmptyState icon={Sparkles} title="Seleção ainda não definida" description="As cartas aparecem depois que as primeiras estatísticas de jogadores forem sincronizadas com a EA." />
  }

  return <BestEleven players={players} />
}
