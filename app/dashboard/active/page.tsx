"use client"

import { useState, useEffect } from "react"
import { Radio } from "lucide-react"
import { ActiveMatchesList } from "./active-matches-list"
import { CreateMatchLink } from "./create-match-link"
import { useServer } from "@/lib/server-context"
import { getToken } from "@/lib/auth"
import { apiFetch, authHeaders } from "@/lib/api"
import type { CustomLeagueMatch } from "@/lib/services/match"

export default function ActiveMatchesPage() {
  const { selectedServer, serverName } = useServer()
  const [matches, setMatches] = useState<CustomLeagueMatch[] | null>(null)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    const token = getToken()
    if (!token) return

    setMatches(null)
    setError(undefined)

    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/leagueMatch/server/${selectedServer}/active`, {
      headers: authHeaders(token),
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data: CustomLeagueMatch[]) => setMatches(data))
      .catch(() => setError("Não foi possível carregar as partidas. Tente novamente."))
  }, [selectedServer])

  if (matches === null && !error) return null

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <Radio className="h-7 w-7 text-emerald-400" />
            Ao Vivo
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Partidas ativas em <span className="text-gray-300">{serverName}</span>
          </p>
        </div>
        <CreateMatchLink />
      </div>

      <ActiveMatchesList matches={matches ?? []} serverName={serverName} error={error} />
    </div>
  )
}
