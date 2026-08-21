"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Maximize, Radio, Users, Volume2, VolumeX } from "lucide-react"
import { getToken } from "@/lib/auth"
import { PlayerAvatar } from "@/components/player-avatar"
import { createLivePeerConnection, getIceServers } from "@/lib/webrtc"
import { getPublicIceServers, leavePublicStream, leaveStream, sendPublicSignal, sendSignal, type SignalEvent, type StreamSummary } from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
  guestToken?: string
  onReconnect: () => Promise<void>
}

type Status = "connecting" | "live" | "waiting" | "ended"

export function ViewerStage({ streamId, peerId, stream, guestToken, onReconnect }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iceServersRef = useRef<RTCIceServer[]>([])
  const iceServersPromiseRef = useRef<Promise<RTCIceServer[]> | null>(null)

  const [status, setStatus] = useState<Status>("connecting")
  const [muted, setMuted] = useState(true)
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false)
  const [viewerCount, setViewerCount] = useState(stream.viewers)

  const ensureIceServers = useCallback(() => {
    if (iceServersRef.current.length) return Promise.resolve(iceServersRef.current)
    if (iceServersPromiseRef.current) return iceServersPromiseRef.current

    const token = getToken()
    const request = guestToken ? getPublicIceServers() : token ? getIceServers(token) : Promise.resolve([])
    iceServersPromiseRef.current = request
      .then((servers) => {
        iceServersRef.current = servers
        return servers
      })
      .catch((caught) => {
        iceServersPromiseRef.current = null
        throw caught
      })
    return iceServersPromiseRef.current
  }, [guestToken])

  const closePeer = useCallback(() => {
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
    disconnectTimerRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    pendingIceRef.current = []
    if (videoRef.current) videoRef.current.srcObject = null
    if (audioRef.current) audioRef.current.srcObject = null
    setHasRemoteAudio(false)
  }, [])

  const acceptOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
    const token = getToken()
    if (!guestToken && !token) return

    // ICE candidates can arrive before the offer because signaling uses
    // separate requests. Preserve them while replacing an older connection.
    const pendingCandidates = pendingIceRef.current
    pendingIceRef.current = []
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
    disconnectTimerRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    if (audioRef.current) audioRef.current.srcObject = null
    setHasRemoteAudio(false)
    setStatus("connecting")
    const iceServers = await ensureIceServers()

    const pc = createLivePeerConnection(iceServers)
    pcRef.current = pc

    const remoteVideo = new MediaStream()
    const remoteAudio = new MediaStream()
    pc.ontrack = (event) => {
      if (event.track.kind === "video") {
        remoteVideo.addTrack(event.track)
        event.track.onended = () => setStatus("waiting")
        event.track.onunmute = () => { void videoRef.current?.play().catch(() => {}) }
        if (videoRef.current && videoRef.current.srcObject !== remoteVideo) {
          videoRef.current.srcObject = remoteVideo
        }
      } else if (event.track.kind === "audio") {
        remoteAudio.addTrack(event.track)
        setHasRemoteAudio(true)
        if (audioRef.current && audioRef.current.srcObject !== remoteAudio) {
          audioRef.current.srcObject = remoteAudio
          audioRef.current.muted = muted
          if (!muted) void audioRef.current.play().catch(() => {})
        }
      }
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      const signal = { from: peerId, to: from, type: "ice" as const, data: event.candidate.toJSON() }
      if (guestToken) void sendPublicSignal(streamId, guestToken, signal)
      else if (token) void sendSignal(token, streamId, signal)
    }

    // The host closing the tab shows up here long before the API times it out.
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return
      if (pc.connectionState === "connected") {
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
        if ((videoRef.current?.readyState ?? 0) >= HTMLMediaElement.HAVE_CURRENT_DATA) setStatus("live")
        return
      }
      if (pc.connectionState === "failed") {
        setStatus("connecting")
        return
      }
      if (pc.connectionState === "disconnected" && !disconnectTimerRef.current) {
        disconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current === pc && pc.connectionState === "disconnected") setStatus("connecting")
          disconnectTimerRef.current = null
        }, 5_000)
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const queuedCandidates = [...pendingCandidates, ...pendingIceRef.current]
    for (const candidate of queuedCandidates) await pc.addIceCandidate(candidate).catch(() => {})
    pendingIceRef.current = []

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    const signal = { from: peerId, to: from, type: "answer" as const, data: answer }
    if (guestToken) void sendPublicSignal(streamId, guestToken, signal)
    else if (token) void sendSignal(token, streamId, signal)
  }, [closePeer, ensureIceServers, guestToken, muted, peerId, streamId])

  const handleEvent = useCallback(async (event: SignalEvent) => {
    if (event.type === "offer" && event.from) {
      await acceptOffer(event.from, event.payload)
      return
    }

    if (event.type === "ice") {
      const pc = pcRef.current
      if (pc?.remoteDescription) await pc.addIceCandidate(event.payload).catch(() => {})
      else pendingIceRef.current.push(event.payload)
      return
    }

    if (event.type === "host_ready") {
      closePeer()
      setStatus("connecting")
      return
    }

    if (event.type === "host_unavailable") {
      closePeer()
      setStatus("waiting")
      return
    }

    if (event.type === "viewers") {
      setViewerCount(event.payload?.count ?? 0)
      return
    }

    if (event.type === "stream_ended") {
      closePeer()
      setStatus("ended")
    }
  }, [acceptOffer, closePeer])

  const connected = useSignalChannel(streamId, peerId, handleEvent, status !== "ended", guestToken, onReconnect)

  useEffect(() => {
    void ensureIceServers().catch(() => {})
  }, [ensureIceServers])

  useEffect(() => {
    return () => {
      closePeer()
      const token = getToken()
      if (guestToken) void leavePublicStream(streamId, peerId, guestToken)
      else if (token) void leaveStream(token, streamId, peerId)
    }
  }, [closePeer, guestToken, peerId, streamId])

  const toggleSound = () => {
    const audio = audioRef.current
    if (!audio || !hasRemoteAudio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
    if (!audio.muted) void audio.play().catch(() => {})
  }

  const goFullscreen = () => {
    void videoRef.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/live"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-gray-400 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PlayerAvatar name={stream.hostName} discordId={stream.hostDiscordId ?? undefined} avatar={stream.hostAvatar} className="h-10 w-10 ring-2 ring-red-500/20" />
          <div>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">{stream.title}</h1>
            <p className="text-xs text-gray-500">
              @{stream.hostName}
              {connected ? "" : " • reconectando"}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gray-300 ring-1 ring-white/[0.08]">
          <Users className="h-3.5 w-3.5" />
          {viewerCount}
        </span>
      </div>

      {/* Stage */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
        <div className="relative aspect-video w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            onLoadedData={() => setStatus("live")}
            onPlaying={() => setStatus("live")}
            className="h-full w-full object-contain"
          />
          <audio ref={audioRef} autoPlay playsInline muted={muted} />

          {status !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#07070c] px-6 text-center">
              {status === "connecting" || status === "waiting" ? (
                <>
                  {status === "connecting" && <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />}
                  <p className="text-sm font-bold text-white">{status === "waiting" ? "A live continua aberta" : "Conectando na transmissão"}</p>
                  <p className="text-xs text-gray-500">{status === "waiting" ? "O host pode voltar ou escolher outra tela em até 90 segundos." : "Esperando o host começar a compartilhar a tela."}</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
                    <Radio className="h-6 w-6 text-gray-500" />
                  </div>
                  <p className="text-sm font-bold text-white">Transmissão encerrada</p>
                  <Link href="/dashboard/live" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                    Ver outras transmissões
                  </Link>
                </>
              )}
            </div>
          )}

          {status === "live" && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={toggleSound}
                disabled={!hasRemoteAudio}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-black/85"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {!hasRemoteAudio ? "Live sem áudio" : muted ? "Ativar som" : "Som ligado"}
              </button>
              <button
                onClick={goFullscreen}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-black/70 text-white ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-black/85"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          )}

          {status === "live" && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Ao vivo
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
