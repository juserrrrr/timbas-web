import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Radio, Plus } from "lucide-react"
import { ActiveMatchesList } from "./active-matches-list"
import { SERVERS, SERVER_COOKIE } from "@/lib/server-context"
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

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/leagueMatch/server/${selectedServer}/active`,
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      },
    )
    if (res.ok) {
      matches = await res.json()
    } else if (res.status === 401) {
      redirect("/login")
    } else {
      error = "Não foi possível carregar as partidas. Tente novamente."
    }
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
        <Link
          href="/dashboard/match/create"
          prefetch={false}
          className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          Nova partida
        </Link>
      </div>

      <ActiveMatchesList matches={matches} serverName={serverName} error={error} />
    </div>
  )
}
