"use client"

import { useState } from "react"
import { Bell, BellOff, Check, Copy, Gauge, Globe2, Info, Link2, Lock, Mic, MicOff, MonitorUp, Volume2, VolumeX } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { VideoFrameRate, VideoQuality } from "@/lib/live/tuning"

type Visibility = "MEMBERS" | "PUBLIC"

export interface LiveSetupValues {
  visibility: Visibility
  quality: VideoQuality
  frameRate: VideoFrameRate
  withMic: boolean
  withGameAudio: boolean
  /// Avisar o servidor no Discord. Começa desligado de propósito: o anúncio
  /// marca todo mundo e não tem como voltar atrás depois de enviado.
  announce: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  hostName: string
  avatarUrl: string | null
  liveUrl: string
  values: LiveSetupValues
  onChange: (patch: Partial<LiveSetupValues>) => void
  loopbackDevices: MediaDeviceInfo[]
  starting: boolean
  limit720p30fps?: boolean
  onStart: () => void
}

export function LiveSetupDialog({
  open,
  onOpenChange,
  hostName,
  avatarUrl,
  liveUrl,
  values,
  onChange,
  loopbackDevices,
  starting,
  limit720p30fps = false,
  onStart,
}: Props) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    if (!liveUrl) return
    await navigator.clipboard.writeText(liveUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!starting) onOpenChange(next) }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-white/[0.09] bg-[#101014] p-0 text-white sm:max-w-xl">
        <div className="shrink-0 border-b border-white/[0.07] bg-gradient-to-br from-blue-500/10 via-transparent to-red-500/10 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Preparar transmissão</DialogTitle>
            <DialogDescription className="text-gray-400">Ajuste imagem e som antes de escolher a tela.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3">
            <Avatar className="h-11 w-11 ring-2 ring-blue-500/25">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={hostName} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-sm font-black text-white">
                {hostName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Transmitindo como</p>
              <p className="truncate text-sm font-black text-white">@{hostName}</p>
              <p className="text-[11px] text-blue-300">Nick único na plataforma</p>
            </div>
          </div>
        </div>

        <div className="live-modal-scrollbar min-h-0 min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-4 pb-5 sm:px-6">
          <section className="min-w-0">
            <SectionTitle icon={<Link2 className="h-3.5 w-3.5" />}>Link da live</SectionTitle>
            <div className="flex gap-2">
              <div className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-gray-300">
                {liveUrl || "Preparando link..."}
              </div>
              <button
                type="button"
                onClick={() => { void copyLink() }}
                disabled={!liveUrl}
                aria-label="Copiar link da live"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-gray-200 ring-1 ring-white/[0.09] transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </section>

          <section>
            <SectionTitle icon={<Gauge className="h-3.5 w-3.5" />}>Qualidade da imagem</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "720p", label: "HD", detail: "720p, leve" },
                { value: "1080p", label: "Full HD", detail: "1080p, ideal" },
                { value: "source", label: "Original", detail: "Sua resolução" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ quality: option.value })}
                  disabled={limit720p30fps && option.value !== "720p"}
                  className={`min-w-0 cursor-pointer rounded-xl border px-2 py-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${values.quality === option.value ? "border-blue-500/60 bg-blue-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}
                >
                  <span className="block truncate text-xs font-black text-white">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] text-gray-500">{option.detail}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                { fps: 30 as const, hint: "texto mais nítido" },
                { fps: 60 as const, hint: "movimento mais liso" },
              ]).map((option) => (
                <button
                  key={option.fps}
                  type="button"
                  onClick={() => onChange({ frameRate: option.fps })}
                  disabled={limit720p30fps && option.fps !== 30}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${values.frameRate === option.fps ? "border-emerald-500/60 bg-emerald-500/10 text-white" : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]"}`}
                >
                  {option.fps} FPS <span className="font-normal text-gray-500">{option.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
              Para gameplay, Full HD com 60 FPS é o combo mais parecido com o que você vê na tela. Em internet fraca, 1080p com 30 FPS segura melhor.
            </p>
          </section>

          <section>
            <SectionTitle icon={<Volume2 className="h-3.5 w-3.5" />}>Som do jogo</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                active={values.withGameAudio}
                onClick={() => onChange({ withGameAudio: true })}
                icon={<Volume2 className="h-4 w-4 text-blue-300" />}
                title="Com som do PC"
                detail="A galera ouve o LoL junto com a imagem."
              />
              <ChoiceCard
                active={!values.withGameAudio}
                onClick={() => onChange({ withGameAudio: false })}
                icon={<VolumeX className="h-4 w-4 text-gray-500" />}
                title="Só a imagem"
                detail="Nenhum som do computador é enviado."
                tone="neutral"
              />
            </div>

            {values.withGameAudio && (
              <div className="mt-2 flex gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="min-w-0 text-[11px] leading-relaxed text-gray-300">
                  <p className="font-bold text-amber-200">No seletor do Chrome, escolha Tela inteira e marque Compartilhar áudio do sistema.</p>
                  <p className="mt-1 text-gray-400">
                    Compartilhar apenas a janela do LoL sempre vai mudo: o Chrome não deixa uma janela enviar som.
                    {loopbackDevices.length > 0
                      ? ` Como o seu PC tem "${loopbackDevices[0].label}", o Timbas pega o som por ali sozinho se isso acontecer.`
                      : " Se preferir compartilhar só a janela, dá para conectar o som depois pelo botão Áudio do jogo."}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Microfone ao iniciar</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard
                active={values.withMic}
                onClick={() => onChange({ withMic: true })}
                icon={<Mic className={`h-4 w-4 ${values.withMic ? "text-emerald-300" : "text-gray-500"}`} />}
                title="Ligado"
                detail="Tela, som do jogo e sua voz."
                tone="emerald"
              />
              <ChoiceCard
                active={!values.withMic}
                onClick={() => onChange({ withMic: false })}
                icon={<MicOff className={`h-4 w-4 ${!values.withMic ? "text-red-300" : "text-gray-500"}`} />}
                title="Desligado"
                detail="Você liga a voz durante a live."
                tone="red"
              />
            </div>
          </section>

          <section>
            <SectionTitle>Avisar no Discord</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                active={!values.announce}
                onClick={() => onChange({ announce: false })}
                icon={<BellOff className={`h-4 w-4 ${!values.announce ? "text-gray-300" : "text-gray-500"}`} />}
                title="Subir em silêncio"
                detail="Ninguém é marcado. Você manda o link para quem quiser."
              />
              <ChoiceCard
                active={values.announce}
                onClick={() => onChange({ announce: true })}
                icon={<Bell className={`h-4 w-4 ${values.announce ? "text-amber-300" : "text-gray-500"}`} />}
                title="Anunciar no canal"
                detail="O bot avisa no canal configurado. Só sai uma vez."
                tone="amber"
              />
            </div>
          </section>

          <section>
            <SectionTitle>Quem pode assistir</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                active={values.visibility === "MEMBERS"}
                onClick={() => onChange({ visibility: "MEMBERS" })}
                icon={<Lock className="h-4 w-4 text-amber-300" />}
                title="Somente membros"
                detail="Precisa estar logado no Timbas."
              />
              <ChoiceCard
                active={values.visibility === "PUBLIC"}
                onClick={() => onChange({ visibility: "PUBLIC" })}
                icon={<Globe2 className="h-4 w-4 text-emerald-300" />}
                title="Link público"
                detail="Qualquer pessoa com o link entra."
                tone="emerald"
              />
            </div>
          </section>
        </div>

        <DialogFooter className="relative z-10 shrink-0 border-t border-white/[0.08] bg-[#101014]/95 px-4 py-4 shadow-[0_-14px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
          >
            <MonitorUp className="h-4 w-4" />
            {starting ? "Preparando transmissão..." : "Escolher tela e iniciar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
      {icon}
      {children}
    </div>
  )
}

function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  detail,
  tone = "blue",
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  detail: string
  tone?: "blue" | "emerald" | "red" | "amber" | "neutral"
}) {
  const activeRing =
    tone === "emerald" ? "border-emerald-500/60 bg-emerald-500/10"
      : tone === "red" ? "border-red-500/50 bg-red-500/10"
        : tone === "amber" ? "border-amber-500/60 bg-amber-500/10"
          : tone === "neutral" ? "border-white/25 bg-white/[0.06]"
            : "border-blue-500/60 bg-blue-500/10"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${active ? activeRing : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/30">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-gray-400">{detail}</span>
      </span>
    </button>
  )
}
