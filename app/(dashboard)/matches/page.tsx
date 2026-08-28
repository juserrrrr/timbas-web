"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { ActiveMatchesList } from "./active-matches-list"
import { getToken } from "@/lib/auth"
import { TIMBAS_SERVER_ID, TIMBAS_SERVER_NAME } from "@/lib/servers"
import { getActiveMatches, type CustomLeagueMatch } from "@/lib/services/match"

export default function ActiveMatchesPage() {
  const [matches, setMatches] = useState<CustomLeagueMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = getToken()
      if (!token) throw new Error("Sessão não encontrada. Entre novamente no Timbas.")
      setMatches(await getActiveMatches(token, TIMBAS_SERVER_ID))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as partidas.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="dashboard-view space-y-6">
      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" /></div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-6 text-center">
          <p className="text-sm font-semibold text-red-300">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-400/15"><RefreshCw className="h-3.5 w-3.5" />Tentar novamente</button>
        </div>
      ) : <ActiveMatchesList matches={matches} serverName={TIMBAS_SERVER_NAME} />}
    </div>
  )
}
