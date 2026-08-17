"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { listTournaments } from "@/lib/services/tournaments"
import {
  FORMAT_LABELS,
  GAME_LABELS,
  STATUS_LABELS,
  type TournamentStatus,
  type TournamentSummary,
} from "@/lib/services/tournaments.types"
import {
  CompetitionHeader,
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import { CreateTournamentDialog } from "./create-tournament-dialog"

const FILTERS: Array<{ id: string; label: string; status?: TournamentStatus }> = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Inscrições abertas", status: "REGISTRATION" },
  { id: "running", label: "Em andamento", status: "RUNNING" },
  { id: "finished", label: "Encerrados", status: "FINISHED" },
]

const STATUS_TONES: Record<TournamentStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  DRAFT: "neutral",
  REGISTRATION: "warn",
  RUNNING: "live",
  FINISHED: "done",
  CANCELLED: "danger",
}

export default function TournamentsPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { items } = await listTournaments()
      setTournaments(items)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os campeonatos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    const status = FILTERS.find((item) => item.id === filter)?.status
    return status ? tournaments.filter((tournament) => tournament.status === status) : tournaments
  }, [tournaments, filter])

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />

  return (
    <div className="dashboard-view space-y-6">
      <CompetitionHeader
        eyebrow="Competições"
        title="Campeonatos"
        subtitle="Monte chaves de qualquer jogo, valide resultados por foto e distribua moedas."
        icon={Trophy}
        actions={
          <Button onClick={() => setCreating(true)} className="bg-amber-500 text-black hover:bg-amber-400">
            <Plus className="mr-1.5 h-4 w-4" />
            Criar campeonato
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              filter === item.id
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nenhum campeonato por aqui"
          description="Crie o primeiro campeonato. Você escolhe o jogo, o formato da chave e quantas moedas cada resultado vale."
          action={
            <Button onClick={() => setCreating(true)} className="bg-amber-500 text-black hover:bg-amber-400">
              <Plus className="mr-1.5 h-4 w-4" />
              Criar campeonato
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((tournament) => (
            <button
              key={tournament.id}
              onClick={() => router.push(`/dashboard/tournaments/${tournament.id}`)}
              className="text-left"
            >
              <Card className="h-full border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-amber-500/30 hover:bg-amber-500/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      {tournament.gameLabel || GAME_LABELS[tournament.game]}
                    </p>
                    <h2 className="truncate text-lg font-black text-white">{tournament.name}</h2>
                  </div>
                  <StatusPill tone={STATUS_TONES[tournament.status]}>{STATUS_LABELS[tournament.status]}</StatusPill>
                </div>

                {tournament.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{tournament.description}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-400">{FORMAT_LABELS[tournament.format]}</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {tournament.teamCount}/{tournament.maxTeams} times
                  </span>
                  <span>{tournament.matchCount} partidas</span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
                  <span className="truncate text-[11px] text-gray-600">
                    {tournament.owner ? `Organizado por ${tournament.owner.name}` : "Sem organizador"}
                  </span>
                  <span className="text-[11px] text-gray-600">{formatDateTime(tournament.startsAt)}</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <CreateTournamentDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => router.push(`/dashboard/tournaments/${id}`)}
      />
    </div>
  )
}
