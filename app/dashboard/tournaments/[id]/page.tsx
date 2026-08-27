import { getSession } from "@/lib/session"
import { fetchTournamentOnServer } from "@/lib/services/tournaments"
import { TournamentClient } from "./tournament-client"

export const dynamic = "force-dynamic"

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { token } = await getSession()

  // Buscar aqui em vez de deixar para o navegador junta duas viagens numa: a
  // resposta da rota já chega com o campeonato dentro. Se falhar, o cliente
  // busca do jeito antigo e mostra o erro que ele já sabe mostrar.
  const initialTournament = await fetchTournamentOnServer(token, id).catch(() => null)

  return <TournamentClient tournamentId={id} initialTournament={initialTournament} />
}
