export interface DashboardAccess {
  role: string
  permissions: string[]
  features: string[]
}

const SNAPSHOT_KEY = "timbas_dashboard_access"

/**
 * Guarda a resposta de acesso do dashboard fora do módulo que a busca, porque
 * o logout precisa apagá-la e não pode depender da camada de fetch (que já
 * depende do auth). Aqui não entra import nenhum, então não fecha ciclo.
 */
let inFlight: { expiresAt: number; result: Promise<DashboardAccess> } | null = null

export function getInFlight(): Promise<DashboardAccess> | null {
  return inFlight && inFlight.expiresAt > Date.now() ? inFlight.result : null
}

export function setInFlight(result: Promise<DashboardAccess>, freshForMs: number) {
  inFlight = { expiresAt: Date.now() + freshForMs, result }
}

/// Última resposta conhecida, para a primeira pintura não começar em branco.
export function readSnapshot(): DashboardAccess | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DashboardAccess
    if (!Array.isArray(parsed?.permissions) || !Array.isArray(parsed?.features)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSnapshot(access: DashboardAccess) {
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(access))
  } catch {
    // Sem sessionStorage a tela só perde o atalho da primeira pintura.
  }
}

/// Chamado no logout e depois de mexer nas permissões de alguém.
export function clearDashboardAccess() {
  inFlight = null
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    // O cache em memória já foi limpo, é o que importa.
  }
}
