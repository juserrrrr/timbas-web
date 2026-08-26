"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  VideoQuality,
} from "livekit-client"
import { getToken } from "@/lib/auth"
import {
  getPublicRtcCredentials,
  getRtcCredentials,
  leavePublicStream,
  leaveStream,
  type SignalEvent,
  type StreamSummary,
} from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"
import { ViewerShell, type ViewerStats, type ViewerStatus } from "./viewer-shell"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
  guestToken?: string
  studioHref?: string
  onReconnect: () => Promise<void>
}

/**
 * Reprodução da live: uma conexão só, com o servidor que já está recebendo a
 * cópia do host. O canal de eventos continua em uso para presença, contagem de
 * quem está assistindo e para saber quando a transmissão acaba.
 */
export function ViewerStage({ streamId, peerId, stream, guestToken, studioHref, onReconnect }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const roomRef = useRef<Room | null>(null)
  const videoTrackRef = useRef<RemoteTrack | null>(null)
  const statsSampleRef = useRef({ bytes: 0, at: 0 })

  const [status, setStatus] = useState<ViewerStatus>("connecting")
  const [muted, setMuted] = useState(true)
  const [volume, setVolume] = useState(1)
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false)
  const [viewerCount, setViewerCount] = useState(stream.viewers)
  const [stats, setStats] = useState<ViewerStats | null>(null)

  const tryPlayAudio = useCallback(async () => {
    const audio = audioRef.current
    if (!audio?.srcObject) return
    audio.muted = false
    try {
      await audio.play()
      setMuted(false)
    } catch {
      audio.muted = true
      setMuted(true)
      await audio.play().catch(() => {})
    }
  }, [])

  const attachTrack = useCallback((track: RemoteTrack, publication: RemoteTrackPublication) => {
    // The default jitter buffer holds several hundred milliseconds. Nobody
    // interacts with a live, but the delay still shows, so video plays as soon
    // as it lands and audio keeps only a small cushion against crackling.
    track.setPlayoutDelay(track.kind === Track.Kind.Video ? 0 : 0.06)

    if (track.kind === Track.Kind.Video) {
      videoTrackRef.current = track
      // Pede a camada cheia de propósito: sem isso o servidor entrega a que
      // ele achar melhor e a imagem chega menor do que foi transmitida.
      publication.setVideoQuality(VideoQuality.HIGH)
      if (videoRef.current) track.attach(videoRef.current)
      setStatus(publication.isMuted ? "paused" : "live")
      return
    }

    if (audioRef.current) {
      track.attach(audioRef.current)
      setHasRemoteAudio(true)
      void tryPlayAudio()
    }
  }, [tryPlayAudio])

  useEffect(() => {
    let cancelled = false
    let room: Room | null = null

    const connect = async () => {
      const token = getToken()
      const credentials = guestToken
        ? await getPublicRtcCredentials(streamId, peerId, guestToken)
        : token ? await getRtcCredentials(token, streamId, peerId) : { enabled: false as const }

      if (cancelled) return
      if (!credentials.enabled || !credentials.url || !credentials.token) {
        // Sem servidor não existe caminho nenhum para a mídia, então esperar
        // aqui seria enganação.
        setStatus("unavailable")
        return
      }

      room = new Room({
        // adaptiveStream escolhe a camada pelo tamanho do elemento de vídeo, e
        // com dynacast ligado no host esse pedido volta para o publisher: um
        // player pequeno ou ainda sem layout fazia a live inteira cair para a
        // camada mínima, e era assim que o host mandava 1080p e a tela do
        // espectador mostrava 180p. Transmissão de jogo é para ser vista no
        // tamanho que foi capturada.
        adaptiveStream: false,
        dynacast: false,
        disconnectOnPageLeave: true,
      })

      room.on(RoomEvent.TrackSubscribed, attachTrack)
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach()
        if (track.kind === Track.Kind.Video) {
          videoTrackRef.current = null
          setStatus("waiting")
        } else {
          setHasRemoteAudio(false)
        }
      })
      room.on(RoomEvent.TrackMuted, (publication) => {
        if (publication.kind === Track.Kind.Video) setStatus("paused")
      })
      room.on(RoomEvent.TrackUnmuted, (publication) => {
        if (publication.kind === Track.Kind.Video) setStatus("live")
      })
      room.on(RoomEvent.ParticipantDisconnected, () => {
        if (!room?.remoteParticipants.size) setStatus("waiting")
      })
      room.on(RoomEvent.Disconnected, () => setStatus((value) => (value === "ended" ? value : "connecting")))

      await room.connect(credentials.url, credentials.token)
      if (cancelled) {
        await room.disconnect()
        return
      }
      roomRef.current = room

      // Nothing is published yet when the host is between screens.
      if (!room.remoteParticipants.size) setStatus("waiting")
    }

    void connect().catch(() => setStatus("unavailable"))

    return () => {
      cancelled = true
      roomRef.current = null
      void room?.disconnect()
    }
  }, [attachTrack, guestToken, peerId, streamId])

  const handleEvent = useCallback(async (event: SignalEvent) => {
    if (event.type === "viewers") {
      setViewerCount(event.payload?.count ?? 0)
      return
    }

    if (event.type === "host_unavailable") {
      setStatus("waiting")
      return
    }

    if (event.type === "stream_ended") {
      setStatus("ended")
      void roomRef.current?.disconnect()
      roomRef.current = null
    }
  }, [])

  const connected = useSignalChannel(streamId, peerId, handleEvent, status !== "ended", guestToken, onReconnect)

  useEffect(() => () => {
    const token = getToken()
    if (guestToken) void leavePublicStream(streamId, peerId, guestToken)
    else if (token) void leaveStream(token, streamId, peerId)
  }, [guestToken, peerId, streamId])

  useEffect(() => {
    if (status !== "live" && status !== "paused") return

    const collect = async () => {
      const report = await videoTrackRef.current?.getRTCStatsReport().catch(() => undefined)
      if (!report) return

      let bytes = 0
      let fps = 0
      let width = 0
      let height = 0
      let rttMs = 0

      report.forEach((entry) => {
        if (entry.type === "inbound-rtp" && entry.kind === "video") {
          bytes += entry.bytesReceived ?? 0
          fps = Math.round(entry.framesPerSecond ?? 0)
          width = entry.frameWidth ?? 0
          height = entry.frameHeight ?? 0
        }
        if (entry.type === "candidate-pair" && entry.state === "succeeded" && entry.nominated) {
          rttMs = Math.round((entry.currentRoundTripTime ?? 0) * 1000)
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
  }, [status])

  const toggleSound = () => {
    const audio = audioRef.current
    if (!audio || !hasRemoteAudio) return
    if (audio.muted) {
      void tryPlayAudio()
      return
    }
    audio.muted = true
    setMuted(true)
  }

  const changeVolume = (next: number) => {
    setVolume(next)
    if (audioRef.current) audioRef.current.volume = next
  }

  return (
    <ViewerShell
      stream={stream}
      connected={connected}
      viewerCount={viewerCount}
      status={status}
      hasAudio={hasRemoteAudio}
      muted={muted}
      volume={volume}
      stats={stats}
      videoRef={videoRef}
      audioRef={audioRef}
      studioHref={studioHref}
      onToggleSound={toggleSound}
      onVolumeChange={changeVolume}
    />
  )
}
