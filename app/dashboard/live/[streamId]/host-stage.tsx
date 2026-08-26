"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Globe2, Link2, Lock, MonitorUp, Radio, Users } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getDiscordAvatarUrl, getToken } from "@/lib/auth"
import { getStreamPermission, updateStreamVisibility, type StreamPeer, type StreamSummary } from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"
import { HostLiveControls } from "./host-live-controls"
import { LiveSetupDialog, type LiveSetupValues } from "./live-setup-dialog"
import { useHostBroadcast } from "./use-host-broadcast"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
  initialViewers: StreamPeer[]
  onReconnect: () => Promise<void>
}

type Visibility = "MEMBERS" | "PUBLIC"

export function HostStage({ streamId, peerId, stream, initialViewers, onReconnect }: Props) {
  const router = useRouter()
  const broadcast = useHostBroadcast(streamId, peerId, initialViewers, stream.live)
  const { resetPeers } = broadcast
  const previousPeerIdRef = useRef(peerId)

  const [setupOpen, setSetupOpen] = useState(true)
  const [setup, setSetup] = useState<LiveSetupValues>({
    visibility: stream.visibility,
    quality: "1080p",
    frameRate: 60,
    withMic: true,
    withGameAudio: true,
    announce: false,
  })
  const [visibility, setVisibility] = useState<Visibility>(stream.visibility)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)
  const [limit720p30fps, setLimit720p30fps] = useState(false)

  const connected = useSignalChannel(streamId, peerId, broadcast.handleEvent, true, undefined, onReconnect)
  const liveUrl = origin ? `${origin}/live/${stream.slug}` : ""
  const avatarUrl = getDiscordAvatarUrl(stream.hostDiscordId ?? undefined, stream.hostAvatar ?? undefined, 96)

  useEffect(() => {
    setOrigin(window.location.origin)
    const token = getToken()
    if (token) {
      void getStreamPermission(token).then((permission) => {
        if (!permission.limit720p30fps) return
        setLimit720p30fps(true)
        setSetup((current) => ({ ...current, quality: "720p", frameRate: 30 }))
      })
    }
  }, [])

  // A dropped signaling session comes back with a new peer id, so the old
  // connections belong to an identity that no longer exists.
  useEffect(() => {
    if (previousPeerIdRef.current === peerId) return
    previousPeerIdRef.current = peerId
    resetPeers(initialViewers)
  }, [initialViewers, peerId, resetPeers])

  const startBroadcast = async () => {
    const token = getToken()
    const serverLimit = token
      ? Boolean((await getStreamPermission(token).catch(() => null))?.limit720p30fps)
      : limit720p30fps
    if (serverLimit && !limit720p30fps) {
      setLimit720p30fps(true)
      setSetup((current) => ({ ...current, quality: "720p", frameRate: 30 }))
    }
    const started = await broadcast.start({
      profile: serverLimit ? { quality: "720p", frameRate: 30 } : { quality: setup.quality, frameRate: setup.frameRate },
      visibility: setup.visibility,
      withMic: setup.withMic,
      withGameAudio: setup.withGameAudio,
      announce: setup.announce,
    })
    if (!started) return
    setVisibility(setup.visibility)
    setSetupOpen(false)
  }

  const finishBroadcast = async () => {
    await broadcast.finish()
    router.push("/dashboard/live")
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
      setSetup((current) => ({ ...current, visibility: updated.visibility }))
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
    await navigator.clipboard.writeText(`${window.location.origin}/live/${stream.slug}`)
    setCopied(true)
    toast.success("Link copiado", {
      description: visibility === "PUBLIC" ? "Qualquer pessoa com o link pode assistir." : "Pessoas precisam entrar no Timbas para assistir.",
    })
    window.setTimeout(() => setCopied(false), 2000)
  }

  const statusLine = broadcast.sharing
    ? "Você está transmitindo"
    : broadcast.hasStarted ? "Live aberta, sem tela compartilhada" : "Escolha a tela para começar"

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <Radio className={`h-5 w-5 text-red-400 ${broadcast.sharing ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">{stream.title}</h1>
            <p className="text-xs text-gray-500">
              @{stream.hostName} · {statusLine}{connected ? "" : " · reconectando"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gray-300 ring-1 ring-white/[0.08]">
            <Users className="h-3.5 w-3.5" />{broadcast.viewers.length}
          </span>
          <button
            onClick={() => setPrivacyOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]"
          >
            {visibility === "PUBLIC" ? <Globe2 className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3.5 w-3.5 text-amber-300" />}
            {visibility === "PUBLIC" ? "Pública" : "Privada"}
          </button>
          <button
            onClick={() => { void copyLink() }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar link
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
        <div className="relative aspect-video w-full">
          <video ref={broadcast.previewRef} autoPlay playsInline muted className="h-full w-full object-contain" />

          {!broadcast.sharing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#07070c] px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <MonitorUp className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{broadcast.hasStarted ? "A live continua aberta" : "Sua live está pronta para configurar"}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {broadcast.hasStarted
                    ? "Quem está assistindo vê o último quadro congelado até você escolher outra tela."
                    : "Ajuste imagem, som e privacidade e depois selecione a tela."}
                </p>
              </div>
              <button
                onClick={() => { if (broadcast.hasStarted) void broadcast.switchScreen(); else setSetupOpen(true) }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                <MonitorUp className="h-4 w-4" />
                {broadcast.hasStarted ? "Escolher outra tela" : "Configurar e iniciar"}
              </button>
              {broadcast.error && <p className="text-xs text-red-400">{broadcast.error}</p>}
            </div>
          )}

          {broadcast.sharing && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${broadcast.micOn ? "bg-emerald-400" : "bg-red-400"}`} />
              {broadcast.micOn ? "Microfone ligado" : "Microfone desligado"}
              <span className="text-white/30">|</span>
              <span className={`h-2 w-2 rounded-full ${broadcast.gameAudioState === "live" ? "bg-emerald-400" : broadcast.gameAudioState === "silent" ? "bg-amber-400" : "bg-red-400"}`} />
              {broadcast.gameAudioState === "live" ? "Som do jogo" : broadcast.gameAudioState === "silent" ? "Som mudo" : "Sem som do jogo"}
            </div>
          )}
        </div>
      </div>

      {broadcast.hasStarted && (
        <div className="space-y-2">
          <HostLiveControls
            micOn={broadcast.micOn}
            micReady={broadcast.micReady}
            micBusy={broadcast.micBusy}
            gameAudioState={broadcast.gameAudioState}
            gameAudioLabel={broadcast.gameAudioLabel}
            gameAudioBusy={broadcast.gameAudioBusy}
            audioInputs={broadcast.audioInputs}
            levels={broadcast.levels}
            stats={broadcast.stats}
            screenLabel={broadcast.screen?.label ?? ""}
            switchingScreen={broadcast.switchingScreen}
            onToggleMic={() => { void broadcast.toggleMic() }}
            onConnectGameAudio={(deviceId) => { void broadcast.connectGameAudio(deviceId) }}
            onDisconnectGameAudio={broadcast.disconnectGameAudio}
            onVolumeChange={broadcast.setVolume}
            onSwitchScreen={() => { void broadcast.switchScreen() }}
            onFinish={() => { void finishBroadcast() }}
          />
          {broadcast.error && <p className="text-xs text-amber-300">{broadcast.error}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
          <Users className="h-3.5 w-3.5" />Assistindo agora
        </div>
        {broadcast.viewers.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-gray-500">
            <Link2 className="h-3.5 w-3.5" />Ninguém entrou ainda. Manda o link para a galera.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {broadcast.viewers.map((viewer) => (
              <span key={viewer.peerId} className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-semibold text-gray-200 ring-1 ring-white/[0.08]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[9px] font-bold">{viewer.name.slice(0, 2).toUpperCase()}</span>
                {viewer.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <LiveSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        hostName={stream.hostName}
        avatarUrl={avatarUrl}
        liveUrl={liveUrl}
        values={setup}
        limit720p30fps={limit720p30fps}
        onChange={(patch) => setSetup((current) => ({ ...current, ...patch }))}
        loopbackDevices={broadcast.loopbackDevices}
        starting={broadcast.starting}
        onStart={() => { void startBroadcast() }}
      />

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="border-white/[0.09] bg-[#101014] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Privacidade da live</DialogTitle>
            <DialogDescription className="text-gray-400">Escolha quem pode abrir o link. Dá para mudar isso no meio da transmissão.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-3">
            <button
              disabled={savingPrivacy}
              onClick={() => { void changeVisibility("MEMBERS") }}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait ${visibility === "MEMBERS" ? "border-blue-500/60 bg-blue-500/10" : "border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05]"}`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10"><Lock className="h-4 w-4 text-amber-300" /></span>
              <span>
                <span className="block text-sm font-bold text-white">Privada</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-400">Apenas pessoas logadas no Timbas podem assistir.</span>
              </span>
            </button>
            <button
              disabled={savingPrivacy}
              onClick={() => { void changeVisibility("PUBLIC") }}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait ${visibility === "PUBLIC" ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05]"}`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10"><Globe2 className="h-4 w-4 text-emerald-300" /></span>
              <span>
                <span className="block text-sm font-bold text-white">Pública</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-400">Qualquer pessoa com o link pode assistir, mesmo sem login.</span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
