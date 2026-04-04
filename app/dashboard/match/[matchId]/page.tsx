import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getMatch, type CustomLeagueMatch } from "@/lib/services/match"
import { MatchView } from "./match-view"

export const dynamic = "force-dynamic"

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const matchIdNum = parseInt(matchId, 10)
  if (isNaN(matchIdNum)) redirect("/dashboard/active")

  const cookieStore = await cookies()
  const token = cookieStore.get("timbas_token")?.value
  if (!token) redirect("/login")

  let initialMatch: CustomLeagueMatch | null = null
  let initialError: string | null = null

  try {
    initialMatch = await getMatch(matchIdNum, token)
  } catch (e: any) {
    if (e.message?.includes("Sessão expirada")) redirect("/login")
    initialError = e.message || "Partida não encontrada"
  }

  return <MatchView matchId={matchIdNum} initialMatch={initialMatch} initialError={initialError} />
}
