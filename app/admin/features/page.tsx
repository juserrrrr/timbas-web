"use client"

import { useEffect, useState } from "react"
import { Save, TimerReset, ToggleRight } from "lucide-react"
import { toast } from "@/lib/toast"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getToken } from "@/lib/auth"
import { getFeatureFlags, getTournamentEaAutomationSettings, updateFeatureFlag, updateTournamentEaAutomationSettings, type FeatureFlag, type TournamentEaAutomationSettings } from "@/lib/services/feature-flags"
import { clearDashboardAccess } from "@/lib/dashboard-access-store"

function formatUpdatedAt(value: string | null) {
  if (!value) return "nunca alterada"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "nunca alterada"
  return `alterada em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`
}

export default function FeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [eaAutomation, setEaAutomation] = useState<TournamentEaAutomationSettings | null>(null)
  const [savingEaAutomation, setSavingEaAutomation] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    Promise.all([getFeatureFlags(token), getTournamentEaAutomationSettings(token)])
      .then(([nextFlags, settings]) => { setFlags(nextFlags); setEaAutomation(settings) })
      .catch((e: unknown) =>
        toast.error("Erro ao carregar as flags", { description: e instanceof Error ? e.message : undefined }),
      )
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (flag: FeatureFlag, enabled: boolean) => {
    setSaving(flag.key)
    try {
      const token = getToken()!
      const updated = await updateFeatureFlag(token, flag.key, enabled)
      // O menu do dashboard monta em cima das flags, então precisa reperguntar.
      clearDashboardAccess()
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, ...updated } : f)))
      toast.success(enabled ? "Recurso ativado" : "Recurso desativado", { description: flag.description ?? flag.key })
    } catch (e: unknown) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(null)
    }
  }

  const saveEaAutomation = async () => {
    if (!eaAutomation) return
    setSavingEaAutomation(true)
    try {
      const updated = await updateTournamentEaAutomationSettings(getToken()!, {
        checkIntervalSeconds: eaAutomation.checkIntervalSeconds,
        checksPerMinute: eaAutomation.checksPerMinute,
        lookbackMinutes: eaAutomation.lookbackMinutes,
      })
      setEaAutomation(updated)
      toast.success("Configuração da busca automática salva")
    } catch (e: unknown) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSavingEaAutomation(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Recursos</h1>
        <p className="mt-1 text-sm text-gray-500">Ligue ou desligue funcionalidades da plataforma sem novo deploy.</p>
      </div>

      <Card className="border-white/[0.06] bg-white/[0.02] p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-5 text-orange-400" />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {flags.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/10 ring-1 ring-orange-500/20">
                    <ToggleRight className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight text-white">{flag.description ?? flag.key}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-600">{flag.key}</p>
                    <p className="mt-1 text-xs text-gray-600">{formatUpdatedAt(flag.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${flag.enabled ? "text-green-400" : "text-gray-600"}`}>
                    {flag.enabled ? "Ativo" : "Desativado"}
                  </span>
                  <Switch
                    checked={flag.enabled}
                    disabled={saving === flag.key}
                    onCheckedChange={(checked) => toggle(flag, checked)}
                    className="cursor-pointer data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {eaAutomation && (
        <Card className="border-cyan-500/15 bg-cyan-500/[0.025] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20"><TimerReset className="h-4 w-4 text-cyan-300" /></div>
            <div><h2 className="font-bold text-white">Busca de partidas na EA</h2><p className="mt-1 text-xs text-gray-500">A frequência depende da flag <code className="text-cyan-300">tournament_ea_auto_sync</code>. A antecedência também vale para a checagem manual.</p></div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-semibold text-gray-300">Intervalo para consultar novamente a mesma partida, em segundos<Input type="number" min={30} max={3600} value={eaAutomation.checkIntervalSeconds} onChange={(event) => setEaAutomation({ ...eaAutomation, checkIntervalSeconds: Number(event.target.value) })} className="mt-2 border-white/10 bg-black/20" /></label>
            <label className="text-xs font-semibold text-gray-300">Máximo de confrontos consultados por minuto<Input type="number" min={1} max={10} value={eaAutomation.checksPerMinute} onChange={(event) => setEaAutomation({ ...eaAutomation, checksPerMinute: Number(event.target.value) })} className="mt-2 border-white/10 bg-black/20" /></label>
            <label className="text-xs font-semibold text-gray-300">Antecedência aceita antes do início, em minutos<Input type="number" min={0} max={240} value={eaAutomation.lookbackMinutes} onChange={(event) => setEaAutomation({ ...eaAutomation, lookbackMinutes: Number(event.target.value) })} className="mt-2 border-white/10 bg-black/20" /><span className="mt-1 block text-[10px] font-normal text-gray-600">0 aceita somente depois do início. 60 aceita até uma hora antes.</span></label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3"><p className="text-[11px] text-gray-600">Valores permitidos: intervalo de 30 a 3600 segundos, limite de 1 a 10 confrontos por minuto e antecedência de 0 a 240 minutos.</p><Button disabled={savingEaAutomation || eaAutomation.checkIntervalSeconds < 30 || eaAutomation.checkIntervalSeconds > 3600 || eaAutomation.checksPerMinute < 1 || eaAutomation.checksPerMinute > 10 || eaAutomation.lookbackMinutes < 0 || eaAutomation.lookbackMinutes > 240} onClick={() => void saveEaAutomation()} className="bg-cyan-500 text-black hover:bg-cyan-400">{savingEaAutomation ? <Spinner className="mr-2 size-4" /> : <Save className="mr-2 h-4 w-4" />}Salvar configuração</Button></div>
        </Card>
      )}
    </div>
  )
}
