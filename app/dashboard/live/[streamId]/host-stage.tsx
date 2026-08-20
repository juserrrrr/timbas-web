"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Link2, Mic, MicOff, MonitorUp, Radio, Square, Users } from "lucide-react"
import { toast } from "sonner"
import { getDiscordAvatarUrl, getToken } from "@/lib/auth"
import { getIceServers } from "@/lib/webrtc"
import { endStream, sendSignal, type SignalEvent, type StreamPeer, type StreamSummary } from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
  initialViewers: StreamPeer[]
}

export function HostStage({ streamId, peerId, stream, initialViewers }: Props) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const pcsRef = useRef(new Map<string, RTCPeerConnection>())
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const viewersRef = useRef(new Map(initialViewers.map((v) => [v.peerId, v])))
  const iceServersRef = useRef<RTCIceServer[]>([])

  const [viewers, setViewers] = useState<StreamPeer[]>(initialViewers)
  const [sharing, setSharing] = useState(false)
  const [withMic, setWithMic] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [hasMic, setHasMic] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── WebRTC per viewer ──────────────────────────────────────────────────────
  const offerTo = useCallback(async (target: string) => {
    const media = localStreamRef.current
    const token = getToken()
    if (!media || !token) return

    pcsRef.current.get(target)?.close()
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    pcsRef.current.set(target, pc)

    media.getTracks().forEach((track) => pc.addTrack(track, media))

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      sendSignal(token, streamId, { from: peerId, to: target, type: "ice", data: event.candidate.toJSON() })
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    sendSignal(token, streamId, { from: peerId, to: target, type: "offer", data: offer })
  }, [peerId, streamId])

  const closePeer = useCallback((target: string) => {
    pcsRef.current.get(target)?.close()
    pcsRef.current.delete(target)
    pendingIceRef.current.delete(target)
    viewersRef.current.delete(target)
    setViewers([...viewersRef.current.values()])
  }, [])

  const handleEvent = useCallback(async (event: SignalEvent) => {
    const from = event.from
    if (event.type === "viewer_joined" && from) {
      viewersRef.current.set(from, { peerId: from, ...event.payload })
      setViewers([...viewersRef.current.values()])
      if (localStreamRef.current) await offerTo(from)
      return
    }

    if (event.type === "viewer_left" && from) {
      closePeer(from)
      return
    }

    if (event.type === "answer" && from) {
      const pc = pcsRef.current.get(from)
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(event.payload))
      const pending = pendingIceRef.current.get(from) ?? []
      for (const candidate of pending) await pc.addIceCandidate(candidate).catch(() => {})
      pendingIceRef.current.delete(from)
      return
    }

    if (event.type === "ice" && from) {
      const pc = pcsRef.current.get(from)
      if (pc?.remoteDescription) {
        await pc.addIceCandidate(event.payload).catch(() => {})
      } else {
        pendingIceRef.current.set(from, [...(pendingIceRef.current.get(from) ?? []), event.payload])
      }
    }
  }, [closePeer, offerTo])

  const connected = useSignalChannel(streamId, peerId, handleEvent)

  useEffect(() => {
    const token = getToken()
    if (token) getIceServers(token).then((servers) => { iceServersRef.current = servers })
  }, [])

  // ── Share controls ─────────────────────────────────────────────────────────
  const stopEverything = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    micStreamRef.current = null
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    pendingIceRef.current.clear()
    if (videoRef.current) videoRef.current.srcObject = null
    setSharing(false)
    setHasMic(false)
  }, [])

  const finish = useCallback(async () => {
    stopEverything()
    const token = getToken()
    if (token) await endStream(token, streamId).catch(() => {})
    router.push("/dashboard/live")
  }, [router, stopEverything, streamId])

  const startShare = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Seu navegador não suporta compartilhamento de tela.")
      return
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
      })

      let micTracks: MediaStreamTrack[] = []
      if (withMic) {
        const mic = await navigator.mediaDevices
          .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
          .catch(() => null)
        if (mic) {
          micStreamRef.current = mic
          micTracks = mic.getAudioTracks()
          setHasMic(true)
        } else {
          toast.warning("Microfone não liberado", { description: "A transmissão segue só com o áudio da tela." })
        }
      }

      const media = new MediaStream([...display.getTracks(), ...micTracks])
      localStreamRef.current = media
      if (videoRef.current) videoRef.current.srcObject = media
      setSharing(true)
      setMicOn(true)

      display.getVideoTracks()[0].addEventListener("ended", () => { void finish() })

      for (const viewer of viewersRef.current.values()) await offerTo(viewer.peerId)
    } catch (e: unknown) {
      const message = e instanceof Error && e.name === "NotAllowedError"
        ? "Você cancelou a seleção de tela."
        : "Não foi possível capturar a tela."
      setError(message)
    }
  }

  const toggleMic = () => {
    const tracks = micStreamRef.current?.getAudioTracks() ?? []
    if (!tracks.length) return
    const next = !micOn
    tracks.forEach((track) => { track.enabled = next })
    setMicOn(next)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/dashboard/live/${streamId}`)
    setCopied(true)
    toast.success("Link copiado", { description: "Qualquer pessoa logada consegue assistir." })
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => () => stopEverything(), [stopEverything])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <Radio className={`h-5 w-5 text-red-400 ${sharing ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">{stream.title}</h1>
            <p className="text-xs text-gray-500">
              {sharing ? "Você está transmitindo" : "Transmissão criada, falta escolher a tela"}
              {connected ? "" : " • reconectando"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gray-300 ring-1 ring-white/[0.08]">
            <Users className="h-3.5 w-3.5" />
            {viewers.length}
          </span>
          <button
            onClick={copyLink}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar link
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
        <div className="relative aspect-video w-full">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
          {!sharing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#07070c] px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <MonitorUp className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Escolha o que compartilhar</p>
                <p className="mt-1 text-xs text-gray-500">Uma aba, uma janela ou a tela inteira.</p>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={withMic}
                  onChange={(e) => setWithMic(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-blue-500"
                />
                Incluir meu microfone
              </label>

              <button
                onClick={startShare}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                <MonitorUp className="h-4 w-4" />
                Compartilhar tela
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {sharing && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleMic}
            disabled={!hasMic}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              micOn
                ? "bg-white/[0.04] text-gray-200 ring-white/[0.08] hover:bg-white/[0.08]"
                : "bg-red-500/10 text-red-400 ring-red-500/20 hover:bg-red-500/15"
            }`}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {micOn ? "Microfone ligado" : "Microfone mudo"}
          </button>

          <button
            onClick={finish}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500"
          >
            <Square className="h-4 w-4" />
            Encerrar transmissão
          </button>
        </div>
      )}

      {/* Viewers */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
          <Users className="h-3.5 w-3.5" />
          Assistindo agora
        </div>
        {viewers.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-gray-500">
            <Link2 className="h-3.5 w-3.5" />
            Ninguém entrou ainda. Manda o link para a galera.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {viewers.map((viewer) => {
              const avatar = getDiscordAvatarUrl(viewer.discordId ?? undefined, viewer.avatar ?? undefined, 32)
              return (
                <span
                  key={viewer.peerId}
                  className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-semibold text-gray-200 ring-1 ring-white/[0.08]"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="h-5 w-5 rounded-full" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[9px] font-bold">
                      {viewer.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {viewer.name}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
