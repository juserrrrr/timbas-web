"use client"

import { useState } from "react"
import { Check, Copy, Globe2, Link2, Lock, Mic, MicOff, MonitorUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Visibility = "MEMBERS" | "PUBLIC"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  hostName: string
  avatarUrl: string | null
  liveUrl: string
  visibility: Visibility
  onVisibilityChange: (visibility: Visibility) => void
  withMic: boolean
  onWithMicChange: (withMic: boolean) => void
  starting: boolean
  onStart: () => Promise<void>
}

export function LiveSetupDialog({
  open,
  onOpenChange,
  hostName,
  avatarUrl,
  liveUrl,
  visibility,
  onVisibilityChange,
  withMic,
  onWithMicChange,
  starting,
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto border-white/[0.09] bg-[#101014] p-0 text-white sm:max-w-xl">
        <div className="border-b border-white/[0.07] bg-gradient-to-br from-blue-500/10 via-transparent to-red-500/10 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Preparar transmissão</DialogTitle>
            <DialogDescription className="text-gray-400">Confira como a live vai aparecer antes de escolher a tela.</DialogDescription>
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

        <div className="min-w-0 space-y-5 px-4 pb-2 sm:px-6">
          <section className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
              <Link2 className="h-3.5 w-3.5" /> Link da live
            </div>
            <div className="flex gap-2">
              <div className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-gray-300">
                {liveUrl || "Preparando link..."}
              </div>
              <button
                type="button"
                onClick={() => { void copyLink() }}
                disabled={!liveUrl}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-gray-200 ring-1 ring-white/[0.09] transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Copiar link da live"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">Quem pode assistir</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onVisibilityChange("MEMBERS")}
                className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${visibility === "MEMBERS" ? "border-blue-500/60 bg-blue-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10"><Lock className="h-4 w-4 text-amber-300" /></span>
                <span className="min-w-0"><span className="block text-sm font-bold text-white">Somente membros</span><span className="mt-0.5 block text-[11px] leading-relaxed text-gray-400">Precisa estar logado no Timbas.</span></span>
              </button>
              <button
                type="button"
                onClick={() => onVisibilityChange("PUBLIC")}
                className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${visibility === "PUBLIC" ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10"><Globe2 className="h-4 w-4 text-emerald-300" /></span>
                <span className="min-w-0"><span className="block text-sm font-bold text-white">Link público</span><span className="mt-0.5 block text-[11px] leading-relaxed text-gray-400">Qualquer pessoa com o link pode assistir.</span></span>
              </button>
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">Microfone ao iniciar</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onWithMicChange(true)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${withMic ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <Mic className={`h-4 w-4 ${withMic ? "text-emerald-300" : "text-gray-500"}`} />
                <span><span className="block text-sm font-bold text-white">Ligado</span><span className="block text-[11px] text-gray-500">Tela e sua voz</span></span>
              </button>
              <button
                type="button"
                onClick={() => onWithMicChange(false)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${!withMic ? "border-red-500/50 bg-red-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <MicOff className={`h-4 w-4 ${!withMic ? "text-red-300" : "text-gray-500"}`} />
                <span><span className="block text-sm font-bold text-white">Desligado</span><span className="block text-[11px] text-gray-500">Sem a sua voz</span></span>
              </button>
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
          <button
            type="button"
            onClick={() => { void onStart() }}
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
