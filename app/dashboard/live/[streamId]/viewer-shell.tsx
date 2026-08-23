"use client"

import { useRef, type RefObject } from "react"
import Link from "next/link"
import { ArrowLeft, Maximize, MonitorUp, Pause, Radio, Users, Volume2, VolumeX, Zap } from "lucide-react"
import { PlayerAvatar } from "@/components/player-avatar"
import type { StreamSummary } from "@/lib/services/streaming"

export type ViewerStatus = "connecting" | "live" | "paused" | "waiting" | "unavailable" | "ended"

export interface ViewerStats {
  kbps: number
  fps: number
  width: number
  height: number
  rttMs: number
  relayed: boolean
}

interface Props {
  stream: StreamSummary
  connected: boolean
  viewerCount: number
  status: ViewerStatus
  hasAudio: boolean
  muted: boolean
  volume: number
  stats: ViewerStats | null
  videoRef: RefObject<HTMLVideoElement | null>
  audioRef: RefObject<HTMLAudioElement | null>
  /** Preenchido quando quem está assistindo é o dono da live. */
  studioHref?: string
  onToggleSound: () => void
  onVolumeChange: (volume: number) => void
}

/**
 * Everything the person watching sees. It knows nothing about how the media
 * arrived, so the peer to peer and SFU paths render exactly the same screen.
 */
export function ViewerShell({
  stream,
  connected,
  viewerCount,
  status,
  hasAudio,
  muted,
  volume,
  stats,
  videoRef,
  audioRef,
  studioHref,
  onToggleSound,
  onVolumeChange,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const showingPicture = status === "live" || status === "paused"

  const goFullscreen = () => {
    void stageRef.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/live"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-gray-400 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PlayerAvatar name={stream.hostName} discordId={stream.hostDiscordId ?? undefined} avatar={stream.hostAvatar} className="h-10 w-10 ring-2 ring-red-500/20" />
          <div>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">{stream.title}</h1>
            <p className="text-xs text-gray-500">@{stream.hostName}{connected ? "" : " · reconectando"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gray-300 ring-1 ring-white/[0.08]">
            <Users className="h-3.5 w-3.5" />{viewerCount}
          </span>
          {studioHref && (
            <Link
              href={studioHref}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500"
            >
              <MonitorUp className="h-3.5 w-3.5" />
              Voltar ao estúdio
            </Link>
          )}
        </div>
      </div>

      <div ref={stageRef} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
        <div className="relative aspect-video w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onDoubleClick={goFullscreen}
            className="h-full w-full object-contain"
          />
          <audio ref={audioRef} autoPlay playsInline />

          {!showingPicture && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#07070c] px-6 text-center">
              {status === "connecting" || status === "waiting" ? (
                <>
                  {status === "connecting" && <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />}
                  <p className="text-sm font-bold text-white">{status === "waiting" ? "A live continua aberta" : "Conectando na transmissão"}</p>
                  <p className="text-xs text-gray-500">
                    {status === "waiting" ? "O host pode voltar ou escolher outra tela em até 90 segundos." : "Buscando o caminho mais rápido até quem está transmitindo."}
                  </p>
                </>
              ) : status === "unavailable" ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
                    <Radio className="h-6 w-6 text-amber-300" />
                  </div>
                  <p className="text-sm font-bold text-white">Servidor de transmissão indisponível</p>
                  <p className="max-w-sm text-xs text-gray-500">
                    As lives passam por ele. Avise um administrador: não adianta ficar esperando aqui.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
                    <Radio className="h-6 w-6 text-gray-500" />
                  </div>
                  <p className="text-sm font-bold text-white">Transmissão encerrada</p>
                  <Link href="/dashboard/live" className="text-xs font-semibold text-blue-400 hover:text-blue-300">Ver outras transmissões</Link>
                </>
              )}
            </div>
          )}

          {status === "paused" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-6 text-center backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/[0.12]">
                <Pause className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-bold text-white">O host pausou o compartilhamento</p>
              <p className="text-xs text-gray-400">A live continua conectada. A imagem volta assim que ele escolher outra tela.</p>
            </div>
          )}

          {showingPicture && (
            <>
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Ao vivo
              </span>

              {stats && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-gray-300 ring-1 ring-white/10 backdrop-blur">
                  <Zap className={`h-3 w-3 ${stats.relayed ? "text-amber-300" : "text-emerald-300"}`} />
                  {stats.height ? `${stats.height}p` : "..."} · {stats.fps} FPS · {stats.rttMs} ms
                </span>
              )}

              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 ring-1 ring-white/10 backdrop-blur">
                  <button
                    onClick={onToggleSound}
                    disabled={!hasAudio}
                    className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {!hasAudio ? "Live sem áudio" : muted ? "Ativar som" : "Som ligado"}
                  </button>
                  {hasAudio && !muted && (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(volume * 100)}
                      onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
                      aria-label="Volume da live"
                      className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-blue-500"
                    />
                  )}
                </div>
                <button
                  onClick={goFullscreen}
                  aria-label="Tela cheia"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-black/70 text-white ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-black/85"
                >
                  <Maximize className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
