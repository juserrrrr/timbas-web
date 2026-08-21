"use client"

import { Mic, MicOff, RefreshCw, Square, Volume2, VolumeX } from "lucide-react"

interface Props {
  micOn: boolean
  hasMic: boolean
  micBusy: boolean
  switchingScreen: boolean
  screenLabel: string
  hasSharedAudio: boolean
  sharedAudioSignal: "off" | "checking" | "active" | "silent" | "unavailable"
  addingSystemAudio: boolean
  onToggleMicrophone: () => Promise<void>
  onSwitchScreen: () => Promise<void>
  onAddSystemAudio: () => Promise<void>
  onFinish: () => Promise<void>
}

export function HostLiveControls({
  micOn,
  hasMic,
  micBusy,
  switchingScreen,
  screenLabel,
  hasSharedAudio,
  sharedAudioSignal,
  addingSystemAudio,
  onToggleMicrophone,
  onSwitchScreen,
  onAddSystemAudio,
  onFinish,
}: Props) {
  const micTitle = micOn ? "Microfone ligado" : hasMic ? "Microfone desligado" : "Microfone não conectado"
  const micDescription = micOn ? "Sua voz está indo para a live." : hasMic ? "Sua voz não está sendo enviada." : "Clique para permitir e adicionar sua voz."
  const sharedAudioTitle = addingSystemAudio
    ? "Conectando áudio..."
    : sharedAudioSignal === "checking"
      ? "Testando o som do PC..."
      : sharedAudioSignal === "active"
        ? "Som do PC detectado"
        : sharedAudioSignal === "silent"
          ? "Áudio conectado, mas silencioso"
          : sharedAudioSignal === "unavailable"
            ? "Navegador não liberou o áudio"
          : "Adicionar áudio do PC"

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <button
        type="button"
        onClick={() => { void onToggleMicrophone() }}
        disabled={micBusy}
        className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${micOn ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15" : "border-red-500/25 bg-red-500/[0.07] hover:bg-red-500/10"}`}
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${micOn ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-black text-white">
            {micBusy ? "Ativando microfone..." : micTitle}
            <span className={`h-2 w-2 rounded-full ${micOn ? "bg-emerald-400" : "bg-red-400"}`} />
          </span>
          <span className="mt-1 block text-xs text-gray-400">{micDescription}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => { void onAddSystemAudio() }}
        disabled={addingSystemAudio}
        className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${hasSharedAudio ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15" : "border-amber-500/25 bg-amber-500/[0.07] hover:bg-amber-500/10"}`}
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${hasSharedAudio ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
          {hasSharedAudio ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-white">{sharedAudioTitle}</span>
          <span className="mt-1 block text-xs text-gray-400">
            {sharedAudioSignal === "silent"
              ? "Confira a saída de áudio do LoL e conecte novamente."
              : sharedAudioSignal === "unavailable"
                ? "Use Chrome ou Edge no Windows e marque Compartilhar áudio."
                : "Para jogos, escolha Tela inteira e confirme o áudio."}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => { void onSwitchScreen() }}
        disabled={switchingScreen}
        className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] p-4 text-left transition-colors hover:bg-blue-500/12 disabled:cursor-wait disabled:opacity-60"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
          <RefreshCw className={`h-5 w-5 ${switchingScreen ? "animate-spin" : ""}`} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-white">{switchingScreen ? "Trocando tela..." : "Trocar tela"}</span>
          <span className="mt-1 block truncate text-xs text-gray-400">
            {screenLabel || "Escolha outra aba, janela ou monitor."} · {hasSharedAudio ? "áudio da tela ligado" : "sem áudio da tela"}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => { void onFinish() }}
        className="inline-flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition-colors hover:bg-red-500"
      >
        <Square className="h-4 w-4" /> Encerrar live
      </button>
    </div>
  )
}
