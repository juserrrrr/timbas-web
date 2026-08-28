import { getSession } from "@/lib/session"
import { fetchTournamentsOnServer } from "@/lib/services/tournaments"
import { TournamentsClient } from "./tournaments-client"

export const dynamic = "force-dynamic"

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  // Com convite na URL a tela nem chega a mostrar a lista: ela aceita o convite
  // e manda a pessoa para o campeonato. Buscar a lista aqui seria trabalho
  // jogado fora.
  if (invite) return <TournamentsClient />

  const { token } = await getSession()
  const initial = await fetchTournamentsOnServer(token)
    .then(({ items }) => items)
    .catch(() => null)

  return <TournamentsClient initialTournaments={initial} />
}
