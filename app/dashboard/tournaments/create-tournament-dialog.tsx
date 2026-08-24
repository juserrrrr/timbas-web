"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Check, Loader2, LockKeyhole, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { advancePerGroupOptions, groupCountOptions, pickOption } from "@/lib/group-plan"
import { createTournament } from "@/lib/services/tournaments"
import { getToken } from "@/lib/auth"
import { FEATURE_TOURNAMENT_AI_RESULTS, FEATURE_TOURNAMENT_EA_RESULTS, getFeatureFlags } from "@/lib/services/feature-flags"
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
  const [privateTournament, setPrivateTournament] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState("")
  const [format, setFormat] = useState<TournamentFormat>("SINGLE_ELIMINATION")
  const [maxTeams, setMaxTeams] = useState(8)
  const [groupCount, setGroupCount] = useState(2)
  const [advancePerGroup, setAdvancePerGroup] = useState(2)
  const [legs, setLegs] = useState(1)
  const [thirdPlace, setThirdPlace] = useState(false)
  const [registrationEndsAt, setRegistrationEndsAt] = useState("")
  const [autoStartOnClose, setAutoStartOnClose] = useState(true)
  const [startsAt, setStartsAt] = useState("")
  const [deadlineMode, setDeadlineMode] = useState<"FAST" | "FLEXIBLE">("FAST")
  const [matchWindowMinutes, setMatchWindowMinutes] = useState(10)
  const [woAfterHours, setWoAfterHours] = useState(72)
  const [graceMinutes, setGraceMinutes] = useState(5)
  const [requireProof, setRequireProof] = useState(true)
  const [autoApproveProof, setAutoApproveProof] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [eaApiEnabled, setEaApiEnabled] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)

  useEffect(() => {
    if (!open) return
    const token = getToken()
    if (!token) return
    void getFeatureFlags(token).then((flags) => {
      setEaApiEnabled(Boolean(flags.find((flag) => flag.key === FEATURE_TOURNAMENT_EA_RESULTS)?.enabled))
      setAiEnabled(Boolean(flags.find((flag) => flag.key === FEATURE_TOURNAMENT_AI_RESULTS)?.enabled))
    })
  }, [open])

  const isGroups = format === "GROUPS_KNOCKOUT"
  const isLeague = format === "ROUND_ROBIN" || isGroups
  const isKnockout = format === "SINGLE_ELIMINATION" || isGroups
  const canAdvance = step > 0 || name.trim().length >= 3

  const groupOptions = groupCountOptions(maxTeams)
  const activeGroupCount = pickOption(groupOptions, groupCount, 2)
  const advanceOptions = advancePerGroupOptions(maxTeams, activeGroupCount)
  const activeAdvance = pickOption(advanceOptions, advancePerGroup, 1)
  const scheduleIssue = !registrationEndsAt
    ? "Defina o fim das inscrições."
    : !startsAt
      ? "Defina o início do campeonato."
      : new Date(startsAt).getTime() <= new Date(registrationEndsAt).getTime()
        ? "O campeonato precisa começar depois do fim das inscrições."
        : ""

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
        accessMode: privateTournament ? "INVITE_ONLY" : "PUBLIC",
        invitedUsernames: privateTournament
          ? invitedUsers.split(",").map((value) => value.trim()).filter(Boolean)
          : undefined,
        format,
        maxTeams,
        groupCount: isGroups ? activeGroupCount : undefined,
        advancePerGroup: isGroups ? activeAdvance : undefined,
        legs: isLeague ? legs : 1,
        thirdPlace: isKnockout ? thirdPlace : false,
        registrationEndsAt: registrationEndsAt ? new Date(registrationEndsAt).toISOString() : undefined,
        autoStartOnClose: registrationEndsAt ? autoStartOnClose : false,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        matchWindowMinutes: deadlineMode === "FAST" ? matchWindowMinutes : 0,
        woAfterHours: deadlineMode === "FLEXIBLE" ? woAfterHours : 0,
        graceMinutes,
        requireProof: game === "EA_FC" && eaApiEnabled ? false : aiEnabled ? true : requireProof,
        autoApproveProof: game === "EA_FC" && eaApiEnabled ? false : aiEnabled ? autoApproveProof : false,
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-white/10 bg-[#0b0b12]">
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

              <ToggleRow
                title="Campeonato fechado"
                hint="Só entra quem receber o link ou for convidado pelo nome de usuário"
                checked={privateTournament}
                onChange={setPrivateTournament}
              />
              {privateTournament && (
                <div className="space-y-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
                  <Label htmlFor="invited-users" className="flex items-center gap-1.5">
                    <LockKeyhole className="h-3.5 w-3.5 text-amber-400" />
                    Convidar usuários agora
                  </Label>
                  <Input
                    id="invited-users"
                    value={invitedUsers}
                    onChange={(event) => setInvitedUsers(event.target.value)}
                    placeholder="nome1, nome2, nome3"
                    className="border-white/10 bg-white/[0.03]"
                  />
                  <p className="text-[11px] text-gray-500">
                    Use o nome exato do perfil, separado por vírgula. Você também poderá copiar o link do convite depois.
                  </p>
                </div>
              )}
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
                <Label htmlFor="tournament-starts">Início do campeonato <span className="text-red-400">*</span></Label>
                <Input id="tournament-starts" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="border-white/10 bg-white/[0.03]" />
                <p className="text-[11px] text-gray-600">A chave pode abrir antes, mas o cronômetro só começa neste horário.</p>
              </div>

              <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <Label>Ritmo das partidas</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Chip active={deadlineMode === "FAST"} onClick={() => setDeadlineMode("FAST")}>Chave rápida</Chip>
                  <Chip active={deadlineMode === "FLEXIBLE"} onClick={() => setDeadlineMode("FLEXIBLE")}>Prazo amplo</Chip>
                </div>
                {deadlineMode === "FAST" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label htmlFor="match-window">Minutos por confronto</Label><Input id="match-window" type="number" min={1} max={10080} value={matchWindowMinutes} onChange={(event) => setMatchWindowMinutes(Number(event.target.value))} className="border-white/10 bg-white/[0.03]" /></div>
                    <div className="space-y-1.5"><Label htmlFor="grace-window">Tolerância por time</Label><Input id="grace-window" type="number" min={0} max={60} value={graceMinutes} onChange={(event) => setGraceMinutes(Number(event.target.value))} className="border-white/10 bg-white/[0.03]" /></div>
                  </div>
                ) : (
                  <div className="space-y-1.5"><Label htmlFor="wo-hours">Horas para jogar</Label><Input id="wo-hours" type="number" min={1} max={720} value={woAfterHours} onChange={(event) => setWoAfterHours(Number(event.target.value))} className="border-white/10 bg-white/[0.03]" /></div>
                )}
                <p className="text-[11px] text-gray-500">Na chave rápida, o prazo só começa quando os dois times estiverem definidos. Cada time pode pedir tolerância uma vez por confronto.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration-ends">Inscrições abertas até <span className="text-red-400">*</span></Label>
                <Input
                  id="registration-ends"
                  type="datetime-local"
                  value={registrationEndsAt}
                  onChange={(event) => setRegistrationEndsAt(event.target.value)}
                  className="border-white/10 bg-white/[0.03]"
                />
                <p className="text-[11px] text-gray-600">
                  Obrigatório. Depois desse horário não entram novos times.
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

              {game === "EA_FC" && eaApiEnabled ? (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3"><p className="text-sm font-bold text-blue-200">Resultados pela API da EA</p><p className="mt-1 text-[11px] text-gray-500">Os jogadores usam Checar na EA. Placar, atletas e estatísticas são sincronizados automaticamente.</p></div>
              ) : aiEnabled ? <><ToggleRow
                title="Exigir foto do placar"
                hint="Jogadores só lançam resultado com print da tela final"
                checked={requireProof}
                onChange={setRequireProof}
              />

              <ToggleRow
                title="Confirmar automaticamente"
                hint="Só confirma quando a foto bate com o placar e a IA tem pelo menos 90% de confiança"
                checked={autoApproveProof}
                onChange={setAutoApproveProof}
              /></> : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3"><p className="text-sm font-bold text-amber-200">Resultado manual</p><p className="mt-1 text-[11px] text-gray-500">Como API e IA estão desligadas, um time informa o placar e o adversário confirma.</p></div>
              )}

              {scheduleIssue && <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11px] font-bold text-red-300">{scheduleIssue}</p>}

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
              disabled={busy || name.trim().length < 3 || Boolean(scheduleIssue)}
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
