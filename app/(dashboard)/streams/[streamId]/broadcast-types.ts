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
  /// Por que o codificador está segurando a imagem, direto do WebRTC. É o que
  /// diz se a culpa é da máquina ou da rede quando a live cai de qualidade.
  limitedBy: "none" | "cpu" | "bandwidth" | "other"
  /// Altura que o perfil escolhido promete entregar.
  targetHeight: number
  /// O perfil promete segurar a resolução. Sendo falso, imagem menor que o
  /// alvo é o codificador fazendo o certo, não sinal de problema.
  pinnedResolution: boolean
}

export interface StartOptions {
  profile: VideoProfile
  visibility: Visibility
  /// Nome escolhido na hora de subir. Vai antes do start para o aviso do
  /// Discord já sair com o nome certo.
  title?: string
  /// Chamado assim que a tela é escolhida, antes de conectar e publicar. É o
  /// gancho que deixa o modal sair da frente e a live aparecer na hora.
  onCaptureReady?: () => void
  withMic: boolean
  withGameAudio: boolean
  /// Avisar no Discord ao subir. Padrão desligado: o anúncio marca o servidor
  /// inteiro e não tem como cancelar depois.
  announce: boolean
}

/** O que a tela do estúdio precisa da camada que publica a live. */
export interface HostBroadcast {
  previewRef: RefObject<HTMLVideoElement | null>
  viewers: StreamPeer[]
  sharing: boolean
  hasStarted: boolean
  starting: boolean
  switchingScreen: boolean
  restarting: boolean
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
  applyProfile: (profile: VideoProfile) => Promise<void>
  switchScreen: () => Promise<void>
  /// Refaz a ligação com o servidor sem pedir a tela de novo.
  restart: () => Promise<void>
  toggleMic: () => Promise<void>
  connectGameAudio: (deviceId?: string) => Promise<void>
  disconnectGameAudio: () => void
  setVolume: (kind: AudioSourceKind, volume: number) => void
  finish: () => Promise<void>
  resetPeers: (viewers: StreamPeer[]) => void
}
