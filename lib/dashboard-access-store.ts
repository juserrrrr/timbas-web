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

/**
 * A resposta em uso agora, compartilhada por todo mundo que a lê.
 *
 * Antes cada tela guardava isso no próprio useState, então qualquer componente
 * que remontasse voltava para "ainda não sei" e a área de conteúdo piscava
 * vazia no meio da navegação. Com o valor aqui fora, quem monta depois já nasce
 * com a mesma resposta que o resto do app está usando.
 */
let access: DashboardAccess | null = null
let accessLoaded = false
const listeners = new Set<() => void>()

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

/**
 * O que as telas leem. Precisa devolver sempre o mesmo objeto enquanto nada
 * muda, senão o useSyncExternalStore entende como valor novo e re-renderiza
 * sem parar, então o sessionStorage é lido uma vez só.
 */
export function getAccess(): DashboardAccess | null {
  if (!accessLoaded) {
    accessLoaded = true
    access = readSnapshot()
  }
  return access
}

/// No servidor não existe sessionStorage, e a hidratação precisa começar pelo
/// mesmo valor que gerou o HTML.
export function getServerAccess(): DashboardAccess | null {
  return null
}

export function setAccess(next: DashboardAccess | null) {
  accessLoaded = true
  if (access === next) return
  access = next
  for (const listener of listeners) listener()
}

export function subscribeAccess(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function writeSnapshot(fresh: DashboardAccess) {
  setAccess(fresh)
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(fresh))
  } catch {
    // Sem sessionStorage a tela só perde o atalho da primeira pintura.
  }
}

/**
 * A busca falhou. Joga fora o que estava guardado para a próxima tentativa sair
 * de novo, mas mantém na tela a resposta que já estava valendo: um erro de rede
 * no meio do caminho não pode apagar o conteúdo de quem está navegando.
 */
export function invalidateDashboardAccess() {
  inFlight = null
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    // O cache em memória já foi limpo, é o que importa.
  }
}

/// Chamado no logout e depois de mexer nas permissões de alguém.
export function clearDashboardAccess() {
  invalidateDashboardAccess()
  setAccess(null)
}
