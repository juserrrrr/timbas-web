"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, Eye, Gauge, MonitorPlay, RefreshCw, Signal, Users } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import {
  forceStreamQuality,
  getLiveMonitor,
  type LiveMonitor,
  type LiveMonitorStream,
} from "@/lib/services/streaming"

const REFRESH_MS = 5000

const TARGETS: Array<{ label: string; quality: "720p" | "1080p" | "source"; frameRate: 30 | 60 }> = [
  { label: "720p 30", quality: "720p", frameRate: 30 },
  { label: "1080p 30", quality: "1080p", frameRate: 30 },
  { label: "1080p 60", quality: "1080p", frameRate: 60 },
  { label: "Original 60", quality: "source", frameRate: 60 },
]

function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}h ${minutes}min`
  if (minutes > 0) return `${minutes}min ${seconds}s`
  return `${seconds}s`
}

/// O que o servidor de mídia está recebendo de imagem. É o número que denuncia
/// a live que caiu de resolução, porque vem do publisher e não do navegador.
function publishedVideo(stream: LiveMonitorStream) {
  const tracks = stream.room?.participants.flatMap((participant) => participant.tracks) ?? []
  const video = tracks.filter((track) => track.kind === "VIDEO" && !track.muted)
  if (video.length === 0) return null
  const best = video.reduce((top, track) => (track.height > top.height ? track : top))
  return { height: best.height, width: best.width, mimeType: best.mimeType }
}

export function LiveMonitorPanel() {
  const [data, setData] = useState<LiveMonitor | null>(null)
  const [loading, setLoading] = useState(true)
  const [forcing, setForcing] = useState("")

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      setData(await getLiveMonitor(token))
    } catch (error: unknown) {
      toast.error("Erro ao carregar as lives", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load()
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const force = async (stream: LiveMonitorStream, target: (typeof TARGETS)[number]) => {
    const token = getToken()
    if (!token) return
    setForcing(`${stream.id}:${target.label}`)
    try {
      await forceStreamQuality(token, stream.id, target.quality, target.frameRate)
      toast.success("Pedido enviado ao host", {
        description: `A live vai tentar ${target.quality} a ${target.frameRate} FPS.`,
      })
      await load()
    } catch (error: unknown) {
      toast.error("Não deu para pedir a troca", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setForcing("")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">No ar agora</h2>
          <p className="mt-1 text-xs text-gray-600">
            Quem está transmitindo, quem está assistindo e o que o servidor de mídia está recebendo. Atualiza sozinho a
            cada {REFRESH_MS / 1000} segundos.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-bold text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <Card className="flex justify-center border-white/[0.06] bg-white/[0.02] py-16">
          <Spinner className="size-5 text-red-400" />
        </Card>
      ) : !data || data.streams.length === 0 ? (
        <Card className="border-white/[0.06] bg-white/[0.02] px-5 py-12 text-center text-sm text-gray-500">
          Nenhuma transmissão aberta no momento.
        </Card>
      ) : (
        data.streams.map((stream) => {
          const video = publishedVideo(stream)
          // A leitura do host é a verdade sobre a imagem: o servidor de mídia
          // guarda apenas o tamanho declarado na hora de publicar.
          const shrunk = Boolean(
            stream.telemetry &&
              stream.telemetry.targetHeight > 0 &&
              stream.telemetry.height > 0 &&
              stream.telemetry.height < stream.telemetry.targetHeight * 0.9,
          )
          const watching = stream.peers.filter((peer) => !peer.isHost && peer.attached)
          const idle = stream.peers.filter((peer) => !peer.isHost && !peer.attached)

          return (
            <Card key={stream.id} className="space-y-4 border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-black text-white">{stream.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        stream.live ? "bg-red-600/90 text-white" : "bg-white/[0.06] text-gray-400"
                      }`}
                    >
                      {stream.live ? "Ao vivo" : "Aberta sem imagem"}
                    </span>
                    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gray-400 ring-1 ring-white/[0.08]">
                      {stream.visibility === "PUBLIC" ? "Pública" : "Membros"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    @{stream.hostName} · no ar há {duration(stream.uptimeMs)} · /{stream.slug}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-gray-300 ring-1 ring-white/[0.08]">
                    <Users className="h-3.5 w-3.5" />
                    {watching.length} assistindo
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ring-1 ${
                      stream.hostConnected
                        ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                        : "bg-amber-500/10 text-amber-300 ring-amber-500/20"
                    }`}
                  >
                    <Signal className="h-3.5 w-3.5" />
                    {stream.hostConnected
                      ? "Host conectado"
                      : `Host fora há ${duration(stream.hostMissingForMs ?? 0)}`}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ring-1 ${
                      shrunk
                        ? "bg-red-500/10 text-red-300 ring-red-500/20"
                        : stream.telemetry
                          ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
                          : "bg-white/[0.04] text-gray-400 ring-white/[0.08]"
                    }`}
                  >
                    <MonitorPlay className="h-3.5 w-3.5" />
                    {stream.telemetry
                      ? `${stream.telemetry.height}p · ${stream.telemetry.fps} FPS · ${(stream.telemetry.kbps / 1000).toFixed(1)} Mbps`
                      : video
                        ? `${video.height}p declarado · ${video.mimeType || "?"}`
                        : "Sem imagem publicada"}
                  </span>
                  {stream.telemetry && stream.telemetry.limitedBy !== "none" && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-300 ring-1 ring-amber-500/20">
                      <Gauge className="h-3.5 w-3.5" />
                      {stream.telemetry.limitedBy === "cpu"
                        ? "Segurando por CPU"
                        : stream.telemetry.limitedBy === "bandwidth"
                          ? "Segurando por internet"
                          : "Segurando a imagem"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-500">
                    <Eye className="h-3.5 w-3.5" />
                    Quem está assistindo
                  </p>
                  {watching.length === 0 ? (
                    <p className="mt-2 text-[11px] text-gray-600">Ninguém assistindo agora.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {watching.map((peer) => (
                        <li key={peer.peerId} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="min-w-0 truncate text-gray-300">
                            {peer.name}
                            {peer.guest && <span className="ml-1 text-gray-600">(visitante)</span>}
                          </span>
                          <span className="flex-shrink-0 text-gray-600">
                            {peer.listening ? "recebendo eventos" : "conectando"} · {duration(peer.idleMs)} sem sinal
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {idle.length > 0 && (
                    <p className="mt-2 text-[10px] text-gray-600">
                      {idle.length} sessão(ões) fora da página, ainda dentro do prazo de limpeza.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-500">
                    <Activity className="h-3.5 w-3.5" />
                    Sala no servidor de mídia
                  </p>
                  {stream.telemetry ? (
                    <p className="mt-2 text-[11px] text-gray-400">
                      Host codificando {stream.telemetry.width}x{stream.telemetry.height} a {stream.telemetry.fps} FPS,
                      alvo {stream.telemetry.targetHeight}p, {stream.telemetry.rttMs} ms de ida e volta
                      <span className="text-gray-600"> · leitura de {Math.round(stream.telemetry.ageMs / 1000)}s atrás</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-gray-600">O host ainda não reportou o estado da codificação.</p>
                  )}
                  {!stream.room ? (
                    <p className="mt-2 text-[11px] text-gray-600">
                      {data.sfu.enabled
                        ? "O servidor não respondeu sobre esta sala."
                        : "O servidor de transmissão está desligado."}
                    </p>
                  ) : stream.room.participants.length === 0 ? (
                    <p className="mt-2 text-[11px] text-gray-600">Sala criada, ninguém conectado nela.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {stream.room.participants.map((participant) => (
                        <li key={participant.identity} className="text-[11px]">
                          <span className="text-gray-300">
                            {participant.name || participant.identity}
                            <span className="ml-1 text-gray-600">
                              {participant.canPublish ? "publica" : "assiste"} · {participant.state.toLowerCase()}
                            </span>
                          </span>
                          {participant.tracks.length > 0 && (
                            <span className="block text-gray-600">
                              {participant.tracks
                                .map((track) =>
                                  track.kind === "VIDEO"
                                    ? `vídeo ${track.width}x${track.height}${track.muted ? " (mudo)" : ""}`
                                    : `áudio${track.muted ? " (mudo)" : ""}`,
                                )
                                .join(" · ")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                  <Gauge className="h-3.5 w-3.5" />
                  Forçar alvo no host
                </span>
                {TARGETS.map((target) => (
                  <button
                    key={target.label}
                    onClick={() => void force(stream, target)}
                    disabled={forcing !== "" || !stream.hostConnected}
                    className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-gray-300 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {forcing === `${stream.id}:${target.label}` ? "enviando..." : target.label}
                  </button>
                ))}
                <span className="text-[10px] text-gray-600">
                  O host aplica na hora, sem cortar a live. Sem host conectado não tem para quem pedir.
                </span>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
