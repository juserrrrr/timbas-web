"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Maximize, Radio, Users, Volume2, VolumeX } from "lucide-react"
import { getDiscordAvatarUrl, getToken } from "@/lib/auth"
import { getIceServers } from "@/lib/webrtc"
import { leaveStream, sendSignal, type SignalEvent, type StreamSummary } from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
}

type Status = "connecting" | "live" | "ended"

export function ViewerStage({ streamId, peerId, stream }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const iceServersRef = useRef<RTCIceServer[]>([])

  const [status, setStatus] = useState<Status>("connecting")
  const [muted, setMuted] = useState(true)
  const [viewerCount, setViewerCount] = useState(stream.viewers)

  const closePeer = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    pendingIceRef.current = []
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const acceptOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
    const token = getToken()
    if (!token) return

    closePeer()

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    pcRef.current = pc

    const remote = new MediaStream()
    pc.ontrack = (event) => {
      remote.addTrack(event.track)
      if (videoRef.current && videoRef.current.srcObject !== remote) {
        videoRef.current.srcObject = remote
      }
      setStatus("live")
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      sendSignal(token, streamId, { from: peerId, to: from, type: "ice", data: event.candidate.toJSON() })
    }

    // The host closing the tab shows up here long before the API times it out.
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") setStatus("connecting")
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    for (const candidate of pendingIceRef.current) await pc.addIceCandidate(candidate).catch(() => {})
    pendingIceRef.current = []

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    sendSignal(token, streamId, { from: peerId, to: from, type: "answer", data: answer })
  }, [closePeer, peerId, streamId])

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

    if (event.type === "viewers") {
      setViewerCount(event.payload?.count ?? 0)
      return
    }

    if (event.type === "stream_ended") {
      closePeer()
      setStatus("ended")
    }
  }, [acceptOffer, closePeer])

  const connected = useSignalChannel(streamId, peerId, handleEvent, status !== "ended")

  useEffect(() => {
    const token = getToken()
    if (token) getIceServers(token).then((servers) => { iceServersRef.current = servers })
  }, [])

  useEffect(() => {
    return () => {
      closePeer()
      const token = getToken()
      if (token) void leaveStream(token, streamId, peerId)
    }
  }, [closePeer, peerId, streamId])

  const toggleSound = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
    if (!video.muted) void video.play().catch(() => {})
  }

  const goFullscreen = () => {
    void videoRef.current?.requestFullscreen?.().catch(() => {})
  }

  const hostAvatar = getDiscordAvatarUrl(stream.hostDiscordId ?? undefined, stream.hostAvatar ?? undefined, 64)

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
          {hostAvatar ? (
            <img src={hostAvatar} alt="" className="h-10 w-10 rounded-xl ring-1 ring-white/10" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
              <Radio className="h-5 w-5 text-red-400" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">{stream.title}</h1>
            <p className="text-xs text-gray-500">
              {stream.hostName}
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
          <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-contain" />

          {status !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#07070c] px-6 text-center">
              {status === "connecting" ? (
                <>
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
                  <p className="text-sm font-bold text-white">Conectando na transmissão</p>
                  <p className="text-xs text-gray-500">Esperando o host começar a compartilhar a tela.</p>
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
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-black/85"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {muted ? "Ativar som" : "Som ligado"}
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
