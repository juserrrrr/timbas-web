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
import { AUDIO_BITRATE_BPS, sfuVideoOptions, type VideoProfile } from "@/lib/live/tuning"
import {
  endStream,
  getRtcCredentials,
  getStreamViewers,
  leaveStream,
  startStream,
  updateStreamVisibility,
  type SignalEvent,
  type StreamPeer,
} from "@/lib/services/streaming"
import { useLiveMedia } from "./use-live-media"
import type { BroadcastStats, HostBroadcast, StartOptions } from "./broadcast-types"

const VIEWER_SYNC_MS = 4000

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
  const publishVideoTrack = useCallback((track: MediaStreamTrack | null) => {
    const publication = videoPubRef.current
    const room = roomRef.current
    if (!room) return

    void (async () => {
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
      }
    })()
  }, [])

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
      // Lets the server tell the publisher to stop encoding layers that nobody
      // is watching, which keeps CPU off the game.
      dynacast: true,
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

    await room.connect(credentials.url, credentials.token)
    roomRef.current = room
    return room
  }, [streamId])

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  const start = useCallback(async ({ profile, visibility, withMic, withGameAudio }: StartOptions) => {
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
      publishVideoTrack(videoTrackRef.current)

      await updateStreamVisibility(token, streamId, visibility).catch(() => null)
      await startStream(token, streamId)
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
      publishVideoTrack(videoTrackRef.current)
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
  }, [])

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

      report.forEach((entry) => {
        if (entry.type === "outbound-rtp" && entry.kind === "video") {
          // SVC and simulcast produce one entry per layer, so they are summed.
          bytes += entry.bytesSent ?? 0
          fps = Math.max(fps, Math.round(entry.framesPerSecond ?? 0))
          width = Math.max(width, entry.frameWidth ?? 0)
          height = Math.max(height, entry.frameHeight ?? 0)
        }
        if (entry.type === "candidate-pair" && entry.state === "succeeded" && entry.nominated) {
          rttMs = Math.max(rttMs, Math.round((entry.currentRoundTripTime ?? 0) * 1000))
        }
      })

      const now = Date.now()
      const previous = statsSampleRef.current
      statsSampleRef.current = { bytes, at: now }
      if (!previous.at || now <= previous.at) return

      setStats({
        kbps: Math.max(0, Math.round(((bytes - previous.bytes) * 8) / (now - previous.at))),
        fps,
        width,
        height,
        rttMs,
        relayed: false,
      })
    }

    void collect()
    const interval = window.setInterval(() => { void collect() }, 2000)
    return () => window.clearInterval(interval)
  }, [media.sharing])

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
    switchScreen,
    toggleMic: media.toggleMic,
    connectGameAudio: media.connectGameAudio,
    disconnectGameAudio: media.disconnectGameAudio,
    setVolume: media.setVolume,
    finish,
    resetPeers,
  }
}
