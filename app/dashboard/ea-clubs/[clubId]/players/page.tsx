"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { UserRound, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getEaClub, getEaClubPlayers } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubPlayer } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, PageLoading } from "@/components/ea-clubs/shared"

export default function EaClubPlayersPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [players, setPlayers] = useState<EaClubPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => { setLoading(true); try { const [c, p] = await Promise.all([getEaClub(clubId), getEaClubPlayers(clubId)]); setClub(c); setPlayers(p); setError("") } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") } finally { setLoading(false) } }, [clubId])
  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />
  return <div className="space-y-6"><ClubPageHeader name={club?.nickname || club?.name} subtitle="Elenco e estatísticas do clube informados pela EA" />{players.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{players.map(player => { const detailed = player.appearances ?? 0; const total = player.eaClubGames ?? detailed; return <Link key={player.id} href={`/dashboard/ea-clubs/${clubId}/players/${player.id}`}><Card className="flex items-center gap-4 border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-blue-500/30 hover:bg-blue-500/5"><div className="rounded-full bg-blue-500/10 p-3"><UserRound className="h-5 w-5 text-blue-400" /></div><div className="min-w-0"><p className="truncate font-black text-white">{player.playerName}</p><p className="text-sm font-semibold text-gray-400">{total} {total === 1 ? "partida no clube" : "partidas no clube"}</p>{player.eaClubGames != null && <p className="text-xs text-gray-600">{detailed} com detalhes armazenados</p>}</div></Card></Link>})}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><Users className="mx-auto mb-3 h-9 w-9 text-gray-600" /><p className="font-bold text-white">Nenhum jogador encontrado</p><p className="text-sm text-gray-500">Os jogadores aparecerão automaticamente após a sincronização.</p></Card>}</div>
}
