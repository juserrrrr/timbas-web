"use client"

import { useDashboardAccess } from "./use-dashboard-access"

/// Cargo de quem está logado, ou null enquanto a resposta não chegou. Serve só
/// para pintar a tela: quem decide o acesso de verdade é a API.
export function useMyRole(): string | null {
  return useDashboardAccess()?.role ?? null
}
