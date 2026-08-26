"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Check, ChevronsUpDown, Loader2, Plus, RefreshCw, Search, Trash2, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmptyState, StatusPill, TeamCrest } from "@/components/competitions/shared"
import { PlayerAvatar } from "@/components/player-avatar"
import { addTeam, removeTeam, replaceTournamentTeamEaClub, searchTournamentTeamCandidates, validateTournamentEaClub } from "@/lib/services/tournaments"
import type { TournamentDetail, TournamentStaffCandidate, TournamentTeam } from "@/lib/services/tournaments.types"

export function TeamsPanel({ tournament, onChanged }: { tournament: TournamentDetail; onChanged: () => void }) {
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [captain, setCaptain] = useState<TournamentStaffCandidate | null>(null)
  const [captainPickerOpen, setCaptainPickerOpen] = useState(false)
  const [captainSearch, setCaptainSearch] = useState("")
  const [captainCandidates, setCaptainCandidates] = useState<TournamentStaffCandidate[]>([])
  const [searchingCaptain, setSearchingCaptain] = useState(false)
  const [busy, setBusy] = useState(false)
  const [validating, setValidating] = useState(false)
  const [eaClub, setEaClub] = useState<{ externalClubId: string; name: string; platform: string } | null>(null)
  const [replacementTeam, setReplacementTeam] = useState<TournamentTeam | null>(null)
  const [replacementName, setReplacementName] = useState("")
  const [replacing, setReplacing] = useState(false)
  const [resetConfirmed, setResetConfirmed] = useState(false)
  const [error, setError] = useState("")

  const { access, status } = tournament
  // A troca zera o histórico da vaga, então o aviso precisa dizer quantas
  // partidas voltam a valer antes de a organização confirmar.
  const matchesToReset = replacementTeam
    ? tournament.matches.filter(
        (match) =>
          (match.homeTeamId === replacementTeam.id || match.awayTeamId === replacementTeam.id) &&
          (match.status === "FINISHED" ||
            match.status === "WALKOVER" ||
            match.claimedHomeScore != null ||
            match.reviewRequestedAt != null),
      ).length
    : 0
  const registrationOpen = status === "REGISTRATION" || status === "DRAFT"
  const alreadyIn = access.teamIds.length > 0
  const isFull = tournament.teams.length >= tournament.maxTeams
  const canAdd = registrationOpen && !isFull && (access.canModerate || !alreadyIn)

  useEffect(() => {
    if (!captainPickerOpen || !access.canModerate) return
    let active = true
    const timer = window.setTimeout(() => {
      setSearchingCaptain(true)
      void searchTournamentTeamCandidates(tournament.id, captainSearch)
        .then((items) => { if (active) setCaptainCandidates(items) })
        .catch((err) => { if (active) setError(err instanceof Error ? err.message : "N\u00e3o foi poss\u00edvel buscar pessoas.") })
        .finally(() => { if (active) setSearchingCaptain(false) })
    }, 220)
    return () => { active = false; window.clearTimeout(timer) }
  }, [access.canModerate, captainPickerOpen, captainSearch, tournament.id])

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      await addTeam(tournament.id, {
        name: eaClub?.name ?? name.trim(),
        tag: tag.trim() || undefined,
        eaClubId: eaClub?.externalClubId,
        eaPlatform: eaClub?.platform,
        captainUserId: access.canModerate ? captain?.id : undefined,
      })
      setName("")
      setTag("")
      setCaptain(null)
      setCaptainSearch("")
      setCaptainCandidates([])
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

  const closeReplaceDialog = () => {
    setReplacementTeam(null)
    setReplacementName("")
    setResetConfirmed(false)
  }

  const replaceClub = async () => {
    if (!replacementTeam) return
    setReplacing(true)
    setError("")
    try {
      await replaceTournamentTeamEaClub(tournament.id, replacementTeam.id, replacementName.trim())
      closeReplaceDialog()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível substituir o clube.")
    } finally {
      setReplacing(false)
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
          <div className="space-y-2">
            <div className={`grid items-center gap-2 ${tournament.game === "EA_FC" ? "sm:grid-cols-[minmax(0,1fr)_auto]" : ""}`}>
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
            </div>
            <div className={`grid items-center gap-2 ${access.canModerate ? "sm:grid-cols-[minmax(0,1fr)_7rem_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"}`}>
            {access.canModerate && (
              <Popover open={captainPickerOpen} onOpenChange={setCaptainPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={captainPickerOpen} className="h-10 min-w-0 justify-between border-white/10 bg-white/[0.03] px-2.5 hover:bg-white/[0.06]">
                    {captain ? (
                      <span className="flex min-w-0 items-center gap-2"><PlayerAvatar name={captain.name} discordId={captain.discordId} avatar={captain.avatar} size={64} className="h-7 w-7" /><span className="truncate text-xs font-bold text-white">{captain.name}</span></span>
                    ) : (
                      <span className="truncate text-xs text-gray-500">Selecionar responsável</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-600" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] border-white/10 bg-[#0b0b11] p-0 text-white">
                  <Command shouldFilter={false} className="bg-transparent">
                    <CommandInput value={captainSearch} onValueChange={setCaptainSearch} placeholder="Buscar pelo nome..." />
                    <CommandList>
                      {searchingCaptain ? <div className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Buscando pessoas...</div> : (
                        <>
                          <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                          <CommandGroup>
                            {captainCandidates.map((candidate) => (
                              <CommandItem key={candidate.id} value={String(candidate.id)} onSelect={() => { setCaptain(candidate); setCaptainPickerOpen(false) }} className="cursor-pointer gap-3 py-2.5 data-[selected=true]:bg-white/[0.07]">
                                <PlayerAvatar name={candidate.name} discordId={candidate.discordId} avatar={candidate.avatar} size={64} className="h-9 w-9" />
                                <span className="min-w-0 flex-1 truncate font-bold text-white">{candidate.name}</span>
                                {captain?.id === candidate.id && <Check className="h-4 w-4 text-amber-400" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <Input
              value={tag}
              onChange={(event) => setTag(event.target.value.toUpperCase().slice(0, 6))}
              placeholder="TAG"
              className="h-10 border-white/10 bg-white/[0.03]"
            />
            <Button
              onClick={() => void submit()}
              disabled={busy || name.trim().length < 2 || (access.canModerate && !captain) || (tournament.game === "EA_FC" && !eaClub)}
              className="h-10 rounded-md bg-amber-500 px-4 text-black hover:bg-amber-400"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1.5">Inscrever</span>
            </Button>
            </div>
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
                  {access.canModerate && tournament.game === "EA_FC" && (
                    <button
                      onClick={() => {
                        setReplacementTeam(team)
                        setReplacementName("")
                        setResetConfirmed(false)
                        setError("")
                      }}
                      disabled={busy}
                      aria-label={`Substituir ${team.name}`}
                      className="flex-shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-600 transition hover:bg-blue-500/10 hover:text-blue-400"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
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

      <Dialog open={replacementTeam !== null} onOpenChange={(open) => !open && closeReplaceDialog()}>
        <DialogContent className="border-white/10 bg-[#0b0b12] text-white">
          <DialogHeader>
            <DialogTitle>Substituir clube inscrito</DialogTitle>
            <DialogDescription>
              A vaga de {replacementTeam?.name} será mantida, incluindo grupo, rodada e confrontos. Informe o nome exato do novo clube na EA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={replacementName}
              onChange={(event) => setReplacementName(event.target.value)}
              placeholder="Nome exato do novo clube na EA"
              disabled={replacing}
              className="border-white/10 bg-white/[0.03]"
            />
            {matchesToReset > 0 ? (
              <div className="space-y-2 rounded-lg border border-red-500/25 bg-red-500/[0.07] p-3">
                <p className="text-[11px] leading-relaxed text-red-300">
                  {matchesToReset === 1
                    ? "1 partida deste time já tem resultado e será zerada."
                    : `${matchesToReset} partidas deste time já têm resultado e serão zeradas.`}{" "}
                  O placar, o W.O., o registro da EA e as provas somem, os pontos saem da tabela do time e dos
                  adversários, e o mata-mata publicado volta a ser montado quando a fase de pontos terminar de novo.
                </p>
                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-red-200">
                  <Checkbox
                    checked={resetConfirmed}
                    onCheckedChange={(value) => setResetConfirmed(value === true)}
                    disabled={replacing}
                    className="mt-0.5 cursor-pointer border-red-400/50 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
                  />
                  <span>Entendi que as partidas já jogadas por {replacementTeam?.name} voltam a valer do zero.</span>
                </label>
              </div>
            ) : (
              <p className="text-[11px] text-amber-300/80">
                As partidas desta vaga voltam a ficar em aberto e o capitão atual permanece responsável por ela.
              </p>
            )}
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={replacing} onClick={closeReplaceDialog}>Cancelar</Button>
              <Button
                disabled={replacing || replacementName.trim().length < 2 || (matchesToReset > 0 && !resetConfirmed)}
                onClick={() => void replaceClub()}
                className="bg-blue-500 text-white hover:bg-blue-400"
              >
                {replacing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                {matchesToReset > 0 ? "Substituir e zerar partidas" : "Substituir clube"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
