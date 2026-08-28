"use client"

import {
  clearDashboardAccess,
  getInFlight,
  invalidateDashboardAccess,
  readSnapshot,
  setInFlight,
  writeSnapshot,
  type DashboardAccess,
} from "@/lib/dashboard-access-store"
import { request } from "./http"

export type { DashboardAccess }
export { clearDashboardAccess, readSnapshot as readDashboardAccessSnapshot }

const FRESH_FOR_MS = 30_000

/**
 * O que a pessoa pode ver no dashboard: permissões e flags ligadas.
 *
 * Antes eram duas chamadas separadas e a tela ficava travada esperando as duas.
 * Agora é uma só, dividida por todo mundo que precisa da resposta (o gate, a
 * sidebar, o menu de baixo), e o último resultado fica no sessionStorage para a
 * navegação seguinte pintar na hora enquanto revalida.
 */
export function loadDashboardAccess(): Promise<DashboardAccess> {
  const running = getInFlight()
  if (running) return running

  const result = request<DashboardAccess>("/admin/access/bootstrap")
    .then((access) => {
      writeSnapshot(access)
      return access
    })
    .catch((error) => {
      invalidateDashboardAccess()
      throw error
    })

  setInFlight(result, FRESH_FOR_MS)
  return result
}
