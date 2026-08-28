"use client"

import { useEffect, useSyncExternalStore } from "react"
import {
  getAccess,
  getServerAccess,
  setAccess,
  subscribeAccess,
  type DashboardAccess,
} from "@/lib/dashboard-access-store"
import { loadDashboardAccess } from "@/lib/services/dashboard-bootstrap"

const EMPTY: DashboardAccess = { role: "", permissions: [], features: [] }

/**
 * Permissões e flags de quem está logado, ou null enquanto a primeira resposta
 * não chegou.
 *
 * A diferença entre "ainda não sei" e "sei que está desligada" importa: tratar
 * o estado inicial como lista vazia fazia o menu nascer com tudo bloqueado e
 * destravar meio segundo depois.
 *
 * A resposta vive numa store única em vez de um useState por componente. Com
 * estado local, trocar de rota remontava o gate, o valor voltava para null e a
 * área de conteúdo apagava por um quadro antes da tela nova aparecer.
 */
export function useDashboardAccess(): DashboardAccess | null {
  const access = useSyncExternalStore(subscribeAccess, getAccess, getServerAccess)

  useEffect(() => {
    void loadDashboardAccess().catch(() => {
      if (!getAccess()) setAccess(EMPTY)
    })
  }, [])

  return access
}
