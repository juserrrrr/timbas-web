"use client"

import { useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { brasiliaLocalToIso } from "@/lib/date-time"
import { createDraftLeague } from "@/lib/services/draft"
import {
  FORMATIONS,
  RESULT_MODE_HINTS,
  RESULT_MODE_LABELS,
  START_MODE_HINTS,
  START_MODE_LABELS,
  WEEKDAY_LABELS,
  type DraftResultMode,
  type DraftStartMode,
} from "@/lib/services/draft.types"

// Padrões de uma liga de manager: rodada duas vezes por semana à noite e
// configuração simples o bastante para a temporada começar sem burocracia.
const DEFAULTS = {
  orderType: "SNAKE" as const,
  resultMode: "REPORTED" as DraftResultMode,
  rosterSize: 25,
  formation: "4-3-3",
  pickSeconds: 120,
  matchDays: [0, 3],
  matchHour: 21,
  pointsWin: 3,
  pointsDraw: 1,
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{title}</h3>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-gray-600">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  min = 0,
  max,
  step,
}: {
  id: string
  label: string
  hint?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="border-white/10 bg-white/[0.03]"
      />
      {hint && <p className="text-[11px] leading-snug text-gray-600">{hint}</p>}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

export function CreateDraftLeagueDialog({
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
  const [resultMode, setResultMode] = useState<DraftResultMode>(DEFAULTS.resultMode)
  const [orderType, setOrderType] = useState<"SNAKE" | "LINEAR">(DEFAULTS.orderType)
  const [startMode, setStartMode] = useState<DraftStartMode>("LIVE")
  const [draftStartsAt, setDraftStartsAt] = useState("")
  const [rosterSize, setRosterSize] = useState(DEFAULTS.rosterSize)
  const [formation, setFormation] = useState(DEFAULTS.formation)
  const [pickSeconds, setPickSeconds] = useState(DEFAULTS.pickSeconds)
  const [matchDays, setMatchDays] = useState<number[]>(DEFAULTS.matchDays)
  const [matchHour, setMatchHour] = useState(DEFAULTS.matchHour)
  const [pointsWin, setPointsWin] = useState(DEFAULTS.pointsWin)
  const [pointsDraw, setPointsDraw] = useState(DEFAULTS.pointsDraw)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const toggleDay = (day: number) =>
    setMatchDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((first, second) => first - second),
    )

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      const created = await createDraftLeague({
        name: name.trim(),
        description: description.trim() || undefined,
        resultMode,
        orderType,
        startMode,
        draftStartsAt: draftStartsAt ? brasiliaLocalToIso(draftStartsAt) : undefined,
        rosterSize,
        formation,
        pickSeconds,
        matchDays,
        matchHour,
        startingBudget: 0,
        paySalaries: false,
        marketAutoManaged: false,
        pointsWin,
        pointsDraw,
        coinsWin: 0,
        coinsDraw: 0,
        coinsLoss: 0,
        auctionsEnabled: false,
      })
      onOpenChange(false)
      onCreated(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a liga.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0b12]">
        <DialogHeader>
          <DialogTitle className="text-white">Criar liga de draft</DialogTitle>
          <DialogDescription>
            Você vira o dono da liga. Tudo aqui já vem com um padrão que funciona, e nada disso fica travado: dá para
            mudar depois na gestão da liga.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Section title="Identidade">
            <div className="space-y-1.5">
              <Label htmlFor="league-name">Nome</Label>
              <Input
                id="league-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Draft do Brasileirão Timbas"
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="league-description">Descrição</Label>
              <Textarea
                id="league-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Regras da temporada, premiação, combinados…"
                rows={2}
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
          </Section>

          <Section title="Como o resultado entra" hint="É o que separa a liga de manager da liga simulada.">
            <div className="grid gap-2">
              {(["REPORTED", "SIMULATED"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setResultMode(mode)}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    resultMode === mode
                      ? "border-emerald-500/30 bg-emerald-500/[0.07]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${resultMode === mode ? "text-emerald-400" : "text-white"}`}
                  >
                    {RESULT_MODE_LABELS[mode]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                    {RESULT_MODE_HINTS[mode]}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section
            title="Calendário"
            hint="As rodadas são marcadas nesses dias e nesse horário assim que o draft terminar."
          >
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, day) => (
                <Chip key={label} active={matchDays.includes(day)} onClick={() => toggleDay(day)}>
                  {label}
                </Chip>
              ))}
            </div>
            <NumberField
              id="match-hour"
              label="Horário das rodadas"
              value={matchHour}
              onChange={setMatchHour}
              min={0}
              max={23}
              hint="Hora cheia, no fuso do servidor."
            />
          </Section>

          <Section title="Draft">
            <div className="grid gap-2">
              {(["LIVE", "ASYNC"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setStartMode(mode)}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    startMode === mode
                      ? "border-emerald-500/30 bg-emerald-500/[0.07]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${startMode === mode ? "text-emerald-400" : "text-white"}`}
                  >
                    {START_MODE_LABELS[mode]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                    {START_MODE_HINTS[mode]}
                  </span>
                </button>
              ))}
            </div>

            {startMode === "LIVE" && (
              <div className="space-y-1.5">
                <Label htmlFor="draft-starts">Hora marcada do draft</Label>
                <Input
                  id="draft-starts"
                  type="datetime-local"
                  value={draftStartsAt}
                  onChange={(event) => setDraftStartsAt(event.target.value)}
                  className="border-white/10 bg-white/[0.03]"
                />
                <p className="text-[11px] leading-snug text-gray-600">
                  Opcional. Com hora marcada, o draft não abre antes dela mesmo com todos prontos.
                </p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    id: "SNAKE" as const,
                    title: "Snake",
                    hint: "A ordem inverte a cada rodada. Quem escolhe por último abre a rodada seguinte.",
                  },
                  {
                    id: "LINEAR" as const,
                    title: "Linear",
                    hint: "A mesma ordem se repete em todas as rodadas do draft.",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  onClick={() => setOrderType(option.id)}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    orderType === option.id
                      ? "border-emerald-500/30 bg-emerald-500/[0.07]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${orderType === option.id ? "text-emerald-400" : "text-white"}`}
                  >
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{option.hint}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                id="roster-size"
                label="Jogadores por elenco"
                value={rosterSize}
                onChange={setRosterSize}
                min={11}
                max={26}
                hint="25 é o elenco do EA FC: 11 em campo, 7 no banco e o resto de reserva. Mínimo de 11, que é o time."
              />
              <NumberField
                id="pick-seconds"
                label="Tempo por escolha (s)"
                value={pickSeconds}
                onChange={setPickSeconds}
                min={15}
                max={3600}
                hint="Estourando o tempo, o servidor escolhe o melhor disponível."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Formação padrão</Label>
              <div className="flex flex-wrap gap-2">
                {FORMATIONS.map((option) => (
                  <Chip key={option} active={formation === option} onClick={() => setFormation(option)}>
                    {option}
                  </Chip>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Pontuação" hint="Defina como os resultados movimentam a tabela da temporada.">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                id="points-win"
                label="Pontos por vitória"
                value={pointsWin}
                onChange={setPointsWin}
                max={10}
              />
              <NumberField id="points-draw" label="Pontos por empate" value={pointsDraw} onChange={setPointsDraw} max={10} />
            </div>
          </Section>

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
              disabled={busy || name.trim().length < 3 || matchDays.length === 0}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar liga
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
