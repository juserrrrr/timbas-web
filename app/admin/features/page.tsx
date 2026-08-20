"use client"

import { useEffect, useState } from "react"
import { ToggleRight } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { getToken } from "@/lib/auth"
import { getFeatureFlags, updateFeatureFlag, type FeatureFlag } from "@/lib/services/feature-flags"

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

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getFeatureFlags(token)
      .then(setFlags)
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
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, ...updated } : f)))
      toast.success(enabled ? "Recurso ativado" : "Recurso desativado", { description: flag.description ?? flag.key })
    } catch (e: unknown) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(null)
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
    </div>
  )
}
