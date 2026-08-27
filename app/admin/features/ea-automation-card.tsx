"use client"

import { useEffect, useState } from "react"
import { Save, TimerReset } from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { SectionCard } from "@/components/admin/shell"
import { getToken } from "@/lib/auth"
import {
  getTournamentEaAutomationSettings,
  updateTournamentEaAutomationSettings,
  type TournamentEaAutomationSettings,
} from "@/lib/services/feature-flags"

const LIMITS = {
  checkIntervalSeconds: { min: 30, max: 3600 },
  checksPerMinute: { min: 1, max: 10 },
  lookbackMinutes: { min: 0, max: 240 },
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}) {
  const invalid = value < min || value > max

  return (
    <label className="block rounded-xl border border-white/[0.07] bg-black/15 p-3.5">
      <span className="block text-[11.5px] font-black text-white">{label}</span>
      <span className="mt-1 block text-[11px] leading-relaxed text-gray-500">{hint}</span>
      <span className="mt-2.5 flex items-center gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`h-9 border-white/10 bg-black/30 font-mono tabular-nums ${invalid ? "border-red-500/40 text-red-300" : ""}`}
        />
        <span className="flex-shrink-0 text-[11px] font-bold text-gray-600">{suffix}</span>
      </span>
      <span className={`mt-1.5 block text-[10px] ${invalid ? "text-red-400" : "text-gray-600"}`}>
        de {min} a {max}
      </span>
    </label>
  )
}

/// Ritmo da busca automática de partidas na EA. Fica junto dos recursos de
/// competição porque só faz sentido com a busca automática ligada.
export function EaAutomationCard() {
  const [settings, setSettings] = useState<TournamentEaAutomationSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getTournamentEaAutomationSettings(token)
      .then(setSettings)
      .catch((error: unknown) =>
        toast.error("Erro ao carregar a busca automática", {
          description: error instanceof Error ? error.message : undefined,
        }),
      )
  }, [])

  if (!settings) return null

  const outOfRange =
    settings.checkIntervalSeconds < LIMITS.checkIntervalSeconds.min ||
    settings.checkIntervalSeconds > LIMITS.checkIntervalSeconds.max ||
    settings.checksPerMinute < LIMITS.checksPerMinute.min ||
    settings.checksPerMinute > LIMITS.checksPerMinute.max ||
    settings.lookbackMinutes < LIMITS.lookbackMinutes.min ||
    settings.lookbackMinutes > LIMITS.lookbackMinutes.max

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateTournamentEaAutomationSettings(getToken()!, {
        checkIntervalSeconds: settings.checkIntervalSeconds,
        checksPerMinute: settings.checksPerMinute,
        lookbackMinutes: settings.lookbackMinutes,
      })
      setSettings(updated)
      toast.success("Ritmo da busca salvo")
    } catch (error: unknown) {
      toast.error("Erro ao salvar", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      icon={TimerReset}
      accent="cyan"
      title="Ritmo da busca na EA"
      description="Com a busca automática ligada, é isto que define de quanto em quanto tempo o servidor pergunta à EA. A antecedência também vale para a checagem manual."
      action={
        <Button
          disabled={saving || outOfRange}
          onClick={() => void save()}
          className="bg-cyan-500 text-black hover:bg-cyan-400"
        >
          {saving ? <Spinner className="mr-2 size-4" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar ritmo
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Intervalo entre consultas"
          hint="Tempo mínimo até perguntar de novo pela mesma partida."
          suffix="segundos"
          value={settings.checkIntervalSeconds}
          min={LIMITS.checkIntervalSeconds.min}
          max={LIMITS.checkIntervalSeconds.max}
          onChange={(value) => setSettings({ ...settings, checkIntervalSeconds: value })}
        />
        <NumberField
          label="Confrontos por minuto"
          hint="Quantos confrontos diferentes o servidor consulta em cada minuto."
          suffix="por minuto"
          value={settings.checksPerMinute}
          min={LIMITS.checksPerMinute.min}
          max={LIMITS.checksPerMinute.max}
          onChange={(value) => setSettings({ ...settings, checksPerMinute: value })}
        />
        <NumberField
          label="Antecedência aceita"
          hint="Partida jogada antes do horário marcado ainda conta. Com 0, só depois do início."
          suffix="minutos"
          value={settings.lookbackMinutes}
          min={LIMITS.lookbackMinutes.min}
          max={LIMITS.lookbackMinutes.max}
          onChange={(value) => setSettings({ ...settings, lookbackMinutes: value })}
        />
      </div>
    </SectionCard>
  )
}
