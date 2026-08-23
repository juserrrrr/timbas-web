import { apiFetch } from '../api'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

export interface StreamSummary {
  id: string
  slug: string
  title: string
  hostName: string
  hostAvatar: string | null
  hostDiscordId: string | null
  visibility: 'MEMBERS' | 'PUBLIC'
  startedAt: string
  viewers: number
  live: boolean
  /** Only filled by the stream list: the logged in user owns this live. */
  isHost?: boolean
}

export interface StreamPeer {
  peerId: string
  name: string
}

export interface JoinStreamResult {
  peerId: string
  role: 'host' | 'viewer'
  hostPeerId: string | null
  viewers: StreamPeer[]
  stream: StreamSummary
  /** True when the API has an SFU configured, so media goes through it. */
  sfu?: boolean
  /** The logged in user owns this live, even if they joined to watch. */
  owner?: boolean
}

/**
 * Eventos do canal SSE. A mídia não passa mais por aqui: o servidor de
 * transmissão cuida disso. Sobrou presença e ciclo de vida da live.
 */
export interface SignalEvent {
  type: 'ready' | 'viewer_joined' | 'viewer_left' | 'viewers' | 'host_ready' | 'host_unavailable' | 'stream_ended'
  from?: string
  payload?: any
}

const h = (token: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? fallback)
  }
  return res.json()
}

export async function getStreamPermission(
  token: string,
): Promise<{ canStream: boolean; featureEnabled: boolean; sfu?: boolean }> {
  const res = await apiFetch(`${API_URL}/streaming/permission`, { headers: h(token), cache: 'no-store' })
  if (res.status === 403) return { canStream: false, featureEnabled: false }
  return parse(res, 'Erro ao verificar permissão')
}

export async function listStreams(token: string): Promise<StreamSummary[]> {
  const res = await apiFetch(`${API_URL}/streaming/streams`, { headers: h(token), cache: 'no-store' })
  return parse(res, 'Erro ao carregar as transmissões')
}

export async function createStream(
  token: string,
  title: string | undefined,
  guildId: string,
  visibility: 'MEMBERS' | 'PUBLIC',
): Promise<StreamSummary> {
  const res = await apiFetch(`${API_URL}/streaming/streams`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ ...(title ? { title } : {}), guildId, visibility }),
  })
  return parse(res, 'Erro ao criar a transmissão')
}

export async function getStreamViewers(token: string, streamId: string): Promise<StreamPeer[]> {
  const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}/viewers`, { headers: h(token), cache: 'no-store' })
  return parse(res, 'Could not load stream viewers')
}

export async function startStream(token: string, streamId: string): Promise<StreamSummary> {
  const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}/start`, {
    method: 'POST',
    headers: h(token),
  })
  return parse(res, 'Erro ao iniciar a transmissÃ£o')
}

export async function updateStreamVisibility(
  token: string,
  streamId: string,
  visibility: 'MEMBERS' | 'PUBLIC',
): Promise<StreamSummary> {
  const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}`, {
    method: 'PATCH',
    headers: h(token),
    body: JSON.stringify({ visibility }),
  })
  return parse(res, 'Could not update stream privacy')
}

export interface PublicJoinStreamResult {
  peerId: string
  guestToken: string
  hostPeerId: string | null
  stream: StreamSummary
  sfu?: boolean
}

const LIVE_CLIENT_ID_KEY = 'timbas_live_client_id'

export function getLiveClientId(): string {
  if (typeof window === 'undefined') return ''
  const current = window.sessionStorage.getItem(LIVE_CLIENT_ID_KEY)
  if (current) return current

  const clientId = crypto.randomUUID()
  window.sessionStorage.setItem(LIVE_CLIENT_ID_KEY, clientId)
  return clientId
}

export async function joinPublicStream(streamId: string, clientId: string): Promise<PublicJoinStreamResult> {
  const res = await fetch(`${API_URL}/streaming/public/streams/${streamId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  })
  return parse(res, 'Transmissão não encontrada')
}

export async function leavePublicStream(streamId: string, peerId: string, guestToken: string): Promise<void> {
  await fetch(`${API_URL}/streaming/public/streams/${streamId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ peerId, guestToken }),
    keepalive: true,
  }).catch(() => {})
}

export async function createPublicSignalTicket(streamId: string, peerId: string, guestToken: string): Promise<string> {
  const res = await fetch(`${API_URL}/streaming/public/streams/${streamId}/events/ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ peerId, guestToken }),
  })
  const { ticket } = await parse<{ ticket: string }>(res, 'Erro ao abrir o canal de sinalização')
  return ticket
}

export function publicStreamEventsUrl(streamId: string, ticket: string): string {
  return `${API_URL}/streaming/public/streams/${streamId}/events?ticket=${encodeURIComponent(ticket)}`
}

export interface AnnouncementGuild {
  id: string
  name: string
  channelId: string | null
  channels: { id: string; name: string }[]
}

export interface AnnouncementTarget {
  id: string
  name: string
  configured: boolean
}

export async function getAnnouncementTargets(token: string): Promise<AnnouncementTarget[]> {
  const res = await apiFetch(`${API_URL}/streaming/announcement-targets`, { headers: h(token), cache: 'no-store' })
  return parse(res, 'Erro ao carregar os servidores para transmissão')
}

export async function getAnnouncementGuilds(token: string): Promise<AnnouncementGuild[]> {
  const res = await apiFetch(`${API_URL}/streaming/admin/announcement-channels`, { headers: h(token), cache: 'no-store' })
  return parse(res, 'Erro ao carregar os canais de anÃºncio')
}

export async function setAnnouncementChannel(token: string, guildId: string, channelId: string | null): Promise<void> {
  const res = await apiFetch(`${API_URL}/streaming/admin/announcement-channels`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ guildId, ...(channelId ? { channelId } : {}) }),
  })
  await parse(res, 'Erro ao salvar o canal de anÃºncio')
}

export async function joinStream(
  token: string,
  streamId: string,
  clientId: string,
  asViewer = false,
): Promise<JoinStreamResult> {
  const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}/join`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ clientId, ...(asViewer ? { asViewer: true } : {}) }),
  })
  return parse(res, 'Transmissão não encontrada')
}

export async function leaveStream(token: string, streamId: string, peerId: string): Promise<void> {
  await apiFetch(`${API_URL}/streaming/streams/${streamId}/leave`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ peerId }),
    keepalive: true,
  }).catch(() => {})
}

export async function endStream(token: string, streamId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}`, {
    method: 'DELETE',
    headers: h(token),
  })
  if (!res.ok) throw new Error('Erro ao encerrar a transmissão')
}

export async function createSignalTicket(token: string, streamId: string, peerId: string): Promise<string> {
  const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}/events/ticket`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ peerId }),
  })
  const { ticket } = await parse<{ ticket: string }>(res, 'Erro ao abrir o canal de sinalização')
  return ticket
}

export function streamEventsUrl(streamId: string, ticket: string): string {
  return `${API_URL}/streaming/streams/${streamId}/events?ticket=${encodeURIComponent(ticket)}`
}

export interface RtcCredentials {
  enabled: boolean
  role?: 'host' | 'viewer'
  url?: string
  token?: string
  room?: string
}

const RTC_DISABLED: RtcCredentials = { enabled: false }

/**
 * Credentials for the SFU. A disabled or unreachable SFU answers with
 * `enabled: false` so the caller falls back to the peer to peer transport.
 */
export async function getRtcCredentials(
  token: string,
  streamId: string,
  peerId: string,
): Promise<RtcCredentials> {
  try {
    const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}/rtc`, {
      method: 'POST',
      headers: h(token),
      body: JSON.stringify({ peerId }),
    })
    if (!res.ok) return RTC_DISABLED
    return await res.json()
  } catch {
    return RTC_DISABLED
  }
}

export async function getPublicRtcCredentials(
  streamId: string,
  peerId: string,
  guestToken: string,
): Promise<RtcCredentials> {
  try {
    const res = await fetch(`${API_URL}/streaming/public/streams/${streamId}/rtc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, guestToken }),
    })
    if (!res.ok) return RTC_DISABLED
    return await res.json()
  } catch {
    return RTC_DISABLED
  }
}

// ─── SFU (admin) ────────────────────────────────────────────────────────────

export interface SfuStatus {
  url: string
  apiKey: string
  /** The secret never leaves the server, only whether one is stored. */
  hasSecret: boolean
  configured: boolean
  enabled: boolean
  featureEnabled: boolean
  source: 'database' | 'environment' | 'none'
  encryption: {
    /** A key is available, so what gets stored is encrypted. */
    active: boolean
    /** Dedicated key instead of one derived from JWT_SECRET. */
    dedicatedKey: boolean
    /** Old keys still accepted for reading, used during a rotation. */
    fallbackKeys: number
  }
}

export async function getSfuStatus(token: string): Promise<SfuStatus> {
  const res = await apiFetch(`${API_URL}/streaming/admin/sfu`, { headers: h(token), cache: 'no-store' })
  return parse(res, 'Erro ao carregar a configuração do servidor de transmissão')
}

export async function saveSfuSettings(
  token: string,
  input: { url: string; apiKey: string; apiSecret?: string },
): Promise<SfuStatus> {
  const res = await apiFetch(`${API_URL}/streaming/admin/sfu`, {
    method: 'PUT',
    headers: h(token),
    body: JSON.stringify(input),
  })
  return parse(res, 'Erro ao salvar o servidor de transmissão')
}

export async function clearSfuSettings(token: string): Promise<SfuStatus> {
  const res = await apiFetch(`${API_URL}/streaming/admin/sfu`, { method: 'DELETE', headers: h(token) })
  return parse(res, 'Erro ao apagar a configuração')
}

export async function testSfuConnection(token: string): Promise<{ ok: boolean; message: string }> {
  const res = await apiFetch(`${API_URL}/streaming/admin/sfu/test`, { method: 'POST', headers: h(token) })
  return parse(res, 'Erro ao testar o servidor de transmissão')
}
