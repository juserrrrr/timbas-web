"use client"

import { useDashboardAccess } from "./use-dashboard-access"

export function useMyPermissions(): string[] | null {
  return useDashboardAccess()?.permissions ?? null
}
