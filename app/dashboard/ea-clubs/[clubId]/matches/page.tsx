"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { CalendarRange, Filter, RotateCcw, Search, Sparkles } from "lucide-react"
import { ClubPageHeader, ErrorState, MatchRow, PageLoading } from "@/components/ea-clubs/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEaClub, getEaClubMatches, getEaClubPlayers } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubMatch, EaClubPlayer, EaMatchFilters, Paginated } from "@/lib/services/ea-clubs.types"

const emptyDraft = { from: "", to: "", result: "ALL", opponent: "", playerId: "ALL" }

export default function EaClubMatchesPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [players, setPlayers] = useState<EaClubPlayer[]>([])
  const [matches, setMatches] = useState<Paginated<EaClubMatch> | null>(null)
  const [filters, setFilters] = useState<EaMatchFilters>({ page: 1, limit: 20 })
  const [draft, setDraft] = useState(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [clubData, playerData, matchData] = await Promise.all([
        getEaClub(clubId),
        getEaClubPlayers(clubId),
        getEaClubMatches(clubId, filters),
      ])
      setClub(clubData)
      setPlayers(playerData)
      setMatches(matchData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }, [clubId, filters])

  useEffect(() => { void load() }, [load])

  const activeFilterCount = useMemo(() => [
    filters.from,
    filters.to,
    filters.result,
    filters.opponent,
    filters.playerId,
  ].filter(Boolean).length, [filters])

  function apply(event: FormEvent) {
    event.preventDefault()
    setFilters({
      page: 1,
      limit: 20,
      from: draft.from || undefined,
      to: draft.to || undefined,
      result: draft.result === "ALL" ? undefined : draft.result as EaMatchFilters["result"],
      opponent: draft.opponent.trim() || undefined,
      playerId: draft.playerId === "ALL" ? undefined : draft.playerId,
    })
  }

  function clearFilters() {
    setDraft(emptyDraft)
    setFilters({ page: 1, limit: 20 })
  }

  if (loading && !matches) return <PageLoading />
  if (error && !matches) return <ErrorState message={error} retry={() => void load()} />

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <ClubPageHeader name={club?.nickname || club?.name} subtitle="Histórico de partidas" />

      <Card className="overflow-hidden border-white/[0.08] bg-gradient-to-br from-blue-500/[0.08] via-white/[0.025] to-transparent">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-white">Encontre qualquer partida salva</h2>
              <p className="text-sm text-gray-500">Filtre por data, adversário, resultado ou quem entrou em campo.</p>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <span className="w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
              {activeFilterCount} {activeFilterCount === 1 ? "filtro ativo" : "filtros ativos"}
            </span>
          )}
        </div>

        <form onSubmit={apply} className="p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-2">
              <Label htmlFor="from" className="mb-2 block text-xs font-semibold text-gray-400">De</Label>
              <Input id="from" type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
            </div>
            <div className="xl:col-span-2">
              <Label htmlFor="to" className="mb-2 block text-xs font-semibold text-gray-400">Até</Label>
              <Input id="to" type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
            </div>
            <div className="xl:col-span-2">
              <Label className="mb-2 block text-xs font-semibold text-gray-400">Resultado</Label>
              <Select value={draft.result} onValueChange={(result) => setDraft({ ...draft, result })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="WIN">Vitória</SelectItem>
                  <SelectItem value="DRAW">Empate</SelectItem>
                  <SelectItem value="LOSS">Derrota</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="xl:col-span-3">
              <Label htmlFor="opponent" className="mb-2 block text-xs font-semibold text-gray-400">Adversário</Label>
              <Input id="opponent" value={draft.opponent} onChange={(event) => setDraft({ ...draft, opponent: event.target.value })} placeholder="Nome do clube" />
            </div>
            <div className="xl:col-span-3">
              <Label className="mb-2 block text-xs font-semibold text-gray-400">Jogador participante</Label>
              <Select value={draft.playerId} onValueChange={(playerId) => setDraft({ ...draft, playerId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {players.map((player) => <SelectItem key={player.id} value={player.id}>{player.playerName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={clearFilters} disabled={!activeFilterCount && draft === emptyDraft}>
              <RotateCcw className="mr-2 h-4 w-4" />Limpar
            </Button>
            <Button type="submit" disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />Aplicar filtros
            </Button>
          </div>
        </form>
      </Card>

      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center text-sm text-red-400">{error}</p>}

      {matches?.data.length ? (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">Jogos registrados</p>
              <h2 className="mt-1 text-xl font-black text-white">
                {matches.total} {matches.total === 1 ? "partida encontrada" : "partidas encontradas"}
              </h2>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />O histórico cresce automaticamente a cada sincronização.
            </p>
          </div>
          <div className={`space-y-3 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
            {matches.data.map((match) => (
              <MatchRow key={match.id} clubId={clubId} clubName={club?.name || "Seu clube"} match={match} />
            ))}
          </div>
          {matches.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" disabled={matches.page <= 1 || loading} onClick={() => setFilters((current) => ({ ...current, page: (current.page || 1) - 1 }))}>Anterior</Button>
              <span className="min-w-28 text-center text-sm text-gray-500">Página {matches.page} de {matches.pages}</span>
              <Button variant="outline" disabled={matches.page >= matches.pages || loading} onClick={() => setFilters((current) => ({ ...current, page: (current.page || 1) + 1 }))}>Próxima</Button>
            </div>
          )}
        </section>
      ) : (
        <Card className="border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Search className="h-7 w-7 text-gray-600" />
          </div>
          <p className="font-bold text-white">Nenhuma partida encontrada</p>
          <p className="mt-1 text-sm text-gray-500">Ajuste os filtros ou aguarde a próxima sincronização automática.</p>
          {activeFilterCount > 0 && <Button variant="outline" className="mt-5" onClick={clearFilters}>Limpar filtros</Button>}
        </Card>
      )}
    </div>
  )
}
