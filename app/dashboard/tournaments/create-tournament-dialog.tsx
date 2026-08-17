"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, Loader2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { advancePerGroupOptions, groupCountOptions, pickOption } from "@/lib/group-plan"
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
const STEPS = ["Identidade", "Formato", "Regras"] as const

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="block text-[11px] leading-snug text-gray-500">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export function CreateTournamentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const [step, setStep] = useState(0)
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
  const [registrationEndsAt, setRegistrationEndsAt] = useState("")
  const [autoStartOnClose, setAutoStartOnClose] = useState(true)
  const [requireProof, setRequireProof] = useState(true)
  const [autoApproveProof, setAutoApproveProof] = useState(true)
  const [coinsWin, setCoinsWin] = useState(50)
  const [coinsChampion, setCoinsChampion] = useState(500)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const isGroups = format === "GROUPS_KNOCKOUT"
  const isLeague = format === "ROUND_ROBIN" || isGroups
  const isKnockout = format === "SINGLE_ELIMINATION" || isGroups
  const canAdvance = step > 0 || name.trim().length >= 3

  const groupOptions = groupCountOptions(maxTeams)
  const activeGroupCount = pickOption(groupOptions, groupCount, 2)
  const advanceOptions = advancePerGroupOptions(maxTeams, activeGroupCount)
  const activeAdvance = pickOption(advanceOptions, advancePerGroup, 1)

  const reset = () => {
    setStep(0)
    setError("")
  }

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
        groupCount: isGroups ? activeGroupCount : undefined,
        advancePerGroup: isGroups ? activeAdvance : undefined,
        legs: isLeague ? legs : 1,
        thirdPlace: isKnockout ? thirdPlace : false,
        registrationEndsAt: registrationEndsAt ? new Date(registrationEndsAt).toISOString() : undefined,
        autoStartOnClose: registrationEndsAt ? autoStartOnClose : false,
        requireProof,
        autoApproveProof,
        coinsWin,
        coinsChampion,
      })
      onOpenChange(false)
      reset()
      onCreated(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o campeonato.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="max-w-xl border-white/10 bg-[#0b0b12]">
        <DialogHeader>
          <DialogTitle className="text-white">Criar campeonato</DialogTitle>
          <DialogDescription>
            Você vira o dono e pode adicionar moderadores depois para ajudar a aprovar resultados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    index <= step ? "text-amber-400" : "text-gray-600"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`h-1 rounded-full transition-colors ${index <= step ? "bg-amber-400" : "bg-white/[0.08]"}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="min-h-[300px] space-y-4 py-1">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tournament-name">Nome do campeonato</Label>
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
                  rows={3}
                  className="border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="space-y-2">
                <Label>Jogo</Label>
                <div className="flex flex-wrap gap-1.5">
                  {GAMES.map((option) => (
                    <Chip key={option} active={game === option} onClick={() => setGame(option)}>
                      {GAME_LABELS[option]}
                    </Chip>
                  ))}
                </div>
                {game === "OTHER" && (
                  <Input
                    value={gameLabel}
                    onChange={(event) => setGameLabel(event.target.value)}
                    placeholder="Qual jogo? (ex: Mario Kart)"
                    className="border-white/10 bg-white/[0.03]"
                  />
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Como o campeonato é disputado</Label>
                <div className="space-y-1.5">
                  {FORMATS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setFormat(option)}
                      className={`w-full cursor-pointer rounded-xl border p-3 text-left transition ${
                        format === option
                          ? "border-amber-500/40 bg-amber-500/[0.07]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                      }`}
                    >
                      <span className={`block text-sm font-bold ${format === option ? "text-amber-300" : "text-white"}`}>
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
                <div className="flex flex-wrap gap-1.5">
                  {TEAM_COUNTS.map((count) => (
                    <Chip key={count} active={maxTeams === count} onClick={() => setMaxTeams(count)}>
                      {count} times
                    </Chip>
                  ))}
                </div>
              </div>

              {isGroups && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Grupos</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {groupOptions.map((count) => (
                        <Chip key={count} active={activeGroupCount === count} onClick={() => setGroupCount(count)}>
                          {count} grupos de {maxTeams / count}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Classificados por grupo</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {advanceOptions.map((count) => (
                        <Chip
                          key={count}
                          active={activeAdvance === count}
                          onClick={() => setAdvancePerGroup(count)}
                        >
                          {count === 1 ? "só o líder" : `${count} primeiros`}
                        </Chip>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {activeGroupCount * activeAdvance} times vão para o mata-mata, e o líder de um grupo cruza
                      com classificado de outro. Só aparecem as divisões que deixam todos os grupos do mesmo
                      tamanho.
                    </p>
                  </div>
                </div>
              )}

              {isLeague && (
                <ToggleRow
                  title="Turno e returno"
                  hint="Cada confronto acontece duas vezes, ida e volta"
                  checked={legs === 2}
                  onChange={(checked) => setLegs(checked ? 2 : 1)}
                />
              )}

              {isKnockout && (
                <ToggleRow
                  title="Disputa de 3º lugar"
                  hint="Os perdedores das semifinais decidem o bronze"
                  checked={thirdPlace}
                  onChange={setThirdPlace}
                />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="registration-ends">Inscrições abertas até</Label>
                <Input
                  id="registration-ends"
                  type="datetime-local"
                  value={registrationEndsAt}
                  onChange={(event) => setRegistrationEndsAt(event.target.value)}
                  className="border-white/10 bg-white/[0.03]"
                />
                <p className="text-[11px] text-gray-600">
                  Deixe vazio para fechar as inscrições na mão quando quiser.
                </p>
              </div>

              {registrationEndsAt && (
                <ToggleRow
                  title="Sortear a chave automaticamente"
                  hint="Ao bater o horário, o campeonato começa sozinho com quem tiver entrado"
                  checked={autoStartOnClose}
                  onChange={setAutoStartOnClose}
                />
              )}

              <ToggleRow
                title="Exigir foto do placar"
                hint="Jogadores só lançam resultado com print da tela final"
                checked={requireProof}
                onChange={setRequireProof}
              />

              <ToggleRow
                title="Confirmar automaticamente"
                hint="Quando a leitura da foto bater com o placar informado, o resultado entra na hora"
                checked={autoApproveProof}
                onChange={setAutoApproveProof}
              />

              <div className="grid gap-3 sm:grid-cols-2">
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
            </>
          )}
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11px] text-red-300">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
            disabled={busy}
          >
            {step === 0 ? (
              "Cancelar"
            ) : (
              <>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar
              </>
            )}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              Continuar
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void submit()}
              disabled={busy || name.trim().length < 3}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Criar campeonato
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
