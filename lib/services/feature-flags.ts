import { apiFetch } from '../api'
import { API_URL } from '../api-base'


export const FEATURE_SCREEN_SHARE = 'screen_share'
export const FEATURE_TOURNAMENT_EA_RESULTS = 'tournament_ea_results'
export const FEATURE_TOURNAMENT_EA_AUTO_SYNC = 'tournament_ea_auto_sync'
export const FEATURE_TOURNAMENT_AI_RESULTS = 'tournament_ai_results'
export const FEATURE_LIVE_LIMIT_720P_30FPS = 'live_limit_720p_30fps'
export const FEATURE_DASHBOARD_HOME = 'dashboard_home'
export const FEATURE_DASHBOARD_TOURNAMENTS = 'dashboard_tournaments'
export const FEATURE_DASHBOARD_DRAFT = 'dashboard_draft'
export const FEATURE_DASHBOARD_MATCHES_LIVE = 'dashboard_matches_live'
export const FEATURE_DASHBOARD_MATCHES_RANKING = 'dashboard_matches_ranking'
export const FEATURE_DASHBOARD_MATCHES_HISTORY = 'dashboard_matches_history'
export const FEATURE_DASHBOARD_MATCHES_TEAMS = 'dashboard_matches_teams'
export const FEATURE_DASHBOARD_MATCHES_STATS = 'dashboard_matches_stats'
export const FEATURE_DASHBOARD_MATCHES_VERSUS = 'dashboard_matches_versus'
export const FEATURE_DASHBOARD_EA = 'dashboard_ea_clubs'
export const FEATURE_DASHBOARD_CLASH = 'dashboard_clash'
export const FEATURE_DASHBOARD_LOL_VERIFY = 'dashboard_lol_verify'
export const FEATURE_DASHBOARD_LOL_PROFILE = 'dashboard_lol_profile'
export const FEATURE_DASHBOARD_SETTINGS = 'dashboard_settings'
export const FEATURE_DASHBOARD_GAMES = 'dashboard_games'
export const FEATURE_GAME_DEDUCAO = 'game_deducao'

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string | null
  updatedAt: string | null
}

export interface TournamentEaAutomationSettings {
  id: number
  checkIntervalSeconds: number
  checksPerMinute: number
  lookbackMinutes: number
  updatedByDiscordId: string | null
  updatedAt: string | null
}

let flagsCache: { expiresAt: number; request: Promise<FeatureFlag[]> } | null = null

const h = (token: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export async function getFeatureFlags(token: string): Promise<FeatureFlag[]> {
  if (flagsCache && flagsCache.expiresAt > Date.now()) return flagsCache.request
  const request = apiFetch(`${API_URL}/feature-flags`, { headers: h(token), cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error('Erro ao carregar as feature flags')
      return res.json() as Promise<FeatureFlag[]>
    })
    .catch((error) => {
      flagsCache = null
      throw error
    })
  flagsCache = { expiresAt: Date.now() + 30_000, request }
  return request
}

export async function updateFeatureFlag(token: string, key: string, enabled: boolean): Promise<FeatureFlag> {
  const res = await apiFetch(`${API_URL}/feature-flags/${key}`, {
    method: 'PATCH',
    headers: h(token),
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) throw new Error('Erro ao atualizar a feature flag')
  flagsCache = null
  return res.json()
}

export async function getTournamentEaAutomationSettings(token: string): Promise<TournamentEaAutomationSettings> {
  const res = await apiFetch(`${API_URL}/feature-flags/tournament-ea/automation`, {
    headers: h(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Erro ao carregar a configuração da busca automática')
  return res.json()
}

export async function updateTournamentEaAutomationSettings(
  token: string,
  input: Pick<TournamentEaAutomationSettings, 'checkIntervalSeconds' | 'checksPerMinute' | 'lookbackMinutes'>,
): Promise<TournamentEaAutomationSettings> {
  const res = await apiFetch(`${API_URL}/feature-flags/tournament-ea/automation`, {
    method: 'PATCH',
    headers: h(token),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Erro ao salvar a configuração da busca automática')
  return res.json()
}
