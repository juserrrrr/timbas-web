// Barra final na env var gerava URLs com "//" e o proxy respondia sem CORS
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

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

export interface RoleStat {
  role: string
  games: number
  share: number
}

export interface PlaystyleStats {
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgDamageToChampions: number
  avgVisionScore: number
  avgKillParticipation: number
  avgTeamDragons: number
  avgTeamBarons: number
  avgDragonTakedowns: number
  avgObjectiveSteals: number
  avgEnemyJungleMonsterKills: number
}

export interface MapRegionStats {
  top: number
  mid: number
  bot: number
  alliedJungle: number
  enemyJungle: number
  river: number
  unknown: number
}

export interface MapProfile {
  games: number
  earlyPresence: MapRegionStats
  fightRegions: MapRegionStats
  deathRegions: MapRegionStats
  objectiveFights: number
  invades: number
  startSide?: string // 'topo' | 'baixo' | 'inconclusivo'
  earlyGanksPerGame?: number
  mostVisited: string
  mostFought: string
  mostDeaths: string
  likelyGankFocus: string
}

export interface QueuePerf {
  games: number
  winrate: number
  avgKda: number
  topChampions: QueueChampStat[]
  roleDistribution: RoleStat[]
  playstyle: PlaystyleStats
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
  topPositions?: string[]
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
  mapProfile?: MapProfile
}

export interface PlayerProfileAnalysis {
  summary: string
  fightPattern: string
  objectivePattern: string
  riskPattern: string
  mapPattern: string
  tips: string[]
}

export interface BanSuggestion {
  championId: number
  championName: string
  targetPlayer: string
  reason: string
  priority: number
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

export interface ThreatAssessment {
  riotId: string
  position: string
  level: number // 1 (fraco) a 5 (ameaça extrema)
  reason: string
}

export interface GamePlan {
  winCondition: string
  earlyGame: string
  teamfight: string
  damageProfile: string
  focusTarget: string
  weakLink: string
  threats: ThreatAssessment[]
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
  gamePlan?: GamePlan
}

// ─── Scout API calls (assíncrono via fila) ────────────────────────────────────
//
// O scout roda numa fila no servidor que respeita o rate limit da Riot.
// startScout() retorna na hora com um job; o progresso/resultado vem por
// polling em getScoutJob() — a tela não precisa ficar presa esperando.

export interface ScoutProgress {
  stage: string
  message: string
  percent: number
  current?: number
  total?: number
}

export type ScoutJobStatus = 'queued' | 'running' | 'done' | 'error'

export interface ScoutJob {
  id: string
  riotId: string
  status: ScoutJobStatus
  deep?: boolean
  queuePosition: number
  progress: ScoutProgress
  result?: ScoutResult
  error?: string
  analysisId?: string
}

export interface ScoutHistoryEntry {
  id: string
  teamName: string
  createdAt: string
  searchedRiotId: string | null
  deep: boolean
}

export async function startScout(
  token: string,
  gameName: string,
  tagLine: string,
  deep = false,
): Promise<ScoutJob> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/clash/scout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gameName, tagLine, deep }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

// Retorna null quando o job não existe mais (expirou ou o servidor reiniciou).
export async function getScoutJob(token: string, jobId: string): Promise<ScoutJob | null> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/clash/scout/jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (res.status === 404) return null
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

export async function getRiotPlayerStats(
  token: string,
  gameName: string,
  tagLine: string,
): Promise<{ player: ScoutPlayer; analysis?: PlayerProfileAnalysis }> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const params = new URLSearchParams({ gameName, tagLine })
  const res = await fetch(`${API_URL}/player-stats/riot?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

// Relatórios recentes gerados por qualquer membro — cada scout concluído é
// salvo automaticamente no servidor.
export async function getScoutHistory(token: string, limit = 8): Promise<ScoutHistoryEntry[]> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/clash/analyses/recent?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
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
    cache: 'no-store',
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

export async function saveAnalysis(token: string, data: ScoutResult): Promise<{ id: string }> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/clash/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

export async function fetchSharedAnalysis(id: string): Promise<{ data: ScoutResult; teamName: string; createdAt: string }> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado')
  const res = await fetch(`${API_URL}/clash/analysis/${id}`, { cache: 'no-store' })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)
  return body
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getChampionIconUrl(championName: string, championId?: number): string {
  if (championId !== undefined) {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`
  }
  const specialNames: Record<string, string> = {
    "aurelionsol": "AurelionSol",
    "belveth": "Belveth",
    "chogath": "Chogath",
    "drmundo": "DrMundo",
    "jarvaniv": "JarvanIV",
    "kaisa": "Kaisa",
    "khazix": "Khazix",
    "kogmaw": "KogMaw",
    "ksante": "KSante",
    "leesin": "LeeSin",
    "masteryi": "MasterYi",
    "missfortune": "MissFortune",
    "monkeyking": "MonkeyKing",
    "nunu": "Nunu",
    "reksai": "RekSai",
    "renataglasc": "Renata",
    "tahmkench": "TahmKench",
    "twistedfate": "TwistedFate",
    "velkoz": "Velkoz",
    "wukong": "MonkeyKing",
    "xinzhao": "XinZhao",
  }
  const compact = championName.replace(/[^a-z0-9]/gi, "").toLowerCase()
  const championKey = specialNames[compact] ?? championName.replace(/[^a-z0-9]/gi, "")
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/${championKey}_0.jpg`
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
  if (!rank || rank.tier === 'UNRANKED' || !rank.tier) return 'Sem Rank'
  const tierPt: Record<string, string> = {
    IRON: 'Ferro', BRONZE: 'Bronze', SILVER: 'Prata', GOLD: 'Ouro',
    PLATINUM: 'Platina', EMERALD: 'Esmeralda', DIAMOND: 'Diamante',
    MASTER: 'Mestre', GRANDMASTER: 'Grão-Mestre', CHALLENGER: 'Challenger',
  }
  const name = tierPt[rank.tier] ?? rank.tier
  const div = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank.tier) ? '' : ` ${rank.rank}`
  return `${name}${div} • ${rank.lp} LP`
}
