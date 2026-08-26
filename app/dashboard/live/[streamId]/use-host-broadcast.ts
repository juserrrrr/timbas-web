"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  LocalTrackPublication,
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client"
import { getToken } from "@/lib/auth"
import {
  AUDIO_BITRATE_BPS,
  displayVideoConstraints,
  expectedHeightFor,
  sfuVideoOptions,
  type VideoProfile,
} from "@/lib/live/tuning"
import {
  endStream,
  getRtcCredentials,
  getStreamViewers,
  leaveStream,
  reportHostTelemetry,
  startStream,
  updateStreamVisibility,
  type SignalEvent,
  type StreamPeer,
} from "@/lib/services/streaming"
import { useLiveMedia } from "./use-live-media"
import type { BroadcastStats, HostBroadcast, StartOptions } from "./broadcast-types"

const VIEWER_SYNC_MS = 4000
/// Espaço mínimo entre duas tentativas de recuperar a resolução. Insistir a cada
/// leitura só faria o codificador reiniciar sem parar.
const RESOLUTION_RETRY_MS = 20_000
/// Espaço entre as leituras que o host manda para o painel da organização.
const TELEMETRY_MS = 5000

/**
 * Publica a live: o host manda uma cópia para o servidor e ele distribui, então
 * subida e CPU param de crescer com o tamanho da sala.
 *
 * A captura em si mora em useLiveMedia. Aqui só se decide para onde as duas
 * tracks, imagem e áudio já mixado, são enviadas.
 */
export function useHostBroadcast(
  streamId: string,
  peerId: string,
  initialViewers: StreamPeer[],
  live: boolean,
): HostBroadcast {
  const roomRef = useRef<Room | null>(null)
  const videoPubRef = useRef<LocalTrackPublication | null>(null)
  const audioPubRef = useRef<LocalTrackPublication | null>(null)
  const viewersRef = useRef(new Map(initialViewers.map((viewer) => [viewer.peerId, viewer])))
  const peerIdRef = useRef(peerId)
  const profileRef = useRef<VideoProfile>({ quality: "1080p", frameRate: 60 })
  const statsSampleRef = useRef({ bytes: 0, at: 0 })
  const captureHeightRef = useRef(0)
  const lastResolutionFixRef = useRef(0)
  const telemetrySentRef = useRef(0)

  const [viewers, setViewers] = useState<StreamPeer[]>(initialViewers)
  const [hasStarted, setHasStarted] = useState(live)
  const [switchingScreen, setSwitchingScreen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stats, setStats] = useState<BroadcastStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  peerIdRef.current = peerId

  /**
   * Swapping the source never republishes: the SFU keeps the same track id, so
   * viewers get the new screen on the next frame with nothing to renegotiate.
   * A null track means the host paused, which is signalled as a mute so the
   * viewer can show an overlay over the frozen frame.
   */
  const publishVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
    const publication = videoPubRef.current
    const room = roomRef.current
    if (!room) return

    await (async () => {
      try {
        if (!track) {
          await publication?.mute()
          return
        }

        const existing = publication?.track as LocalVideoTrack | undefined
        if (existing) {
          await existing.replaceTrack(track, true)
          await publication?.unmute()
          return
        }

        const options = sfuVideoOptions(profileRef.current)
        videoPubRef.current = await room.localParticipant.publishTrack(track, {
          name: "screen",
          source: Track.Source.ScreenShare,
          simulcast: options.simulcast,
          videoCodec: options.videoCodec,
          backupCodec: options.backupCodec,
          screenShareEncoding: options.screenShareEncoding,
          degradationPreference: options.degradationPreference,
          stopMicTrackOnMute: false,
        })
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : "Não foi possível publicar a imagem.")
        throw caught
      }
    })()
  }, [])

  /**
   * Reimpõe o alvo do perfil no codificador e na captura. O codificador encolhe
   * a imagem sozinho quando falta CPU ou banda, mas não volta a crescer por
   * conta própria: sem isto a live nasce em 1080p e morre em 180p.
   */
  const reapplyEncoding = useCallback(async () => {
    const track = videoPubRef.current?.track as LocalVideoTrack | undefined
    const options = sfuVideoOptions(profileRef.current)
    const sender = track?.sender

    if (sender) {
      const params = sender.getParameters()
      if (params.encodings?.length) {
        params.degradationPreference = options.degradationPreference
        for (const encoding of params.encodings) {
          encoding.active = true
          encoding.scaleResolutionDownBy = 1
          encoding.maxBitrate = options.screenShareEncoding.maxBitrate
          encoding.maxFramerate = options.screenShareEncoding.maxFramerate
        }
        await sender.setParameters(params).catch(() => {})
      }
    }

    await track?.mediaStreamTrack
      .applyConstraints(displayVideoConstraints(profileRef.current))
      .catch(() => {})
  }, [])

  /// Troca o alvo da live sem cortar nada: serve para o host subir a qualidade
  /// no meio da transmissão e para o admin forçar um alvo ao depurar.
  const applyProfile = useCallback(async (profile: VideoProfile) => {
    profileRef.current = profile
    lastResolutionFixRef.current = Date.now()
    await reapplyEncoding()
  }, [reapplyEncoding])

  const media = useLiveMedia(hasStarted, publishVideoTrack)
  const { beginCapture, ensureMixer, switchCapture, stopMedia, videoTrackRef } = media

  const publishAudioTrack = useCallback(async (room: Room, track: MediaStreamTrack) => {
    if (audioPubRef.current) return
    audioPubRef.current = await room.localParticipant.publishTrack(track, {
      name: "live_audio",
      source: Track.Source.ScreenShareAudio,
      dtx: false,
      red: true,
      audioPreset: { maxBitrate: AUDIO_BITRATE_BPS, priority: "high" },
      stopMicTrackOnMute: false,
    })
  }, [])

  const connectRoom = useCallback(async () => {
    if (roomRef.current) return roomRef.current

    const token = getToken()
    if (!token) throw new Error("Faça login novamente para transmitir.")

    const credentials = await getRtcCredentials(token, streamId, peerIdRef.current)
    if (!credentials.enabled || !credentials.url || !credentials.token) {
      throw new Error("O servidor de transmissão não está disponível.")
    }

    const room = new Room({
      adaptiveStream: false,
      // dynacast desliga camadas que ninguém está pedindo, e quem pede é o
      // player do espectador. Na prática isso derrubava a resolução do
      // publisher inteiro por causa do tamanho do vídeo na tela de quem
      // assiste. Economia de CPU não vale entregar a live em 180p.
      dynacast: false,
      disconnectOnPageLeave: true,
    })

    room.on(RoomEvent.Disconnected, () => {
      if (roomRef.current !== room) return
      roomRef.current = null
      videoPubRef.current = null
      audioPubRef.current = null
      setError("A conexão com o servidor de transmissão caiu. Recarregue a página para voltar ao ar.")
    })
    room.on(RoomEvent.Connected, () => setError(null))
    // Oscilação de rede não é queda: o cliente reconecta sozinho e a live
    // continua. Só avisa, sem mandar ninguém recarregar a página.
    room.on(RoomEvent.Reconnecting, () => setError("Reconectando ao servidor de transmissão..."))
    room.on(RoomEvent.Reconnected, () => {
      setError(null)
      // A sessão nova começa com o encoder no padrão dele, então o alvo do
      // perfil precisa ser reimposto para a imagem não voltar encolhida.
      void reapplyEncoding()
    })

    await room.connect(credentials.url, credentials.token)
    roomRef.current = room
    return room
  }, [reapplyEncoding, streamId])

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  const start = useCallback(async ({ profile, visibility, withMic, withGameAudio, announce }: StartOptions) => {
    setError(null)
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Seu navegador não suporta compartilhamento de tela.")
      return false
    }

    setStarting(true)
    try {
      profileRef.current = profile
      // Capture first: the picker has to open while the click is still the
      // current user gesture, and the mixer has to be born inside it too.
      await beginCapture(profile, withMic, withGameAudio)

      const token = getToken()
      if (!token) throw new Error("Faça login novamente para transmitir.")

      const room = await connectRoom()
      const mixer = ensureMixer()
      await publishAudioTrack(room, mixer.track)
      await publishVideoTrack(videoTrackRef.current)

      await updateStreamVisibility(token, streamId, visibility).catch(() => null)
      await startStream(token, streamId, announce)
      setHasStarted(true)
      return true
    } catch (caught: unknown) {
      setError(
        caught instanceof Error && caught.name === "NotAllowedError"
          ? "Você cancelou a seleção de tela."
          : caught instanceof Error ? caught.message : "Não foi possível iniciar a transmissão.",
      )
      return false
    } finally {
      setStarting(false)
    }
  }, [beginCapture, connectRoom, ensureMixer, publishAudioTrack, publishVideoTrack, streamId, videoTrackRef])

  const switchScreen = useCallback(async () => {
    if (switchingScreen) return
    setSwitchingScreen(true)
    setError(null)
    try {
      // The picker has to open before anything is awaited, otherwise the click
      // stops counting as a user gesture and the browser refuses it. Connecting
      // comes after, which also covers reopening the studio mid live, when the
      // room still has to be joined again.
      const mixer = ensureMixer()
      await switchCapture(profileRef.current)

      const room = await connectRoom()
      await publishAudioTrack(room, mixer.track)
      await publishVideoTrack(videoTrackRef.current)
      toast.success("Tela trocada", { description: "A live seguiu no mesmo link, sem cortar." })
    } catch (caught: unknown) {
      if (caught instanceof Error && caught.name !== "NotAllowedError") {
        setError("Não foi possível trocar a tela. Tente novamente.")
      }
    } finally {
      setSwitchingScreen(false)
    }
  }, [connectRoom, ensureMixer, publishAudioTrack, publishVideoTrack, switchCapture, switchingScreen, videoTrackRef])

  const stopEverything = useCallback(() => {
    stopMedia()
    const room = roomRef.current
    roomRef.current = null
    videoPubRef.current = null
    audioPubRef.current = null
    void room?.disconnect()
    setHasStarted(false)
    setStats(null)
  }, [stopMedia])

  const finish = useCallback(async () => {
    stopEverything()
    const token = getToken()
    if (token) await endStream(token, streamId).catch(() => {})
  }, [stopEverything, streamId])

  // ─── VIEWERS ───────────────────────────────────────────────────────────────

  const handleEvent = useCallback(async (event: SignalEvent) => {
    // A organização pode empurrar um alvo de qualidade para depurar uma live
    // ruim sem precisar pedir para o host reiniciar a transmissão. Vem antes do
    // corte por remetente: o pedido é da organização, não de um espectador.
    if (event.type === "quality_request") {
      const payload = event.payload as {
        quality?: VideoProfile["quality"]
        frameRate?: VideoProfile["frameRate"]
        by?: string
      } | undefined
      const next: VideoProfile = {
        quality: payload?.quality ?? profileRef.current.quality,
        frameRate: payload?.frameRate ?? profileRef.current.frameRate,
      }
      await applyProfile(next)
      toast.info("Qualidade ajustada pela organização", {
        description: `Alvo agora é ${next.quality} a ${next.frameRate} FPS${payload?.by ? `, pedido por ${payload.by}` : ""}.`,
      })
      return
    }

    const from = event.from
    if (!from) return

    if (event.type === "viewer_joined") {
      const payload = event.payload as { name?: string } | undefined
      viewersRef.current.set(from, { peerId: from, name: payload?.name || "Espectador" })
      setViewers([...viewersRef.current.values()])
      return
    }

    if (event.type === "viewer_left") {
      viewersRef.current.delete(from)
      setViewers([...viewersRef.current.values()])
    }
  }, [applyProfile])

  const resetPeers = useCallback((nextViewers: StreamPeer[]) => {
    viewersRef.current = new Map(nextViewers.map((viewer) => [viewer.peerId, viewer]))
    setViewers(nextViewers)
  }, [])

  useEffect(() => {
    if (!hasStarted) return

    const sync = async () => {
      const token = getToken()
      if (!token) return
      const latest = await getStreamViewers(token, streamId).catch(() => null)
      if (!latest) return
      viewersRef.current = new Map(latest.map((viewer) => [viewer.peerId, viewer]))
      setViewers(latest)
    }

    void sync()
    const interval = window.setInterval(() => { void sync() }, VIEWER_SYNC_MS)
    return () => window.clearInterval(interval)
  }, [hasStarted, streamId])

  // ─── STATS ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!media.sharing) return

    const collect = async () => {
      const track = videoPubRef.current?.track as LocalVideoTrack | undefined
      const report = await track?.getRTCStatsReport().catch(() => undefined)
      if (!report) return

      let bytes = 0
      let fps = 0
      let width = 0
      let height = 0
      let rttMs = 0
      let limitedBy: BroadcastStats["limitedBy"] = "none"

      report.forEach((entry) => {
        if (entry.type === "outbound-rtp" && entry.kind === "video") {
          // SVC and simulcast produce one entry per layer, so they are summed.
          bytes += entry.bytesSent ?? 0
          fps = Math.max(fps, Math.round(entry.framesPerSecond ?? 0))
          width = Math.max(width, entry.frameWidth ?? 0)
          height = Math.max(height, entry.frameHeight ?? 0)
          const reason = entry.qualityLimitationReason
          if (reason === "cpu" || reason === "bandwidth" || reason === "other") limitedBy = reason
        }
        if (entry.type === "candidate-pair" && entry.state === "succeeded" && entry.nominated) {
          rttMs = Math.max(rttMs, Math.round((entry.currentRoundTripTime ?? 0) * 1000))
        }
      })

      const now = Date.now()
      const previous = statsSampleRef.current
      statsSampleRef.current = { bytes, at: now }
      if (!previous.at || now <= previous.at) return

      const captureHeight = track?.mediaStreamTrack.getSettings().height ?? captureHeightRef.current
      if (captureHeight) captureHeightRef.current = captureHeight
      const targetHeight = expectedHeightFor(profileRef.current, captureHeightRef.current)

      // O codificador encolhe sozinho e não volta: quando a imagem está bem
      // abaixo do alvo e o aperto passou, o alvo é reimposto. Com aperto de CPU
      // ou banda ainda ativo, insistir só piora, então espera passar.
      const shrunk = height > 0 && targetHeight > 0 && height < targetHeight * 0.9
      if (shrunk && limitedBy === "none" && now - lastResolutionFixRef.current > RESOLUTION_RETRY_MS) {
        lastResolutionFixRef.current = now
        void reapplyEncoding()
      }

      const sample: BroadcastStats = {
        kbps: Math.max(0, Math.round(((bytes - previous.bytes) * 8) / (now - previous.at))),
        fps,
        width,
        height,
        rttMs,
        relayed: false,
        limitedBy,
        targetHeight,
      }
      setStats(sample)

      // A organização enxerga a live pelo painel, e o servidor de mídia só sabe
      // o tamanho declarado na publicação. Sem esta leitura o painel mostrava
      // 1080p enquanto a imagem saía em 180p.
      if (now - telemetrySentRef.current >= TELEMETRY_MS) {
        telemetrySentRef.current = now
        const token = getToken()
        if (token) {
          void reportHostTelemetry(token, streamId, peerIdRef.current, {
            width: sample.width,
            height: sample.height,
            fps: sample.fps,
            kbps: sample.kbps,
            rttMs: sample.rttMs,
            targetHeight: sample.targetHeight,
            limitedBy: sample.limitedBy,
          })
        }
      }
    }

    void collect()
    const interval = window.setInterval(() => { void collect() }, 2000)
    return () => window.clearInterval(interval)
  }, [media.sharing, reapplyEncoding, streamId])

  useEffect(() => () => {
    stopEverything()
    const token = getToken()
    if (token) void leaveStream(token, streamId, peerIdRef.current)
  }, [stopEverything, streamId])

  return {
    previewRef: media.previewRef,
    viewers,
    sharing: media.sharing,
    hasStarted,
    starting,
    switchingScreen,
    screen: media.screen,
    micReady: media.micReady,
    micOn: media.micOn,
    micBusy: media.micBusy,
    gameAudioState: media.gameAudioState,
    gameAudioLabel: media.gameAudioLabel,
    gameAudioBusy: media.gameAudioBusy,
    levels: media.levels,
    stats,
    audioInputs: media.audioInputs,
    loopbackDevices: media.loopbackDevices,
    error,
    handleEvent,
    start,
    applyProfile,
    switchScreen,
    toggleMic: media.toggleMic,
    connectGameAudio: media.connectGameAudio,
    disconnectGameAudio: media.disconnectGameAudio,
    setVolume: media.setVolume,
    finish,
    resetPeers,
  }
}
