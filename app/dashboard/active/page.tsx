import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Radio } from "lucide-react"
import { ActiveMatchesList } from "./active-matches-list"
import { CreateMatchLink } from "./create-match-link"
import { SERVERS, SERVER_COOKIE } from "@/lib/servers"
import type { CustomLeagueMatch } from "@/lib/services/match"

export const dynamic = "force-dynamic"

export default async function ActiveMatchesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("timbas_token")?.value

  if (!token) redirect("/login")

  const rawServer = cookieStore.get(SERVER_COOKIE)?.value
  const selectedServer = SERVERS.find((s) => s.id === rawServer)?.id ?? SERVERS[0].id
  const serverName = SERVERS.find((s) => s.id === selectedServer)?.name ?? "Servidor"

  let matches: CustomLeagueMatch[] = []
  let error: string | undefined
  let status = 0

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/leagueMatch/server/${selectedServer}/active`,
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      },
    )
    status = res.status
    if (res.ok) {
      matches = await res.json()
    } else {
      error = "Não foi possível carregar as partidas. Tente novamente."
    }
  } catch {
    error = "Não foi possível carregar as partidas. Tente novamente."
  }

  // redirect fora do try/catch — Next.js redirect() lança NEXT_REDIRECT internamente
  if (status === 401) redirect("/login")

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
