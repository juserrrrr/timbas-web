"use client"

import { useDashboardAccess } from "./use-dashboard-access"

/// Chaves das features ligadas, ou null enquanto a resposta não chegou.
export function useEnabledFeatures(): string[] | null {
  return useDashboardAccess()?.features ?? null
}
