"use client"

import type { ComponentType, ReactNode } from "react"
import { Activity, Mic, MicOff, MonitorUp, RefreshCw, RotateCcw, Square, Volume2, VolumeX, Zap } from "lucide-react"
import type { AudioMixerLevels, AudioSourceKind } from "@/lib/live/audio-mixer"
import type { BroadcastStats } from "./broadcast-types"
import type { GameAudioState } from "./use-live-media"

interface Props {
  micOn: boolean
  micReady: boolean
  micBusy: boolean
  gameAudioState: GameAudioState
  gameAudioLabel: string
  gameAudioBusy: boolean
  audioInputs: MediaDeviceInfo[]
  levels: AudioMixerLevels
  stats: BroadcastStats | null
  screenLabel: string
  switchingScreen: boolean
  onToggleMic: () => void
  onConnectGameAudio: (deviceId?: string) => void
  onDisconnectGameAudio: () => void
  onVolumeChange: (kind: AudioSourceKind, volume: number) => void
  onSwitchScreen: () => void
  onFinish: () => void
  restarting: boolean
  onRestart: () => void
}

const GAME_AUDIO_COPY: Record<GameAudioState, { title: string; detail: string }> = {
  off: { title: "Áudio do jogo desligado", detail: "Conecte para a galera ouvir o LoL." },
  connecting: { title: "Conectando o áudio...", detail: "Escolha a tela e marque compartilhar áudio." },
  live: { title: "Áudio do jogo no ar", detail: "O som está saindo junto com a imagem." },
  silent: { title: "Conectado, mas sem som", detail: "Confira a saída de áudio do Windows e do LoL." },
  unavailable: { title: "Navegador não liberou o áudio", detail: "Ative a Mixagem estéreo ou instale o VB-Cable." },
}

/// Som fica em cartão, porque tem medidor e volume para mostrar. O resto é
/// comando seco e vive numa barra: um cartão grande só para dizer "trocar tela"
/// ocupava um quarto da largura sem ter o que colocar dentro.
export function HostLiveControls({
  micOn,
  micReady,
  micBusy,
  gameAudioState,
  gameAudioLabel,
  gameAudioBusy,
  audioInputs,
  levels,
  stats,
  screenLabel,
  switchingScreen,
  onToggleMic,
  onConnectGameAudio,
  onDisconnectGameAudio,
  onVolumeChange,
  onSwitchScreen,
  onFinish,
  restarting,
  onRestart,
}: Props) {
  const gameConnected = gameAudioState === "live" || gameAudioState === "silent"
  const gameCopy = GAME_AUDIO_COPY[gameAudioState]
  const gameTone = gameAudioState === "live" ? "emerald" : gameAudioState === "off" || gameAudioState === "connecting" ? "blue" : "amber"

  return (
    <div className="space-y-3">
      {stats && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-[11px] font-semibold text-gray-400">
          <span className="inline-flex items-center gap-1.5 text-gray-300">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            {stats.width ? `${stats.width}x${stats.height}` : "medindo"} · {stats.fps} FPS
          </span>
          <span>{(stats.kbps / 1000).toFixed(1)} Mbps de subida</span>
          <span>{stats.rttMs ? `${stats.rttMs} ms de ida e volta` : "latência medindo"}</span>
          {/* Diz de quem é a culpa quando a imagem encolhe, em vez de deixar o
              host adivinhando se é a máquina ou a internet. */}
          {stats.limitedBy !== "none" && (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <Activity className="h-3.5 w-3.5" />
              {stats.limitedBy === "cpu"
                ? "Segurando a imagem por CPU"
                : stats.limitedBy === "bandwidth"
                  ? "Segurando a imagem por internet"
                  : "Segurando a imagem"}
            </span>
          )}
          {stats.pinnedResolution && stats.limitedBy === "none" && stats.targetHeight > 0 && stats.height > 0 && stats.height < stats.targetHeight * 0.9 && (
            <span className="text-amber-300">Recuperando a resolução...</span>
          )}
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <Zap className="h-3.5 w-3.5" />
            Servidor de transmissão
          </span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <ControlCard
          tone={micOn ? "emerald" : "red"}
          icon={micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          title={micBusy ? "Ativando microfone..." : micOn ? "Microfone ligado" : micReady ? "Microfone mudo" : "Microfone desligado"}
          detail={micOn ? "Sua voz está indo para a live." : micReady ? "Sua voz não está sendo enviada." : "Clique para liberar e entrar no ar."}
          level={micOn ? levels.mic : 0}
          onClick={onToggleMic}
          disabled={micBusy}
        >
          {micReady && <VolumeSlider label="Volume da voz" onChange={(value) => onVolumeChange("mic", value)} />}
        </ControlCard>

        <ControlCard
          tone={gameTone}
          icon={gameConnected ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          title={gameCopy.title}
          detail={gameAudioLabel && gameConnected ? gameAudioLabel : gameCopy.detail}
          level={gameConnected ? levels.game : 0}
        >
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onConnectGameAudio()}
                disabled={gameAudioBusy}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-[11px] font-bold text-gray-100 ring-1 ring-white/[0.1] transition-colors hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-50"
              >
                <MonitorUp className="h-3.5 w-3.5" />
                {gameConnected ? "Trocar fonte" : "Pegar do sistema"}
              </button>
              {gameConnected && (
                <button
                  type="button"
                  onClick={onDisconnectGameAudio}
                  className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-white/[0.03] px-3 text-[11px] font-bold text-gray-400 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08] hover:text-gray-200"
                >
                  Desligar
                </button>
              )}
            </div>

            {audioInputs.length > 0 && (
              <select
                value=""
                onChange={(event) => { if (event.target.value) onConnectGameAudio(event.target.value) }}
                className="h-8 w-full cursor-pointer rounded-lg border border-white/[0.08] bg-[#101014] px-2 text-[11px] font-semibold text-gray-300 outline-none focus:border-blue-500/50"
              >
                <option value="">Ou use uma entrada do Windows</option>
                {audioInputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || "Entrada sem nome"}
                  </option>
                ))}
              </select>
            )}

            {gameConnected && <VolumeSlider label="Volume do jogo" onChange={(value) => onVolumeChange("game", value)} />}
          </div>
        </ControlCard>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2">
        <ActionButton
          icon={RefreshCw}
          spinning={switchingScreen}
          label={switchingScreen ? "Trocando tela..." : "Trocar tela"}
          hint={screenLabel || "Outra janela, aba ou monitor"}
          onClick={onSwitchScreen}
          disabled={switchingScreen}
          tone="blue"
        />
        <ActionButton
          icon={RotateCcw}
          spinning={restarting}
          label={restarting ? "Reiniciando..." : "Reiniciar"}
          hint="Refaz a ligação com o servidor"
          onClick={onRestart}
          disabled={restarting}
          tone="neutral"
        />

        <button
          type="button"
          onClick={onFinish}
          className="ml-auto inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition-colors hover:bg-red-500"
        >
          <Square className="h-4 w-4" />
          Encerrar live
        </button>
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  spinning = false,
  label,
  hint,
  onClick,
  disabled,
  tone,
}: {
  icon: ComponentType<{ className?: string }>
  spinning?: boolean
  label: string
  hint: string
  onClick: () => void
  disabled?: boolean
  tone: "blue" | "neutral"
}) {
  const skin = tone === "blue"
    ? "bg-blue-500/[0.08] ring-blue-500/25 hover:bg-blue-500/15"
    : "bg-white/[0.03] ring-white/[0.09] hover:bg-white/[0.07]"
  const iconSkin = tone === "blue" ? "bg-blue-500/15 text-blue-300" : "bg-white/[0.06] text-gray-300"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left ring-1 ring-inset transition-colors disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:max-w-[15rem] ${skin}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconSkin}`}>
        <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-black text-white">{label}</span>
        <span className="block truncate text-[10.5px] text-gray-500">{hint}</span>
      </span>
    </button>
  )
}

const TONES = {
  emerald: { border: "border-emerald-500/30 bg-emerald-500/[0.08]", icon: "bg-emerald-500/15 text-emerald-300", bar: "bg-emerald-400" },
  red: { border: "border-red-500/25 bg-red-500/[0.07]", icon: "bg-red-500/15 text-red-300", bar: "bg-red-400" },
  amber: { border: "border-amber-500/25 bg-amber-500/[0.07]", icon: "bg-amber-500/15 text-amber-300", bar: "bg-amber-400" },
  blue: { border: "border-blue-500/25 bg-blue-500/[0.07]", icon: "bg-blue-500/15 text-blue-300", bar: "bg-blue-400" },
} as const

function ControlCard({
  tone,
  icon,
  title,
  detail,
  level,
  onClick,
  disabled,
  children,
}: {
  tone: keyof typeof TONES
  icon: ReactNode
  title: string
  detail: string
  level?: number
  onClick?: () => void
  disabled?: boolean
  children?: ReactNode
}) {
  const palette = TONES[tone]
  const header = (
    <div className="flex w-full items-start gap-3 text-left">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="mt-1 block truncate text-xs text-gray-400">{detail}</span>
        {level !== undefined && <LevelMeter level={level} className={palette.bar} />}
      </span>
    </div>
  )

  return (
    <div className={`rounded-2xl border p-4 ${palette.border}`}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="w-full cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
        >
          {header}
        </button>
      ) : (
        header
      )}
      {children}
    </div>
  )
}

function LevelMeter({ level, className }: { level: number; className: string }) {
  return (
    <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <span
        className={`block h-full rounded-full transition-[width] duration-150 ${className}`}
        style={{ width: `${Math.min(100, Math.round(level * 140))}%` }}
      />
    </span>
  )
}

function VolumeSlider({ label, onChange }: { label: string; onChange: (volume: number) => void }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <input
        type="range"
        min={0}
        max={200}
        defaultValue={100}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] accent-blue-500"
      />
    </label>
  )
}
