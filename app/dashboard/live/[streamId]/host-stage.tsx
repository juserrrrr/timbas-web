"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Globe2, Link2, Lock, MonitorUp, Radio, Users } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getDiscordAvatarUrl, getToken } from "@/lib/auth"
import { createLivePeerConnection, getIceServers } from "@/lib/webrtc"
import { endStream, getStreamViewers, leaveStream, sendSignal, startStream, updateStreamVisibility, type SignalEvent, type StreamPeer, type StreamSummary } from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"
import { HostLiveControls } from "./host-live-controls"
import { LiveSetupDialog, type VideoFrameRate, type VideoQuality } from "./live-setup-dialog"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
  initialViewers: StreamPeer[]
  onReconnect: () => Promise<void>
}

type Visibility = "MEMBERS" | "PUBLIC"

function readableScreenLabel(label?: string) {
  if (!label || label.includes("://")) return "Tela compartilhada"
  return label
}

function createBlackVideoStream() {
  const canvas = document.createElement("canvas")
  canvas.width = 1280
  canvas.height = 720
  const context = canvas.getContext("2d")
  context?.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.captureStream(1)
}

function displayVideoConstraints(quality: VideoQuality, frameRate: VideoFrameRate): MediaTrackConstraints {
  const frameRateConstraint = { ideal: frameRate, max: frameRate }
  if (quality === "720p") return { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: frameRateConstraint }
  if (quality === "1080p") return { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: frameRateConstraint }
  return { frameRate: frameRateConstraint }
}

function maxVideoBitrate(quality: VideoQuality, frameRate: VideoFrameRate) {
  if (quality === "720p") return frameRate === 60 ? 8_000_000 : 5_000_000
  if (quality === "1080p") return frameRate === 60 ? 14_000_000 : 9_000_000
  return frameRate === 60 ? 25_000_000 : 16_000_000
}

export function HostStage({ streamId, peerId, stream, initialViewers, onReconnect }: Props) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const placeholderStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const pcsRef = useRef(new Map<string, RTCPeerConnection>())
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const offeredAtRef = useRef(new Map<string, number>())
  const viewersRef = useRef(new Map(initialViewers.map((viewer) => [viewer.peerId, viewer])))
  const iceServersRef = useRef<RTCIceServer[]>([])
  const iceServersPromiseRef = useRef<Promise<RTCIceServer[]> | null>(null)
  const previousPeerIdRef = useRef(peerId)
  const peerIdRef = useRef(peerId)
  const videoProfileRef = useRef<{ quality: VideoQuality; frameRate: VideoFrameRate }>({ quality: "1080p", frameRate: 60 })

  const [viewers, setViewers] = useState<StreamPeer[]>(initialViewers)
  const [sharing, setSharing] = useState(false)
  const [hasStarted, setHasStarted] = useState(stream.live)
  const [withMic, setWithMic] = useState(true)
  const [setupOpen, setSetupOpen] = useState(true)
  const [setupVisibility, setSetupVisibility] = useState<Visibility>(stream.visibility)
  const [quality, setQuality] = useState<VideoQuality>("1080p")
  const [frameRate, setFrameRate] = useState<VideoFrameRate>(60)
  const [startingShare, setStartingShare] = useState(false)
  const [switchingScreen, setSwitchingScreen] = useState(false)
  const [screenLabel, setScreenLabel] = useState("")
  const [origin, setOrigin] = useState("")
  const [micOn, setMicOn] = useState(false)
  const [hasMic, setHasMic] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [visibility, setVisibility] = useState<Visibility>(stream.visibility)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const livePath = `/live/${stream.slug}`
  const liveUrl = origin ? `${origin}${livePath}` : ""
  const avatarUrl = getDiscordAvatarUrl(stream.hostDiscordId ?? undefined, stream.hostAvatar ?? undefined, 96)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    videoProfileRef.current = { quality, frameRate }
  }, [frameRate, quality])

  const ensureIceServers = useCallback(() => {
    if (iceServersRef.current.length) return Promise.resolve(iceServersRef.current)
    if (iceServersPromiseRef.current) return iceServersPromiseRef.current

    const token = getToken()
    if (!token) return Promise.resolve([])
    iceServersPromiseRef.current = getIceServers(token)
      .then((servers) => {
        iceServersRef.current = servers
        return servers
      })
      .catch((caught) => {
        iceServersPromiseRef.current = null
        throw caught
      })
    return iceServersPromiseRef.current
  }, [])

  const offerTo = useCallback(async (target: string) => {
    const media = localStreamRef.current
    const token = getToken()
    if (!media || !token) return

    const iceServers = await ensureIceServers()

    pcsRef.current.get(target)?.close()
    offeredAtRef.current.set(target, Date.now())
    const pc = createLivePeerConnection(iceServers)
    pcsRef.current.set(target, pc)

    for (const track of media.getTracks()) {
      const sender = pc.addTrack(track, media)
      if (track.kind === "video") {
        const parameters = sender.getParameters()
        parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}]
        parameters.encodings[0].maxBitrate = maxVideoBitrate(videoProfileRef.current.quality, videoProfileRef.current.frameRate)
        await sender.setParameters(parameters).catch(() => {})
      }
    }
    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      void sendSignal(token, streamId, { from: peerId, to: target, type: "ice", data: event.candidate.toJSON() })
    }
    pc.onconnectionstatechange = () => {
      if (pcsRef.current.get(target) !== pc) return
      if (pc.connectionState === "connected") setError(null)
      if (pc.connectionState === "failed") {
        pc.close()
        pcsRef.current.delete(target)
        offeredAtRef.current.set(target, 0)
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sendSignal(token, streamId, { from: peerId, to: target, type: "offer", data: offer })
  }, [ensureIceServers, peerId, streamId])

  const closePeer = useCallback((target: string) => {
    pcsRef.current.get(target)?.close()
    pcsRef.current.delete(target)
    pendingIceRef.current.delete(target)
    offeredAtRef.current.delete(target)
    viewersRef.current.delete(target)
    setViewers([...viewersRef.current.values()])
  }, [])

  const handleEvent = useCallback(async (event: SignalEvent) => {
    const from = event.from
    if (event.type === "viewer_joined" && from) {
      const payload = event.payload as { name?: string } | undefined
      viewersRef.current.set(from, { peerId: from, name: payload?.name || "Espectador" })
      setViewers([...viewersRef.current.values()])
      await offerTo(from)
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
      if (pc?.remoteDescription) await pc.addIceCandidate(event.payload).catch(() => {})
      else pendingIceRef.current.set(from, [...(pendingIceRef.current.get(from) ?? []), event.payload])
    }
  }, [closePeer, offerTo])

  const connected = useSignalChannel(streamId, peerId, handleEvent, true, undefined, onReconnect)

  useEffect(() => {
    if (previousPeerIdRef.current === peerId) return
    previousPeerIdRef.current = peerId
    peerIdRef.current = peerId
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    pendingIceRef.current.clear()
    offeredAtRef.current.clear()
    viewersRef.current = new Map(initialViewers.map((viewer) => [viewer.peerId, viewer]))
    setViewers(initialViewers)
  }, [initialViewers, peerId])

  useEffect(() => {
    void ensureIceServers().catch(() => {
      setError("Não foi possível carregar a configuração de conexão da live.")
    })
  }, [ensureIceServers])

  const syncViewers = useCallback(async () => {
    const token = getToken()
    if (!token || !localStreamRef.current) return

    const latest = await getStreamViewers(token, streamId).catch(() => null)
    if (!latest) return

    let changed = false
    for (const viewer of latest) {
      if (!viewersRef.current.has(viewer.peerId)) changed = true
      viewersRef.current.set(viewer.peerId, viewer)
    }
    if (changed) setViewers([...viewersRef.current.values()])

    const now = Date.now()
    for (const viewer of latest) {
      const pc = pcsRef.current.get(viewer.peerId)
      const lastOffer = offeredAtRef.current.get(viewer.peerId) ?? 0
      const needsOffer = !pc || pc.connectionState === "failed" || pc.connectionState === "closed" || (pc.connectionState !== "connected" && now - lastOffer > 8000)
      if (needsOffer) await offerTo(viewer.peerId)
    }
  }, [offerTo, streamId])

  useEffect(() => {
    if (!hasStarted) return
    void syncViewers()
    const interval = window.setInterval(() => { void syncViewers() }, 2000)
    return () => window.clearInterval(interval)
  }, [hasStarted, syncViewers])

  const stopEverything = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    placeholderStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    displayStreamRef.current = null
    placeholderStreamRef.current = null
    micStreamRef.current = null
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    pendingIceRef.current.clear()
    offeredAtRef.current.clear()
    if (videoRef.current) videoRef.current.srcObject = null
    setSharing(false)
    setHasStarted(false)
    setHasMic(false)
    setMicOn(false)
    setScreenLabel("")
  }, [])

  const finish = useCallback(async () => {
    stopEverything()
    const token = getToken()
    if (token) await endStream(token, streamId).catch(() => {})
    router.push("/dashboard/live")
  }, [router, stopEverything, streamId])

  const pauseDisplay = useCallback(async (display: MediaStream) => {
    if (displayStreamRef.current !== display) return

    display.getTracks().forEach((track) => track.stop())
    const placeholder = createBlackVideoStream()
    const blackTrack = placeholder.getVideoTracks()[0]
    const micTracks = micStreamRef.current?.getAudioTracks() ?? []
    const media = new MediaStream([blackTrack, ...micTracks])

    placeholderStreamRef.current?.getTracks().forEach((track) => track.stop())
    placeholderStreamRef.current = placeholder
    displayStreamRef.current = null
    localStreamRef.current = media
    if (videoRef.current) videoRef.current.srcObject = media
    setSharing(false)
    setScreenLabel("Compartilhamento pausado")

    await Promise.all(
      [...pcsRef.current.values()].map(async (pc) => {
        const sender = pc.getSenders().find((item) => item.track?.kind === "video")
        if (sender) await sender.replaceTrack(blackTrack).catch(() => {})
      }),
    )
    toast.info("Compartilhamento pausado", { description: "A live continua aberta. Escolha outra tela quando quiser." })
  }, [])

  const watchDisplayEnd = useCallback((display: MediaStream) => {
    display.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (displayStreamRef.current === display) void pauseDisplay(display)
    })
  }, [pauseDisplay])

  const enableMicrophone = useCallback(async () => {
    const media = localStreamRef.current
    if (!media) return

    const existingTracks = micStreamRef.current?.getAudioTracks() ?? []
    if (existingTracks.length) {
      existingTracks.forEach((track) => { track.enabled = true })
      setMicOn(true)
      return
    }

    setMicBusy(true)
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const tracks = mic.getAudioTracks()
      if (!tracks.length) throw new Error("No microphone track")
      micStreamRef.current = mic
      tracks.forEach((track) => media.addTrack(track))
      setHasMic(true)
      setMicOn(true)
      await Promise.all([...viewersRef.current.values()].map((viewer) => offerTo(viewer.peerId)))
      toast.success("Microfone ativado")
    } catch {
      toast.error("Não foi possível ativar o microfone", { description: "Confira a permissão do navegador e tente novamente." })
    } finally {
      setMicBusy(false)
    }
  }, [offerTo])

  const startShare = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Seu navegador não suporta compartilhamento de tela.")
      return
    }

    setStartingShare(true)
    let display: MediaStream | null = null
    let mic: MediaStream | null = null
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: displayVideoConstraints(quality, frameRate),
        audio: true,
      })
      const displayTrack = display.getVideoTracks()[0]
      if (displayTrack) displayTrack.contentHint = frameRate === 60 ? "motion" : "detail"

      let micTracks: MediaStreamTrack[] = []
      if (withMic) {
        mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).catch(() => null)
        if (mic) {
          micStreamRef.current = mic
          micTracks = mic.getAudioTracks()
          setHasMic(micTracks.length > 0)
        } else {
          toast.warning("Microfone não liberado", { description: "Você pode tentar ativá-lo depois, durante a live." })
        }
      }

      const token = getToken()
      if (!token) throw new Error("Login required")
      if (!display) throw new Error("No display stream")

      const media = new MediaStream([...display.getTracks(), ...micTracks])
      displayStreamRef.current = display
      localStreamRef.current = media
      if (videoRef.current) videoRef.current.srcObject = media

      if (setupVisibility !== visibility) {
        const updated = await updateStreamVisibility(token, streamId, setupVisibility)
        setVisibility(updated.visibility)
      }
      await startStream(token, streamId)
      setSharing(true)
      setHasStarted(true)
      setMicOn(micTracks.some((track) => track.enabled))
      setScreenLabel(readableScreenLabel(display.getVideoTracks()[0]?.label))
      setSetupOpen(false)
      watchDisplayEnd(display)
      await Promise.all([...viewersRef.current.values()].map((viewer) => offerTo(viewer.peerId)))
    } catch (caught: unknown) {
      display?.getTracks().forEach((track) => track.stop())
      mic?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      displayStreamRef.current = null
      micStreamRef.current = null
      setHasMic(false)
      setMicOn(false)
      const message = caught instanceof Error && caught.name === "NotAllowedError"
        ? "Você cancelou a seleção de tela."
        : caught instanceof Error ? caught.message : "Não foi possível iniciar a transmissão."
      setError(message)
    } finally {
      setStartingShare(false)
    }
  }

  const switchScreen = async () => {
    if (switchingScreen) return
    setSwitchingScreen(true)
    setError(null)

    let nextDisplay: MediaStream | null = null
    try {
      nextDisplay = await navigator.mediaDevices.getDisplayMedia({
        video: displayVideoConstraints(quality, frameRate),
        audio: true,
      })
      const nextDisplayTrack = nextDisplay.getVideoTracks()[0]
      if (nextDisplayTrack) nextDisplayTrack.contentHint = frameRate === 60 ? "motion" : "detail"
      const previousDisplay = displayStreamRef.current
      const previousPlaceholder = placeholderStreamRef.current
      const micTracks = micStreamRef.current?.getAudioTracks() ?? []
      const media = new MediaStream([...nextDisplay.getTracks(), ...micTracks])

      displayStreamRef.current = nextDisplay
      placeholderStreamRef.current = null
      localStreamRef.current = media
      if (videoRef.current) videoRef.current.srcObject = media
      setSharing(true)
      setScreenLabel(readableScreenLabel(nextDisplay.getVideoTracks()[0]?.label))
      watchDisplayEnd(nextDisplay)

      await Promise.all([...viewersRef.current.values()].map((viewer) => offerTo(viewer.peerId)))
      previousDisplay?.getTracks().forEach((track) => track.stop())
      previousPlaceholder?.getTracks().forEach((track) => track.stop())
      toast.success("Tela trocada", { description: "A live continuou no mesmo link." })
    } catch (caught: unknown) {
      nextDisplay?.getTracks().forEach((track) => track.stop())
      if (caught instanceof Error && caught.name !== "NotAllowedError") {
        setError("Não foi possível trocar a tela. Tente novamente.")
      }
    } finally {
      setSwitchingScreen(false)
    }
  }

  const toggleMicrophone = async () => {
    const tracks = micStreamRef.current?.getAudioTracks() ?? []
    if (!tracks.length) {
      await enableMicrophone()
      return
    }
    const next = !micOn
    tracks.forEach((track) => { track.enabled = next })
    setMicOn(next)
  }

  const changeVisibility = async (next: Visibility) => {
    const token = getToken()
    if (!token || next === visibility) {
      setPrivacyOpen(false)
      return
    }

    setSavingPrivacy(true)
    try {
      const updated = await updateStreamVisibility(token, streamId, next)
      setVisibility(updated.visibility)
      setSetupVisibility(updated.visibility)
      setPrivacyOpen(false)
      toast.success(next === "PUBLIC" ? "Live pública" : "Live privada", {
        description: next === "PUBLIC" ? "Qualquer pessoa com o link pode assistir." : "Agora só pessoas logadas podem assistir.",
      })
    } catch (caught: unknown) {
      toast.error("Não foi possível mudar a privacidade", { description: caught instanceof Error ? caught.message : undefined })
    } finally {
      setSavingPrivacy(false)
    }
  }

  const copyLink = async () => {
    const path = `/live/${stream.slug}`
    await navigator.clipboard.writeText(`${window.location.origin}${path}`)
    setCopied(true)
    toast.success("Link copiado", { description: visibility === "PUBLIC" ? "Qualquer pessoa com o link pode assistir." : "Pessoas precisam entrar no Timbas para assistir." })
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => () => {
    stopEverything()
    const token = getToken()
    if (token) void leaveStream(token, streamId, peerIdRef.current)
  }, [stopEverything, streamId])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <Radio className={`h-5 w-5 text-red-400 ${sharing ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">{stream.title}</h1>
            <p className="text-xs text-gray-500">@{stream.hostName} · {sharing ? "Você está transmitindo" : hasStarted ? "Live aberta, sem tela compartilhada" : "Escolha a tela para começar"}{connected ? "" : " · reconectando"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gray-300 ring-1 ring-white/[0.08]"><Users className="h-3.5 w-3.5" />{viewers.length}</span>
          <button onClick={() => setPrivacyOpen(true)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]">
            {visibility === "PUBLIC" ? <Globe2 className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3.5 w-3.5 text-amber-300" />}
            {visibility === "PUBLIC" ? "Pública" : "Privada"}
          </button>
          <button onClick={copyLink} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar link
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
        <div className="relative aspect-video w-full">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
          {!sharing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#07070c] px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20"><MonitorUp className="h-7 w-7 text-blue-400" /></div>
              <div><p className="text-sm font-bold text-white">{hasStarted ? "A live continua aberta" : "Sua live está pronta para configurar"}</p><p className="mt-1 text-xs text-gray-500">{hasStarted ? "Os espectadores estão vendo uma tela preta até você escolher outra tela." : "Escolha a privacidade, o microfone e depois selecione a tela."}</p></div>
              <button onClick={() => { if (hasStarted) void switchScreen(); else setSetupOpen(true) }} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"><MonitorUp className="h-4 w-4" />{hasStarted ? "Escolher outra tela" : "Configurar e iniciar"}</button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
          {sharing && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${micOn ? "bg-emerald-400" : "bg-red-400"}`} />
              {micOn ? "Microfone ligado" : "Microfone desligado"}
            </div>
          )}
        </div>
      </div>

      {hasStarted && (
        <div className="space-y-2">
          <HostLiveControls
            micOn={micOn}
            hasMic={hasMic}
            micBusy={micBusy}
            switchingScreen={switchingScreen}
            screenLabel={screenLabel}
            onToggleMicrophone={toggleMicrophone}
            onSwitchScreen={switchScreen}
            onFinish={finish}
          />
          {error && <p className="text-xs text-amber-300">{error}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500"><Users className="h-3.5 w-3.5" />Assistindo agora</div>
        {viewers.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-gray-500"><Link2 className="h-3.5 w-3.5" />Ninguém entrou ainda. Manda o link para a galera.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {viewers.map((viewer) => <span key={viewer.peerId} className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-semibold text-gray-200 ring-1 ring-white/[0.08]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[9px] font-bold">{viewer.name.slice(0, 2).toUpperCase()}</span>{viewer.name}</span>)}
          </div>
        )}
      </div>

      <LiveSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        hostName={stream.hostName}
        avatarUrl={avatarUrl}
        liveUrl={liveUrl}
        visibility={setupVisibility}
        onVisibilityChange={setSetupVisibility}
        quality={quality}
        onQualityChange={setQuality}
        frameRate={frameRate}
        onFrameRateChange={setFrameRate}
        withMic={withMic}
        onWithMicChange={setWithMic}
        starting={startingShare}
        onStart={startShare}
      />

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="border-white/[0.09] bg-[#101014] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Privacidade da live</DialogTitle>
            <DialogDescription className="text-gray-400">Escolha quem pode abrir o link. Você pode mudar isso enquanto estiver ao vivo.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-3">
            <button disabled={savingPrivacy} onClick={() => { void changeVisibility("MEMBERS") }} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait ${visibility === "MEMBERS" ? "border-blue-500/60 bg-blue-500/10" : "border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05]"}`}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10"><Lock className="h-4 w-4 text-amber-300" /></span>
              <span><span className="block text-sm font-bold text-white">Privada</span><span className="mt-1 block text-xs leading-relaxed text-gray-400">Apenas pessoas logadas no Timbas podem assistir.</span></span>
            </button>
            <button disabled={savingPrivacy} onClick={() => { void changeVisibility("PUBLIC") }} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait ${visibility === "PUBLIC" ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05]"}`}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10"><Globe2 className="h-4 w-4 text-emerald-300" /></span>
              <span><span className="block text-sm font-bold text-white">Pública</span><span className="mt-1 block text-xs leading-relaxed text-gray-400">Qualquer pessoa com o link pode assistir, mesmo sem login.</span></span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
