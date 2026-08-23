import type { RefObject } from "react"
import type { AudioMixerLevels, AudioSourceKind } from "@/lib/live/audio-mixer"
import type { VideoProfile } from "@/lib/live/tuning"
import type { SignalEvent, StreamPeer } from "@/lib/services/streaming"
import type { GameAudioState, ScreenInfo } from "./use-live-media"

export type Visibility = "MEMBERS" | "PUBLIC"

export interface BroadcastStats {
  kbps: number
  fps: number
  width: number
  height: number
  rttMs: number
  relayed: boolean
}

export interface StartOptions {
  profile: VideoProfile
  visibility: Visibility
  withMic: boolean
  withGameAudio: boolean
}

/**
 * What the studio screen needs from a transport, whether the media travels peer
 * to peer or through the SFU. Keeping the shape identical is what lets one set
 * of controls drive both.
 */
export interface HostBroadcast {
  transport: "p2p" | "sfu"
  previewRef: RefObject<HTMLVideoElement | null>
  viewers: StreamPeer[]
  sharing: boolean
  hasStarted: boolean
  starting: boolean
  switchingScreen: boolean
  screen: ScreenInfo | null
  micReady: boolean
  micOn: boolean
  micBusy: boolean
  gameAudioState: GameAudioState
  gameAudioLabel: string
  gameAudioBusy: boolean
  levels: AudioMixerLevels
  stats: BroadcastStats | null
  audioInputs: MediaDeviceInfo[]
  loopbackDevices: MediaDeviceInfo[]
  error: string | null
  handleEvent: (event: SignalEvent) => Promise<void>
  start: (options: StartOptions) => Promise<boolean>
  switchScreen: () => Promise<void>
  toggleMic: () => Promise<void>
  connectGameAudio: (deviceId?: string) => Promise<void>
  disconnectGameAudio: () => void
  setVolume: (kind: AudioSourceKind, volume: number) => void
  finish: () => Promise<void>
  resetPeers: (viewers: StreamPeer[]) => void
}
