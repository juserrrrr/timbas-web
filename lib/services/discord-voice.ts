import { apiFetch } from '../api'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export type VoiceChannelType = 'WAITING' | 'BLUE' | 'RED' | 'OTHER' | null

export interface VoiceStatus {
  channelId: string | null
  channelName: string | null
  channelType: VoiceChannelType
}

export async function getVoiceStatus(
  token: string,
  guildId: string,
  discordId: string,
): Promise<VoiceStatus | null> {
  try {
    const res = await apiFetch(
      `${API_URL}/discord/voice/status?guildId=${encodeURIComponent(guildId)}&discordId=${encodeURIComponent(discordId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function moveToVoiceChannel(
  token: string,
  guildId: string,
  discordId: string,
  target: 'WAITING' | 'BLUE' | 'RED',
): Promise<{ success: boolean; channelName?: string; error?: string }> {
  try {
    const res = await apiFetch(`${API_URL}/discord/voice/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ guildId, discordId, target }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.message || 'Erro ao mover canal' }
    }
    return res.json()
  } catch {
    return { success: false, error: 'Bot offline ou sem permissão' }
  }
}
