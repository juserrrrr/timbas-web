"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Crown, Loader2, ShieldCheck, Trash2, UserCog, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusPill } from "@/components/competitions/shared"
import { PlayerAvatar } from "@/components/player-avatar"
import { removeStaff, searchTournamentStaffCandidates, setStaff, transferOwnership } from "@/lib/services/tournaments"
import type { TournamentDetail, TournamentStaffCandidate } from "@/lib/services/tournaments.types"

export function StaffPanel({ tournament, onChanged }: { tournament: TournamentDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)
  const [candidates, setCandidates] = useState<TournamentStaffCandidate[]>([])
  const [selected, setSelected] = useState<TournamentStaffCandidate | null>(null)

  useEffect(() => {
    if (!pickerOpen || !tournament.access.canManage) return
    let active = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchTournamentStaffCandidates(tournament.id, search)
        .then((items) => { if (active) setCandidates(items) })
        .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível buscar pessoas.") })
        .finally(() => { if (active) setSearching(false) })
    }, 220)
    return () => { active = false; window.clearTimeout(timer) }
  }, [pickerOpen, search, tournament.access.canManage, tournament.id])

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError("")
    try {
      await action()
      onChanged()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
      return false
    } finally {
      setBusy(false)
    }
  }

  const addModerator = async () => {
    if (!selected) return
    const added = await run(() => setStaff(tournament.id, selected.id, "MODERATOR"))
    if (!added) return
    setSelected(null)
    setSearch("")
    setCandidates([])
  }

  const owner = tournament.staff.find((member) => member.role === "OWNER")
  const moderators = tournament.staff.filter((member) => member.role === "MODERATOR")

  return (
    <div className="space-y-4">
      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-black text-white">Quem manda no campeonato</h3>
        </div>

        <div className="space-y-2">
          {owner && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5">
              <Crown className="h-4 w-4 flex-shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{owner.user.name}</p>
                <p className="text-[11px] text-gray-500">
                  Cria e apaga o campeonato, edita as regras, inicia a chave e gerencia a equipe
                </p>
              </div>
              <StatusPill tone="warn">Dono</StatusPill>
            </div>
          )}

          {moderators.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5"
            >
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{member.user.name}</p>
                <p className="text-[11px] text-gray-500">
                  Aprova ou recusa provas, lança resultados, agenda partidas e declara W.O.
                </p>
              </div>
              {tournament.access.canManage && (
                <>
                  <button
                    onClick={() => void run(() => transferOwnership(tournament.id, member.userId))}
                    disabled={busy}
                    className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 transition hover:bg-amber-500/10 hover:text-amber-400"
                  >
                    Passar posse
                  </button>
                  <button
                    onClick={() => void run(() => removeStaff(tournament.id, member.userId))}
                    disabled={busy}
                    aria-label={`Remover ${member.user.name}`}
                    className="cursor-pointer rounded-lg p-1.5 text-gray-600 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}

          {moderators.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-gray-600">
              Nenhum moderador ainda. Adicione alguém para dividir o trabalho de aprovar resultados.
            </p>
          )}
        </div>

        {tournament.access.canManage && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20"><UserPlus className="h-4 w-4" /></span>
              <div><p className="text-sm font-black text-white">Adicionar moderador</p><p className="mt-0.5 text-[11px] text-gray-500">Procure pelo nome da pessoa. Ela poderá cuidar de partidas, resultados e aprovações.</p></div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={pickerOpen} className="h-12 min-w-0 flex-1 justify-between border-white/10 bg-black/20 px-3 hover:bg-white/[0.05]">
                    {selected ? (
                      <span className="flex min-w-0 items-center gap-2.5"><PlayerAvatar name={selected.name} discordId={selected.discordId} avatar={selected.avatar} size={64} className="h-8 w-8" /><span className="truncate text-sm font-bold text-white">{selected.name}</span></span>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-gray-500"><UserCog className="h-4 w-4" />Selecionar uma pessoa</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-600" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent sideOffset={8} align="start" collisionPadding={12} className="max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] overflow-hidden border-white/10 bg-[#0b0b11] p-0 text-white shadow-2xl shadow-black/50">
                  <Command shouldFilter={false} className="bg-transparent">
                    <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar pelo nome..." />
                    <CommandList className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3.5rem))]">
                      {searching ? <div className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Buscando pessoas...</div> : (
                        <>
                          <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                          <CommandGroup>
                            {candidates.map((candidate) => (
                              <CommandItem key={candidate.id} value={String(candidate.id)} onSelect={() => { setSelected(candidate); setPickerOpen(false) }} className="cursor-pointer gap-3 py-2.5 data-[selected=true]:bg-white/[0.07]">
                                <PlayerAvatar name={candidate.name} discordId={candidate.discordId} avatar={candidate.avatar} size={64} className="h-9 w-9" />
                                <span className="min-w-0 flex-1 truncate font-bold text-white">{candidate.name}</span>
                                {selected?.id === candidate.id && <Check className="h-4 w-4 text-blue-400" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button onClick={() => void addModerator()} disabled={busy || !selected} className="h-12 bg-blue-600 px-5 text-white hover:bg-blue-500">
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}Adicionar
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      </Card>

    </div>
  )
}
