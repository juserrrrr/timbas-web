"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Globe2, Link2, Lock, Mic, MicOff, MonitorUp, Radio, Square, Users } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getToken } from "@/lib/auth"
import { getIceServers } from "@/lib/webrtc"
import { endStream, getStreamViewers, sendSignal, startStream, updateStreamVisibility, type SignalEvent, type StreamPeer, type StreamSummary } from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
  initialViewers: StreamPeer[]
}

type Visibility = "MEMBERS" | "PUBLIC"

export function HostStage({ streamId, peerId, stream, initialViewers }: Props) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const pcsRef = useRef(new Map<string, RTCPeerConnection>())
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const offeredAtRef = useRef(new Map<string, number>())
  const viewersRef = useRef(new Map(initialViewers.map((viewer) => [viewer.peerId, viewer])))
  const iceServersRef = useRef<RTCIceServer[]>([])

  const [viewers, setViewers] = useState<StreamPeer[]>(initialViewers)
  const [sharing, setSharing] = useState(false)
  const [withMic, setWithMic] = useState(true)
  const [micOn, setMicOn] = useState(false)
  const [hasMic, setHasMic] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [visibility, setVisibility] = useState<Visibility>(stream.visibility)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const offerTo = useCallback(async (target: string) => {
    const media = localStreamRef.current
    const token = getToken()
    if (!media || !token) return

    pcsRef.current.get(target)?.close()
    offeredAtRef.current.set(target, Date.now())
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    pcsRef.current.set(target, pc)

    media.getTracks().forEach((track) => pc.addTrack(track, media))
    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      void sendSignal(token, streamId, { from: peerId, to: target, type: "ice", data: event.candidate.toJSON() })
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        setError("A conexão com um espectador falhou. Ele pode atualizar a página para tentar novamente.")
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sendSignal(token, streamId, { from: peerId, to: target, type: "offer", data: offer })
  }, [peerId, streamId])

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

  const connected = useSignalChannel(streamId, peerId, handleEvent)

  useEffect(() => {
    const token = getToken()
    if (token) void getIceServers(token).then((servers) => { iceServersRef.current = servers })
  }, [])

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
    if (!sharing) return
    void syncViewers()
    const interval = window.setInterval(() => { void syncViewers() }, 2000)
    return () => window.clearInterval(interval)
  }, [sharing, syncViewers])

  const stopEverything = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    micStreamRef.current = null
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    pendingIceRef.current.clear()
    offeredAtRef.current.clear()
    if (videoRef.current) videoRef.current.srcObject = null
    setSharing(false)
    setHasMic(false)
    setMicOn(false)
  }, [])

  const finish = useCallback(async () => {
    stopEverything()
    const token = getToken()
    if (token) await endStream(token, streamId).catch(() => {})
    router.push("/dashboard/live")
  }, [router, stopEverything, streamId])

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

    let display: MediaStream | null = null
    let mic: MediaStream | null = null
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
      })

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
      localStreamRef.current = media
      if (videoRef.current) videoRef.current.srcObject = media
      setSharing(true)
      setMicOn(micTracks.some((track) => track.enabled))

      // Start only after local media is ready. A viewer arriving right now can
      // receive an offer immediately instead of waiting for another action.
      await startStream(token, streamId)
      display.getVideoTracks()[0]?.addEventListener("ended", () => { void finish() })
      await Promise.all([...viewersRef.current.values()].map((viewer) => offerTo(viewer.peerId)))
    } catch (caught: unknown) {
      display?.getTracks().forEach((track) => track.stop())
      mic?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      micStreamRef.current = null
      setHasMic(false)
      setMicOn(false)
      const message = caught instanceof Error && caught.name === "NotAllowedError"
        ? "Você cancelou a seleção de tela."
        : "Não foi possível capturar a tela."
      setError(message)
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
    const path = visibility === "PUBLIC" ? `/live/${streamId}` : `/dashboard/live/${streamId}/watch`
    await navigator.clipboard.writeText(`${window.location.origin}${path}`)
    setCopied(true)
    toast.success("Link copiado", { description: visibility === "PUBLIC" ? "Qualquer pessoa com o link pode assistir." : "Pessoas precisam entrar no Timbas para assistir." })
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => () => stopEverything(), [stopEverything])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <Radio className={`h-5 w-5 text-red-400 ${sharing ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">{stream.title}</h1>
            <p className="text-xs text-gray-500">{sharing ? "Você está transmitindo" : "Escolha a tela para começar"}{connected ? "" : " • reconectando"}</p>
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
              <div><p className="text-sm font-bold text-white">Escolha o que compartilhar</p><p className="mt-1 text-xs text-gray-500">Uma aba, uma janela ou a tela inteira.</p></div>
              <button
                onClick={() => setWithMic((value) => !value)}
                aria-pressed={withMic}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ring-1 transition-colors ${withMic ? "bg-blue-500/10 text-blue-200 ring-blue-500/25 hover:bg-blue-500/15" : "bg-white/[0.03] text-gray-400 ring-white/[0.08] hover:bg-white/[0.06]"}`}
              >
                {withMic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {withMic ? "Começar com microfone" : "Começar sem microfone"}
              </button>
              <p className="-mt-2 text-[11px] text-gray-600">Você pode ligar ou desligar o microfone a qualquer momento.</p>
              <button onClick={startShare} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"><MonitorUp className="h-4 w-4" />Compartilhar tela</button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {sharing && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { void toggleMicrophone() }}
            disabled={micBusy}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition-colors disabled:cursor-wait disabled:opacity-60 ${micOn ? "bg-white/[0.04] text-gray-200 ring-white/[0.08] hover:bg-white/[0.08]" : "bg-red-500/10 text-red-300 ring-red-500/20 hover:bg-red-500/15"}`}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {micBusy ? "Ativando microfone…" : micOn ? "Microfone ligado" : hasMic ? "Microfone mudo" : "Ativar microfone"}
          </button>
          <button onClick={() => { void finish() }} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500"><Square className="h-4 w-4" />Encerrar transmissão</button>
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
