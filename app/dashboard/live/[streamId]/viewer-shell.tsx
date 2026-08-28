"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import Link from "next/link"
import { ArrowLeft, Maximize, Minimize, MonitorUp, Pause, Radio, Users, Volume2, VolumeX, Zap } from "lucide-react"
import { PlayerAvatar } from "@/components/player-avatar"
import type { StreamSummary } from "@/lib/services/streaming"

/// Tempo parado antes de a interface da live sumir de cima da imagem.
const OVERLAY_IDLE_MS = 2600

export type ViewerStatus = "connecting" | "live" | "paused" | "waiting" | "unavailable" | "ended"

/// Teto de qualidade escolhido por quem assiste. O máximo continua sendo o que
/// o host publica: aqui só dá para pedir menos.
export type ViewerQuality = "high" | "medium" | "low"

const QUALITY_OPTIONS: Array<{ id: ViewerQuality; label: string; hint: string }> = [
  { id: "high", label: "Alta", hint: "A mesma imagem que o host está enviando" },
  { id: "medium", label: "Média", hint: "Menos dados, para conexão instável" },
  { id: "low", label: "Baixa", hint: "O mínimo, para internet ruim" },
]

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
  quality: ViewerQuality
  onQualityChange: (quality: ViewerQuality) => void
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
  quality,
  onQualityChange,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<number | null>(null)
  const holdingRef = useRef(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const showingPicture = status === "live" || status === "paused"

  // A informação da live some sozinha depois de um tempo parado e volta ao
  // primeiro movimento, como em qualquer player. Enquanto o ponteiro estiver em
  // cima dos controles nada some, senão o volume fugiria da mão.
  const revealOverlay = useCallback(() => {
    setOverlayVisible(true)
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      if (!holdingRef.current) setOverlayVisible(false)
    }, OVERLAY_IDLE_MS)
  }, [])

  useEffect(() => {
    revealOverlay()
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [revealOverlay])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener("fullscreenchange", syncFullscreen)
    return () => document.removeEventListener("fullscreenchange", syncFullscreen)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
      return
    }
    void stageRef.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/streams"
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

      <div
        ref={stageRef}
        onMouseMove={revealOverlay}
        onMouseEnter={revealOverlay}
        onMouseLeave={() => {
          holdingRef.current = false
          if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
          setOverlayVisible(false)
        }}
        onTouchStart={revealOverlay}
        className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-black fullscreen:flex fullscreen:items-center fullscreen:rounded-none fullscreen:border-0 ${
          showingPicture && !overlayVisible ? "cursor-none" : ""
        }`}
      >
        <div className="relative aspect-video max-h-[calc(100dvh-11rem)] w-full fullscreen:h-full fullscreen:max-h-none fullscreen:aspect-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onDoubleClick={toggleFullscreen}
            className="h-full w-full object-contain"
          />
          <audio ref={audioRef} autoPlay playsInline />

          {!showingPicture && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#07070c] px-6 text-center">
              {status === "connecting" || status === "waiting" ? (
                <>
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
                  <Link href="/streams" className="text-xs font-semibold text-blue-400 hover:text-blue-300">Ver outras transmissões</Link>
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
            <div
              className={`transition-opacity duration-300 ${overlayVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Ao vivo
              </span>

              {stats && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-gray-300 ring-1 ring-white/10 backdrop-blur">
                  <Zap className={`h-3 w-3 ${stats.relayed ? "text-amber-300" : "text-emerald-300"}`} />
                  {stats.height ? `${stats.height}p` : "..."} · {stats.fps} FPS · {stats.rttMs} ms
                </span>
              )}

              <div
                onMouseEnter={() => {
                  holdingRef.current = true
                  setOverlayVisible(true)
                }}
                onMouseLeave={() => {
                  holdingRef.current = false
                  revealOverlay()
                }}
                className="absolute bottom-3 right-3 flex items-center gap-2"
              >
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
                <div className="flex items-center gap-1 rounded-xl bg-black/70 p-1 ring-1 ring-white/10 backdrop-blur">
                  {QUALITY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onQualityChange(option.id)}
                      title={option.hint}
                      className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                        quality === option.id ? "bg-white/[0.14] text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-black/70 text-white ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-black/85"
                >
                  {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
