"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, MonitorPlay, MonitorUp, Radio, Server, Users } from "lucide-react"
import { toast } from "@/lib/toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RouteLoadingSignal } from "@/lib/navigation-context"
import { PlayerAvatar } from "@/components/player-avatar"
import { getToken } from "@/lib/auth"
import { createStream, getStreamPermission, listStreams, type StreamSummary } from "@/lib/services/streaming"
import { TIMBAS_SERVER_ID } from "@/lib/servers"

function elapsed(startedAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return "agora há pouco"
  if (minutes < 60) return `há ${minutes} min`
  return `há ${Math.floor(minutes / 60)} h`
}

export default function LivePage() {
  const router = useRouter()
  const [streams, setStreams] = useState<StreamSummary[]>([])
  const [canStream, setCanStream] = useState(false)
  const [featureEnabled, setFeatureEnabled] = useState(true)
  const [sfuReady, setSfuReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let active = true
    // Permissão e flag quase nunca mudam no meio da sessão, então só a lista
    // volta a cada ciclo. As duas chamadas da primeira carga vão juntas: em
    // sequência a tela ficava esperando dois round trips para aparecer.
    let permissionAt = 0

    const load = async (withPermission: boolean) => {
      const [permission, list] = await Promise.all([
        withPermission
          ? getStreamPermission(token).catch(() => ({ canStream: false, featureEnabled: false, sfu: false }))
          : Promise.resolve(null),
        listStreams(token).catch(() => [] as StreamSummary[]),
      ])
      if (!active) return

      if (permission) {
        permissionAt = Date.now()
        setCanStream(permission.canStream)
        setFeatureEnabled(permission.featureEnabled)
        setSfuReady(permission.sfu !== false)
        if (!permission.featureEnabled) {
          setLoading(false)
          return
        }
      }
      setStreams(list)
      setLoading(false)
    }

    void load(true)

    const tick = () => {
      // Aba escondida não precisa continuar batendo na API.
      if (document.hidden) return
      void load(Date.now() - permissionAt > 60_000)
    }
    const interval = setInterval(tick, 5000)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  const start = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = getToken()
    if (!token) return

    setStarting(true)
    try {
      // Privacy is chosen in the studio, before the stream is shared.
      const stream = await createStream(token, title.trim() || undefined, TIMBAS_SERVER_ID, "MEMBERS")
      router.push(`/dashboard/live/${stream.id}/studio`)
    } catch (error: unknown) {
      toast.error("Não foi possível abrir o estúdio", { description: error instanceof Error ? error.message : undefined })
      setStarting(false)
    }
  }

  if (loading) {
    return <RouteLoadingSignal />
  }

  if (!featureEnabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <Lock className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-sm font-bold text-white">Transmissões estão desativadas</p>
        <p className="max-w-sm text-xs text-gray-500">Um administrador precisa ligar esse recurso no painel para as lives voltarem.</p>
      </div>
    )
  }

  return (
    <div className="dashboard-view space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <MonitorPlay className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Transmissões</h1>
            <p className="text-xs text-gray-500">Compartilhe sua tela e mande o link para a galera.</p>
          </div>
        </div>

        {canStream && (
          <button
            onClick={() => setCreateOpen(true)}
            disabled={!sfuReady}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MonitorUp className="h-4 w-4" />
            Iniciar transmissão
          </button>
        )}
      </div>

      {!sfuReady && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <Server className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
          <p className="text-xs leading-relaxed text-gray-300">
            <span className="font-bold text-amber-200">O servidor de transmissão não está no ar.</span>{" "}
            As lives passam por ele, então ninguém consegue transmitir nem assistir enquanto isso.
            Um administrador precisa configurar em Admin, Transmissões, e ligar a flag <span className="font-mono">live_sfu</span>.
          </p>
        </div>
      )}

      {!canStream && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <Lock className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <p className="text-xs text-gray-400">Você pode assistir às transmissões, mas ainda não tem permissão para transmitir. Peça a um admin para liberar essa permissão.</p>
        </div>
      )}

      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
            <Radio className="h-6 w-6 text-gray-500" />
          </div>
          <p className="text-sm font-bold text-white">Nenhuma transmissão no ar</p>
          <p className="text-xs text-gray-500">Quando alguém começar, ela aparece aqui na hora.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {streams.map((stream) => (
            <Link
              key={stream.id}
              href={stream.isHost ? `/dashboard/live/${stream.id}/studio` : `/live/${stream.slug}`}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-red-500/25 hover:bg-white/[0.04]"
            >
              <div className="flex items-start gap-3">
                <PlayerAvatar name={stream.hostName} discordId={stream.hostDiscordId ?? undefined} avatar={stream.hostAvatar} className="h-10 w-10 ring-2 ring-blue-500/20" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{stream.title}</p>
                  <p className="truncate text-xs text-gray-500">@{stream.hostName}</p>
                </div>
                {stream.live ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span>
                ) : (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400">Aguardando</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{stream.viewers}</span>
                <span>começou {elapsed(stream.startedAt)}</span>
                {stream.isHost && (
                  <span className="ml-auto inline-flex items-center gap-1 font-bold text-blue-300">
                    <MonitorUp className="h-3.5 w-3.5" />
                    Seu estúdio
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/[0.09] bg-[#101014] text-white sm:max-w-md">
          <form onSubmit={start}>
            <DialogHeader>
              <DialogTitle className="text-white">Preparar transmissão</DialogTitle>
              <DialogDescription className="text-gray-400">Dê um nome para a live. O link, a privacidade e o microfone são definidos no estúdio.</DialogDescription>
            </DialogHeader>
            <div className="mt-5">
              <label htmlFor="stream-title" className="mb-2 block text-xs font-bold text-gray-300">Nome da transmissão</label>
              <input
                id="stream-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                autoFocus
                placeholder="Ex.: Treino de hoje"
                className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm text-white placeholder:text-gray-600 outline-none transition-colors focus:border-blue-500/60"
              />
            </div>
            <DialogFooter className="mt-6">
              <button type="button" onClick={() => setCreateOpen(false)} className="h-10 cursor-pointer rounded-xl px-4 text-sm font-bold text-gray-300 transition-colors hover:bg-white/[0.06]">Cancelar</button>
              <button type="submit" disabled={starting} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
                <MonitorUp className="h-4 w-4" />
                {starting ? "Abrindo..." : "Abrir estúdio"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
