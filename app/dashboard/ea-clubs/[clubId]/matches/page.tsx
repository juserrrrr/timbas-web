"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEaClub, getEaClubMatches, getEaClubPlayers } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubMatch, EaClubPlayer, EaMatchFilters, Paginated } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, MatchRow, PageLoading } from "@/components/ea-clubs/shared"

export default function EaClubMatchesPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [players, setPlayers] = useState<EaClubPlayer[]>([])
  const [matches, setMatches] = useState<Paginated<EaClubMatch> | null>(null)
  const [filters, setFilters] = useState<EaMatchFilters>({ page: 1, limit: 20 })
  const [draft, setDraft] = useState({ from: "", to: "", result: "ALL", opponent: "", playerId: "ALL" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [clubData, playerData, matchData] = await Promise.all([getEaClub(clubId), getEaClubPlayers(clubId), getEaClubMatches(clubId, filters)]); setClub(clubData); setPlayers(playerData); setMatches(matchData) } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") } finally { setLoading(false) } }, [clubId, filters])
  useEffect(() => { void load() }, [load])
  function apply(event: FormEvent) { event.preventDefault(); setFilters({ page: 1, limit: 20, from: draft.from || undefined, to: draft.to || undefined, result: draft.result === "ALL" ? undefined : draft.result as EaMatchFilters["result"], opponent: draft.opponent.trim() || undefined, playerId: draft.playerId === "ALL" ? undefined : draft.playerId }) }
  if (loading && !matches) return <PageLoading />
  if (error && !matches) return <ErrorState message={error} retry={() => void load()} />
  return <div className="space-y-6"><ClubPageHeader name={club?.nickname || club?.name} subtitle="Histórico completo de partidas" />
    <Card className="border-white/[0.07] bg-white/[0.025] p-4"><form onSubmit={apply} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><div><Label htmlFor="from" className="text-xs">De</Label><Input id="from" type="date" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></div><div><Label htmlFor="to" className="text-xs">Até</Label><Input id="to" type="date" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></div><div><Label className="text-xs">Resultado</Label><Select value={draft.result} onValueChange={result => setDraft({ ...draft, result })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem><SelectItem value="WIN">Vitória</SelectItem><SelectItem value="DRAW">Empate</SelectItem><SelectItem value="LOSS">Derrota</SelectItem></SelectContent></Select></div><div><Label htmlFor="opponent" className="text-xs">Adversário</Label><Input id="opponent" value={draft.opponent} onChange={e => setDraft({ ...draft, opponent: e.target.value })} placeholder="Nome do clube" /></div><div><Label className="text-xs">Jogador participante</Label><Select value={draft.playerId} onValueChange={playerId => setDraft({ ...draft, playerId })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem>{players.map(player => <SelectItem key={player.id} value={player.id}>{player.playerName}</SelectItem>)}</SelectContent></Select></div><Button type="submit" className="self-end"><Filter className="mr-2 h-4 w-4" />Filtrar</Button></form></Card>
    {error && <p className="text-sm text-red-400">{error}</p>}{matches?.data.length ? <div className="space-y-2">{matches.data.map(match => <MatchRow key={match.id} clubId={clubId} clubName={club?.name || "Seu clube"} match={match} />)}{matches.pages > 1 && <div className="flex items-center justify-center gap-3 pt-4"><Button variant="outline" disabled={matches.page <= 1 || loading} onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}>Anterior</Button><span className="text-sm text-gray-500">Página {matches.page} de {matches.pages}</span><Button variant="outline" disabled={matches.page >= matches.pages || loading} onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}>Próxima</Button></div>}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><Search className="mx-auto mb-3 h-9 w-9 text-gray-600" /><p className="font-bold text-white">Nenhuma partida encontrada</p><p className="text-sm text-gray-500">Ajuste os filtros ou sincronize novas partidas.</p></Card>}
  </div>
}
