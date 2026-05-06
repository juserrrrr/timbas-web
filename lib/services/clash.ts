const API_URL = process.env.NEXT_PUBLIC_API_URL

// ─── Scout types ──────────────────────────────────────────────────────────────

export interface RankInfo {
  tier: string
  rank: string
  lp: number
  wins?: number
  losses?: number
}

export interface QueueChampStat {
  championId: number
  championName: string
  games: number
  wins: number
  winrate: number
  kda: number
}

export interface QueuePerf {
  games: number
  winrate: number
  avgKda: number
  topChampions: QueueChampStat[]
}

export interface MasteryChamp {
  championId: number
  championName: string
  masteryLevel: number
  masteryPoints: number
}

export interface ScoutPlayer {
  riotId: string
  position: string
  profileIconId: number
  profileIconUrl: string
  soloRank: RankInfo
  flexRank: RankInfo
  soloSeasonWinrate: number
  flexSeasonWinrate: number
  masteryTop10: MasteryChamp[]
  soloQueue: QueuePerf
  flexQueue: QueuePerf
  clashHistory: QueuePerf
  combinedTopChamps: QueueChampStat[]
}

export interface BanSuggestion {
  championId: number
  championName: string
  targetPlayer: string
  reason: string
  priority: 1 | 2 | 3 | 4 | 5
}

export interface CounterplayAdvice {
  riotId: string
  position: string
  likelyPick: string
  howToCounter: string
  keyThreats: string[]
}

export interface PredictedPick {
  riotId: string
  position: string
  option1: { champion: string; reason: string }
  option2: { champion: string; reason: string }
}

export interface ScoutResult {
  team: {
    id: string
    name: string
    abbreviation: string
    iconId: number
    tier: number
  }
  players: ScoutPlayer[]
  bans: BanSuggestion[]
  counterplays: CounterplayAdvice[]
  predictedPicks: PredictedPick[]
  strategy: string
}

// ─── Scout API call ───────────────────────────────────────────────────────────

export async function scout(
  token: string,
  gameName: string,
  tagLine: string,
): Promise<ScoutResult> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const params = new URLSearchParams({ gameName, tagLine })
  const res = await fetch(`${API_URL}/clash/scout?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

// ─── Verify API calls (usados em /dashboard/verify) ──────────────────────────

export async function getVerifyStatus(token: string): Promise<{ verified: boolean; riotId?: string; verifiedAt?: string }> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/verify/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Falha ao buscar status')
  return res.json()
}

export async function startVerification(token: string, riotId: string): Promise<{
  pendingId: string
  targetIconId: number
  iconUrl: string
  expiresAt: string
  message: string
}> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/verify/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ riotId }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

export async function confirmVerification(token: string, pendingId: string): Promise<{ message: string; riotId: string }> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/verify/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pendingId }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

export async function unlinkAccount(token: string): Promise<{ message: string }> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/verify/unlink`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getChampionIconUrl(championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/${championName}.png`
}

export function getRankColor(tier: string): string {
  const t = tier?.toUpperCase()
  if (t === 'IRON') return 'text-gray-400'
  if (t === 'BRONZE') return 'text-amber-700'
  if (t === 'SILVER') return 'text-slate-300'
  if (t === 'GOLD') return 'text-amber-400'
  if (t === 'PLATINUM') return 'text-teal-400'
  if (t === 'EMERALD') return 'text-emerald-400'
  if (t === 'DIAMOND') return 'text-blue-400'
  if (t === 'MASTER') return 'text-purple-400'
  if (t === 'GRANDMASTER') return 'text-red-400'
  if (t === 'CHALLENGER') return 'text-sky-300'
  return 'text-gray-500'
}

export function getRankBg(tier: string): string {
  const t = tier?.toUpperCase()
  if (t === 'IRON') return 'bg-gray-500/10 border-gray-500/20'
  if (t === 'BRONZE') return 'bg-amber-800/10 border-amber-800/20'
  if (t === 'SILVER') return 'bg-slate-400/10 border-slate-400/20'
  if (t === 'GOLD') return 'bg-amber-400/10 border-amber-400/20'
  if (t === 'PLATINUM') return 'bg-teal-400/10 border-teal-400/20'
  if (t === 'EMERALD') return 'bg-emerald-400/10 border-emerald-400/20'
  if (t === 'DIAMOND') return 'bg-blue-400/10 border-blue-400/20'
  if (t === 'MASTER') return 'bg-purple-400/10 border-purple-400/20'
  if (t === 'GRANDMASTER') return 'bg-red-400/10 border-red-400/20'
  if (t === 'CHALLENGER') return 'bg-sky-300/10 border-sky-300/20'
  return 'bg-white/5 border-white/10'
}

export function formatRank(rank: RankInfo): string {
  if (!rank || rank.tier === 'UNRANKED' || !rank.tier) return 'Unranked'
  const tierPt: Record<string, string> = {
    IRON: 'Ferro', BRONZE: 'Bronze', SILVER: 'Prata', GOLD: 'Ouro',
    PLATINUM: 'Platina', EMERALD: 'Esmeralda', DIAMOND: 'Diamante',
    MASTER: 'Mestre', GRANDMASTER: 'Grão-Mestre', CHALLENGER: 'Challenger',
  }
  const name = tierPt[rank.tier] ?? rank.tier
  const div = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank.tier) ? '' : ` ${rank.rank}`
  return `${name}${div} • ${rank.lp} LP`
}
