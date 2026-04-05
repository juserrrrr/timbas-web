import { Radio } from "lucide-react"
import { ActiveMatchesList } from "./active-matches-list"
import { CreateMatchLink } from "./create-match-link"
import { getSession } from "@/lib/session"
import type { CustomLeagueMatch } from "@/lib/services/match"

export const dynamic = "force-dynamic"

export default async function ActiveMatchesPage() {
  const { token, serverId, serverName } = await getSession()

  let matches: CustomLeagueMatch[] = []
  let error: string | undefined

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagueMatch/server/${serverId}/active`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) throw new Error()
    matches = await res.json()
  } catch {
    error = "Não foi possível carregar as partidas. Tente novamente."
  }

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

      <ActiveMatchesList matches={matches} serverName={serverName} error={error} />
    </div>
  )
}
