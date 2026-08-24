import { apiFetch } from '../api'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

export const FEATURE_SCREEN_SHARE = 'screen_share'
export const FEATURE_TOURNAMENT_EA_RESULTS = 'tournament_ea_results'
export const FEATURE_TOURNAMENT_AI_RESULTS = 'tournament_ai_results'
export const FEATURE_LIVE_LIMIT_720P_30FPS = 'live_limit_720p_30fps'

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string | null
  updatedAt: string | null
}

const h = (token: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export async function getFeatureFlags(token: string): Promise<FeatureFlag[]> {
  const res = await apiFetch(`${API_URL}/feature-flags`, { headers: h(token), cache: 'no-store' })
  if (!res.ok) throw new Error('Erro ao carregar as feature flags')
  return res.json()
}

export async function updateFeatureFlag(token: string, key: string, enabled: boolean): Promise<FeatureFlag> {
  const res = await apiFetch(`${API_URL}/feature-flags/${key}`, {
    method: 'PATCH',
    headers: h(token),
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) throw new Error('Erro ao atualizar a feature flag')
  return res.json()
}
