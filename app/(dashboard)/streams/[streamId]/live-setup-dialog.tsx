"use client"

import { useState, type ComponentType } from "react"
import { AlertCircle, Bell, Check, ChevronDown, Copy, Gauge, Globe2, Lock, Mic, MonitorUp, Volume2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import type { VideoFrameRate, VideoQuality } from "@/lib/live/tuning"

type Visibility = "MEMBERS" | "PUBLIC"

export interface LiveSetupValues {
  /// Nome da live. Já nasce preenchido, então quem só quer subir rápido não
  /// precisa parar para escrever nada.
  title: string
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
  error?: string | null
  onStart: () => void
}

const QUALITY_LABEL: Record<VideoQuality, string> = {
  "720p": "HD",
  "1080p": "Full HD",
  source: "Original",
}

/// O modal é a última parada antes de a live subir, então mostra o que a pessoa
/// decide em um olhar: nome, quem entra e os três interruptores. Resolução,
/// link e as manhas do Chrome ficam dobrados embaixo, para quem quiser.
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
  error,
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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-white/[0.09] bg-[#101014] p-0 text-white sm:max-w-lg">
        <div className="shrink-0 border-b border-white/[0.07] bg-gradient-to-br from-blue-500/10 via-transparent to-red-500/10 px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Preparar transmissão</DialogTitle>
            <DialogDescription className="text-[13px] text-gray-400">
              Confere o básico e escolhe a tela. Tudo isso dá para mudar depois, já no ar.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="live-modal-scrollbar min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-5 py-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="live-title" className="text-xs font-black uppercase tracking-wider text-gray-500">Nome da live</label>
              <span className="text-[10px] font-bold text-gray-600">{values.title.length}/80</span>
            </div>
            <input
              id="live-title"
              value={values.title}
              onChange={(event) => onChange({ title: event.target.value.slice(0, 80) })}
              placeholder={`Live do ${hostName}`}
              className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm font-bold text-white outline-none transition-colors placeholder:font-normal placeholder:text-gray-600 focus:border-blue-500/60"
            />
            <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
              <Avatar className="h-5 w-5 ring-1 ring-blue-500/25">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={hostName} />}
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-[8px] font-black text-white">
                  {hostName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              Transmitindo como <span className="font-bold text-gray-300">@{hostName}</span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-black uppercase tracking-wider text-gray-500">Quem pode entrar</p>
            <div className="grid grid-cols-2 gap-2">
              <PickPill
                active={values.visibility === "MEMBERS"}
                onClick={() => onChange({ visibility: "MEMBERS" })}
                icon={Lock}
                label="Só membros"
                hint="Precisa estar logado"
                tone="amber"
              />
              <PickPill
                active={values.visibility === "PUBLIC"}
                onClick={() => onChange({ visibility: "PUBLIC" })}
                icon={Globe2}
                label="Link público"
                hint="Qualquer um com o link"
                tone="emerald"
              />
            </div>
          </div>

          <div className="space-y-2">
            <ToggleRow
              icon={Volume2}
              title="Som do jogo"
              hint={values.withGameAudio
                ? "Na hora de escolher, marque Compartilhar áudio do sistema."
                : "A live sobe sem o som do computador."}
              checked={values.withGameAudio}
              onChange={(next) => onChange({ withGameAudio: next })}
            />
            <ToggleRow
              icon={Mic}
              title="Seu microfone"
              hint={values.withMic ? "Você entra no ar já falando." : "Dá para abrir a voz durante a live."}
              checked={values.withMic}
              onChange={(next) => onChange({ withMic: next })}
            />
            <ToggleRow
              icon={Bell}
              title="Avisar no Discord"
              hint={values.announce ? "O bot marca o canal uma vez quando você subir." : "Ninguém é marcado. Você manda o link."}
              checked={values.announce}
              onChange={(next) => onChange({ announce: next })}
            />
          </div>

          <details className="group rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <Gauge className="h-3.5 w-3.5 text-gray-500" />
                Imagem e link
              </span>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                {QUALITY_LABEL[values.quality]} · {values.frameRate} FPS
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>

            <div className="space-y-3 border-t border-white/[0.06] p-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "720p", detail: "leve" },
                  { value: "1080p", detail: "ideal" },
                  { value: "source", detail: "sua tela" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange({ quality: option.value })}
                    disabled={limit720p30fps && option.value !== "720p"}
                    className={`min-w-0 cursor-pointer rounded-xl border px-2 py-2.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${values.quality === option.value ? "border-blue-500/60 bg-blue-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}
                  >
                    <span className="block truncate text-xs font-black text-white">{QUALITY_LABEL[option.value]}</span>
                    <span className="mt-0.5 block text-[10px] text-gray-500">{option.detail}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([
                  { fps: 30 as const, hint: "texto nítido" },
                  { fps: 60 as const, hint: "movimento liso" },
                ]).map((option) => (
                  <button
                    key={option.fps}
                    type="button"
                    onClick={() => onChange({ frameRate: option.fps })}
                    disabled={limit720p30fps && option.fps !== 30}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${values.frameRate === option.fps ? "border-emerald-500/60 bg-emerald-500/10 text-white" : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]"}`}
                  >
                    {option.fps} FPS <span className="font-normal text-gray-500">{option.hint}</span>
                  </button>
                ))}
              </div>

              <p className="text-[11px] leading-relaxed text-gray-500">
                {limit720p30fps
                  ? "Sua conta está limitada a 720p com 30 FPS pelo administrador."
                  : "Para gameplay, Full HD com 60 FPS é o mais parecido com o que você vê. Em internet fraca, 30 FPS segura melhor."}
              </p>

              {values.withGameAudio && (
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  O Chrome só manda som quando você escolhe Tela inteira e marca Compartilhar áudio do sistema. Janela solta sempre vai muda.
                  {loopbackDevices.length > 0
                    ? ` Se acontecer, o Timbas pega o som pela "${loopbackDevices[0].label}" sozinho.`
                    : " Se acontecer, dá para conectar o som depois pelo botão Áudio do jogo."}
                </p>
              )}

              <div className="flex gap-2">
                <div className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-gray-400">
                  {liveUrl || "Preparando link..."}
                </div>
                <button
                  type="button"
                  onClick={() => { void copyLink() }}
                  disabled={!liveUrl}
                  aria-label="Copiar link da live"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-gray-200 ring-1 ring-white/[0.09] transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </details>
        </div>

        <DialogFooter className="relative z-10 shrink-0 flex-col gap-0 border-t border-white/[0.08] bg-[#101014]/95 px-5 py-4 shadow-[0_-14px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:flex-col">
          {error && (
            <p className="mb-2.5 flex w-full items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2 text-[11px] leading-relaxed text-red-300">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
          >
            <MonitorUp className="h-4 w-4" />
            {starting ? "Escolha a tela na janela do navegador..." : "Escolher tela e começar"}
          </button>
          <p className="mt-2 w-full text-center text-[11px] text-gray-500">
            O navegador vai perguntar qual tela você quer mostrar.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PickPill({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
  tone,
}: {
  active: boolean
  onClick: () => void
  icon: ComponentType<{ className?: string }>
  label: string
  hint: string
  tone: "amber" | "emerald"
}) {
  const activeSkin = tone === "emerald"
    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
    : "border-amber-500/60 bg-amber-500/10 text-amber-200"

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${active ? activeSkin : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]"}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-black text-white">{label}</span>
        <span className="block truncate text-[10px] text-gray-500">{hint}</span>
      </span>
    </button>
  )
}

function ToggleRow({
  icon: Icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-blue-500/30 bg-blue-500/[0.06]" : "border-white/[0.07] bg-white/[0.02]"}`}>
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${checked ? "bg-blue-500/15 text-blue-300" : "bg-white/[0.04] text-gray-500"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white">{title}</span>
          <span className="block text-[11px] leading-snug text-gray-500">{hint}</span>
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="shrink-0 data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-white/[0.14]"
      />
    </label>
  )
}
