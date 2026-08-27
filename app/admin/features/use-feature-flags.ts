"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "@/lib/toast"
import { getToken } from "@/lib/auth"
import { clearDashboardAccess } from "@/lib/dashboard-access-store"
import { getFeatureFlags, updateFeatureFlag, type FeatureFlag } from "@/lib/services/feature-flags"

/// A lista de flags é a mesma para a visão geral e para cada categoria, então a
/// busca, o toggle e a limpeza do menu do dashboard ficam num lugar só.
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      setFlags(await getFeatureFlags(token))
      setError("")
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Não foi possível carregar os recursos."
      setError(message)
      toast.error("Erro ao carregar os recursos", { description: message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = useCallback(async (flag: FeatureFlag, enabled: boolean) => {
    setSaving(flag.key)
    try {
      const token = getToken()!
      const updated = await updateFeatureFlag(token, flag.key, enabled)
      // O menu do dashboard monta em cima das flags, então precisa reperguntar.
      clearDashboardAccess()
      setFlags((current) => current.map((item) => (item.key === flag.key ? { ...item, ...updated } : item)))
      toast.success(enabled ? "Recurso ativado" : "Recurso desativado", {
        description: flag.description ?? flag.key,
      })
    } catch (caught) {
      toast.error("Erro ao salvar", { description: caught instanceof Error ? caught.message : undefined })
    } finally {
      setSaving(null)
    }
  }, [])

  return { flags, loading, saving, error, reload: load, toggle }
}

export function formatFlagUpdatedAt(value: string | null) {
  if (!value) return "nunca alterado"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "nunca alterado"
  return `alterado em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`
}
