"use client"

import { useEffect, useState } from "react"
import {
  loadDashboardAccess,
  readDashboardAccessSnapshot,
  type DashboardAccess,
} from "@/lib/services/dashboard-bootstrap"

const EMPTY: DashboardAccess = { role: "", permissions: [], features: [] }

/**
 * Permissões e flags de quem está logado, ou null enquanto a primeira resposta
 * não chegou.
 *
 * A diferença entre "ainda não sei" e "sei que está desligada" importa: tratar
 * o estado inicial como lista vazia fazia o menu nascer com tudo bloqueado e
 * destravar meio segundo depois. Com o snapshot da sessão anterior a navegação
 * já começa com a resposta certa na maior parte das vezes.
 */
export function useDashboardAccess(): DashboardAccess | null {
  const [access, setAccess] = useState<DashboardAccess | null>(null)

  useEffect(() => {
    let active = true
    const snapshot = readDashboardAccessSnapshot()
    if (snapshot) setAccess(snapshot)

    void loadDashboardAccess()
      .then((fresh) => { if (active) setAccess(fresh) })
      .catch(() => { if (active && !snapshot) setAccess(EMPTY) })

    return () => { active = false }
  }, [])

  return access
}
