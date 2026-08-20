import { apiFetch } from '../api'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

export interface StreamSummary {
  id: string
  title: string
  hostName: string
  visibility: 'MEMBERS' | 'PUBLIC'
  startedAt: string
  viewers: number
  live: boolean
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
}

export type SignalType = 'offer' | 'answer' | 'ice'

export interface SignalEvent {
  type: SignalType | 'ready' | 'viewer_joined' | 'viewer_left' | 'viewers' | 'host_ready' | 'stream_ended'
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

export async function getStreamPermission(token: string): Promise<{ canStream: boolean; featureEnabled: boolean }> {
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
}

export async function joinPublicStream(streamId: string): Promise<PublicJoinStreamResult> {
  const res = await fetch(`${API_URL}/streaming/public/streams/${streamId}/join`, { method: 'POST' })
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

export async function sendPublicSignal(
  streamId: string,
  guestToken: string,
  body: { from: string; to: string; type: SignalType; data: unknown },
): Promise<void> {
  await fetch(`${API_URL}/streaming/public/streams/${streamId}/signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, guestToken }),
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

export async function getPublicIceServers(): Promise<RTCIceServer[]> {
  const res = await fetch(`${API_URL}/streaming/public/ice`)
  const data = await parse<{ iceServers: RTCIceServer[] }>(res, 'Erro ao obter os servidores de conexão')
  return data.iceServers
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

export async function joinStream(token: string, streamId: string): Promise<JoinStreamResult> {
  const res = await apiFetch(`${API_URL}/streaming/streams/${streamId}/join`, {
    method: 'POST',
    headers: h(token),
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

export async function sendSignal(
  token: string,
  streamId: string,
  body: { from: string; to: string; type: SignalType; data: unknown },
): Promise<void> {
  await apiFetch(`${API_URL}/streaming/streams/${streamId}/signal`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify(body),
  }).catch(() => {})
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
