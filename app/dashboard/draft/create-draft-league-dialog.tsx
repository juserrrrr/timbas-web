"use client"

import { useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createDraftLeague } from "@/lib/services/draft"
import { FORMATIONS, WEEKDAY_LABELS } from "@/lib/services/draft.types"

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
  const [orderType, setOrderType] = useState<"SNAKE" | "LINEAR">("SNAKE")
  const [rosterSize, setRosterSize] = useState(11)
  const [formation, setFormation] = useState("4-3-3")
  const [pickSeconds, setPickSeconds] = useState(120)
  const [matchDays, setMatchDays] = useState<number[]>([0, 3])
  const [matchHour, setMatchHour] = useState(21)
  const [coinsWin, setCoinsWin] = useState(60)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const toggleDay = (day: number) =>
    setMatchDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    )

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      const created = await createDraftLeague({
        name: name.trim(),
        description: description.trim() || undefined,
        orderType,
        rosterSize,
        formation,
        pickSeconds,
        matchDays,
        matchHour,
        coinsWin,
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
            Você vira o dono da liga. Depois de criar, importe o pool de jogadores e abra as inscrições.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="league-name">Nome</Label>
            <Input
              id="league-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Draft do Brasileirão Timbas"
              className="border-white/10 bg-white/[0.03]"
            />
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label>Ordem das escolhas</Label>
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
                  <span className={`block text-sm font-bold ${orderType === option.id ? "text-emerald-400" : "text-white"}`}>
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="roster-size">Jogadores por elenco</Label>
              <Input
                id="roster-size"
                type="number"
                min={1}
                max={26}
                value={rosterSize}
                onChange={(event) => setRosterSize(Number(event.target.value))}
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pick-seconds">Tempo por escolha (s)</Label>
              <Input
                id="pick-seconds"
                type="number"
                min={15}
                max={3600}
                value={pickSeconds}
                onChange={(event) => setPickSeconds(Number(event.target.value))}
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-hour">Horário das rodadas</Label>
              <Input
                id="match-hour"
                type="number"
                min={0}
                max={23}
                value={matchHour}
                onChange={(event) => setMatchHour(Number(event.target.value))}
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dias de rodada</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={label}
                  onClick={() => toggleDay(day)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    matchDays.includes(day)
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-600">
              As rodadas são agendadas automaticamente nesses dias assim que o draft terminar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Formação padrão</Label>
            <div className="flex flex-wrap gap-2">
              {FORMATIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setFormation(option)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    formation === option
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-coins-win">Moedas por vitória na rodada</Label>
            <Input
              id="draft-coins-win"
              type="number"
              min={0}
              value={coinsWin}
              onChange={(event) => setCoinsWin(Number(event.target.value))}
              className="border-white/10 bg-white/[0.03]"
            />
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
