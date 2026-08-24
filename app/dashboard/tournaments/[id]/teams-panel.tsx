"use client"

import { useState } from "react"
import { BadgeCheck, Loader2, Plus, Search, Trash2, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState, StatusPill, TeamCrest } from "@/components/competitions/shared"
import { addTeam, removeTeam, validateTournamentEaClub } from "@/lib/services/tournaments"
import type { TournamentDetail } from "@/lib/services/tournaments.types"

export function TeamsPanel({ tournament, onChanged }: { tournament: TournamentDetail; onChanged: () => void }) {
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [busy, setBusy] = useState(false)
  const [validating, setValidating] = useState(false)
  const [eaClub, setEaClub] = useState<{ externalClubId: string; name: string; platform: string } | null>(null)
  const [error, setError] = useState("")

  const { access, status } = tournament
  const registrationOpen = status === "REGISTRATION" || status === "DRAFT"
  const alreadyIn = access.teamIds.length > 0
  const isFull = tournament.teams.length >= tournament.maxTeams
  const canAdd = registrationOpen && !isFull && (access.canModerate || !alreadyIn)

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      await addTeam(tournament.id, {
        name: eaClub?.name ?? name.trim(),
        tag: tag.trim() || undefined,
        eaClubId: eaClub?.externalClubId,
        eaPlatform: eaClub?.platform,
      })
      setName("")
      setTag("")
      setEaClub(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível inscrever o time.")
    } finally {
      setBusy(false)
    }
  }

  const validateEa = async () => {
    setValidating(true)
    setError("")
    try {
      const club = await validateTournamentEaClub(tournament.id, name.trim())
      setEaClub(club)
      setName(club.name)
    } catch (err) {
      setEaClub(null)
      setError(err instanceof Error ? err.message : "Não foi possível validar o clube na EA.")
    } finally {
      setValidating(false)
    }
  }

  const drop = async (teamId: string) => {
    setBusy(true)
    setError("")
    try {
      await removeTeam(tournament.id, teamId)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover o time.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {canAdd && (
        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">
              {access.canModerate ? "Inscrever um time" : "Inscrever meu time"}
            </h3>
          </div>
          <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_7rem_auto]">
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setEaClub(null)
              }}
              placeholder={tournament.game === "EA_FC" ? "Nome exato do clube na EA" : "Nome do time"}
              className="h-10 min-w-0 border-white/10 bg-white/[0.03]"
            />
            {tournament.game === "EA_FC" && (
              <Button
                variant="outline"
                onClick={() => void validateEa()}
                disabled={validating || name.trim().length < 2}
                className="h-10 rounded-md px-4 whitespace-nowrap"
              >
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : eaClub ? <BadgeCheck className="h-4 w-4 text-emerald-400" /> : <Search className="h-4 w-4" />}
                <span className="ml-1.5">{eaClub ? "Validado" : "Validar na EA"}</span>
              </Button>
            )}
            <Input
              value={tag}
              onChange={(event) => setTag(event.target.value.toUpperCase().slice(0, 6))}
              placeholder="TAG"
              className="h-10 border-white/10 bg-white/[0.03]"
            />
            <Button
              onClick={() => void submit()}
              disabled={busy || name.trim().length < 2 || (tournament.game === "EA_FC" && !eaClub)}
              className="h-10 rounded-md bg-amber-500 px-4 text-black hover:bg-amber-400"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1.5">Inscrever</span>
            </Button>
          </div>
          {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
        </Card>
      )}

      {!registrationOpen && (
        <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] text-gray-500">
          As inscrições estão encerradas porque o campeonato já começou.
        </p>
      )}
      {registrationOpen && isFull && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300">
          O limite de {tournament.maxTeams} times foi atingido.
        </p>
      )}

      {tournament.teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum time inscrito"
          description="Os times aparecem aqui conforme se inscrevem. O chaveamento é gerado quando o campeonato começar."
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {[...tournament.teams]
            .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
            .map((team) => {
              const isMine = access.teamIds.includes(team.id)
              const canRemove = registrationOpen && (access.canModerate || isMine)

              return (
                <Card
                  key={team.id}
                  className={`flex items-center gap-3 border-white/[0.07] bg-white/[0.025] p-3 ${
                    team.eliminated ? "opacity-50" : ""
                  }`}
                >
                  <span className="w-6 flex-shrink-0 text-center text-xs font-black text-gray-600">
                    {team.seed ?? "-"}
                  </span>
                  <TeamCrest name={team.name} logoUrl={team.logoUrl} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {team.name}
                      {team.tag && <span className="ml-1.5 text-[11px] text-gray-600">[{team.tag}]</span>}
                    </p>
                    <p className="truncate text-[11px] text-gray-600">
                      {team.members.length > 0
                        ? team.members.map((member) => member.user.name).join(", ")
                        : "Sem jogadores vinculados"}
                    </p>
                  </div>
                  {isMine && <StatusPill tone="warn">Seu time</StatusPill>}
                  {team.eliminated && <StatusPill tone="danger">Eliminado</StatusPill>}
                  {canRemove && (
                    <button
                      onClick={() => void drop(team.id)}
                      disabled={busy}
                      aria-label={`Remover ${team.name}`}
                      className="flex-shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-600 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
