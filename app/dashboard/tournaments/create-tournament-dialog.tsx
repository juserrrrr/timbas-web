"use client"

import { useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createTournament } from "@/lib/services/tournaments"
import {
  FORMAT_DESCRIPTIONS,
  FORMAT_LABELS,
  GAME_LABELS,
  type CompetitionGame,
  type TournamentFormat,
} from "@/lib/services/tournaments.types"

const GAMES = Object.keys(GAME_LABELS) as CompetitionGame[]
const FORMATS = Object.keys(FORMAT_LABELS) as TournamentFormat[]
const TEAM_COUNTS = [4, 8, 16, 32]

export function CreateTournamentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [game, setGame] = useState<CompetitionGame>("EA_FC")
  const [gameLabel, setGameLabel] = useState("")
  const [format, setFormat] = useState<TournamentFormat>("SINGLE_ELIMINATION")
  const [maxTeams, setMaxTeams] = useState(8)
  const [groupCount, setGroupCount] = useState(2)
  const [advancePerGroup, setAdvancePerGroup] = useState(2)
  const [legs, setLegs] = useState(1)
  const [thirdPlace, setThirdPlace] = useState(false)
  const [requireProof, setRequireProof] = useState(true)
  const [autoApproveProof, setAutoApproveProof] = useState(true)
  const [coinsWin, setCoinsWin] = useState(50)
  const [coinsChampion, setCoinsChampion] = useState(500)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const isGroups = format === "GROUPS_KNOCKOUT"
  const isLeague = format === "ROUND_ROBIN" || isGroups
  const isKnockout = format === "SINGLE_ELIMINATION"

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      const created = await createTournament({
        name: name.trim(),
        description: description.trim() || undefined,
        game,
        gameLabel: game === "OTHER" ? gameLabel.trim() || undefined : undefined,
        format,
        maxTeams,
        groupCount: isGroups ? groupCount : undefined,
        advancePerGroup: isGroups ? advancePerGroup : undefined,
        legs: isLeague ? legs : 1,
        thirdPlace: isKnockout ? thirdPlace : false,
        requireProof,
        autoApproveProof,
        coinsWin,
        coinsChampion,
      })
      onOpenChange(false)
      onCreated(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o campeonato.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0b12]">
        <DialogHeader>
          <DialogTitle className="text-white">Criar campeonato</DialogTitle>
          <DialogDescription>
            Você vira o dono do campeonato e pode adicionar moderadores depois para ajudar a aprovar resultados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tournament-name">Nome</Label>
            <Input
              id="tournament-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Copa Timbas de Inverno"
              className="border-white/10 bg-white/[0.03]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament-description">Descrição</Label>
            <Textarea
              id="tournament-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Regras, horários, premiação…"
              rows={2}
              className="border-white/10 bg-white/[0.03]"
            />
          </div>

          <div className="space-y-2">
            <Label>Jogo</Label>
            <div className="flex flex-wrap gap-2">
              {GAMES.map((option) => (
                <button
                  key={option}
                  onClick={() => setGame(option)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    game === option
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                  }`}
                >
                  {GAME_LABELS[option]}
                </button>
              ))}
            </div>
            {game === "OTHER" && (
              <Input
                value={gameLabel}
                onChange={(event) => setGameLabel(event.target.value)}
                placeholder="Qual jogo? (ex: Mario Kart)"
                className="mt-2 border-white/10 bg-white/[0.03]"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Formato</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {FORMATS.map((option) => (
                <button
                  key={option}
                  onClick={() => setFormat(option)}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    format === option
                      ? "border-amber-500/30 bg-amber-500/[0.07]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span className={`block text-sm font-bold ${format === option ? "text-amber-400" : "text-white"}`}>
                    {FORMAT_LABELS[option]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                    {FORMAT_DESCRIPTIONS[option]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Máximo de times</Label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => setMaxTeams(count)}
                  className={`h-9 w-14 cursor-pointer rounded-lg border text-sm font-bold transition ${
                    maxTeams === count
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {isGroups && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-count">Quantidade de grupos</Label>
                <Input
                  id="group-count"
                  type="number"
                  min={2}
                  max={8}
                  value={groupCount}
                  onChange={(event) => setGroupCount(Number(event.target.value))}
                  className="border-white/10 bg-white/[0.03]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance-per-group">Classificados por grupo</Label>
                <Input
                  id="advance-per-group"
                  type="number"
                  min={1}
                  max={4}
                  value={advancePerGroup}
                  onChange={(event) => setAdvancePerGroup(Number(event.target.value))}
                  className="border-white/10 bg-white/[0.03]"
                />
              </div>
            </div>
          )}

          {isLeague && (
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <span>
                <span className="block text-sm font-bold text-white">Turno e returno</span>
                <span className="block text-[11px] text-gray-500">Cada confronto acontece duas vezes, ida e volta</span>
              </span>
              <Switch checked={legs === 2} onCheckedChange={(checked) => setLegs(checked ? 2 : 1)} />
            </label>
          )}

          {isKnockout && (
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <span>
                <span className="block text-sm font-bold text-white">Disputa de 3º lugar</span>
                <span className="block text-[11px] text-gray-500">Os perdedores das semifinais decidem o bronze</span>
              </span>
              <Switch checked={thirdPlace} onCheckedChange={setThirdPlace} />
            </label>
          )}

          <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <label className="flex cursor-pointer items-center justify-between">
              <span>
                <span className="block text-sm font-bold text-white">Exigir foto do placar</span>
                <span className="block text-[11px] text-gray-500">Jogadores só lançam resultado com print da tela final</span>
              </span>
              <Switch checked={requireProof} onCheckedChange={setRequireProof} />
            </label>
            <label className="flex cursor-pointer items-center justify-between border-t border-white/[0.05] pt-2">
              <span>
                <span className="block text-sm font-bold text-white">Confirmar automaticamente</span>
                <span className="block text-[11px] text-gray-500">
                  Quando a leitura da foto bater com o placar informado, o resultado entra na hora
                </span>
              </span>
              <Switch checked={autoApproveProof} onCheckedChange={setAutoApproveProof} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coins-win">Moedas por vitória</Label>
              <Input
                id="coins-win"
                type="number"
                min={0}
                value={coinsWin}
                onChange={(event) => setCoinsWin(Number(event.target.value))}
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coins-champion">Moedas para o campeão</Label>
              <Input
                id="coins-champion"
                type="number"
                min={0}
                value={coinsChampion}
                onChange={(event) => setCoinsChampion(Number(event.target.value))}
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11px] text-red-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={busy || name.trim().length < 3}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar campeonato
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
