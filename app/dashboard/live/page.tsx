"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, MonitorPlay, MonitorUp, Radio, Users } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
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
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let active = true
    const load = async () => {
      const permission = await getStreamPermission(token).catch(() => ({ canStream: false, featureEnabled: false }))
      if (!active) return
      setCanStream(permission.canStream)
      setFeatureEnabled(permission.featureEnabled)

      if (permission.featureEnabled) {
        const list = await listStreams(token).catch(() => [])
        if (active) setStreams(list)
      }
      if (active) setLoading(false)
    }

    void load()
    const interval = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(interval)
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
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>
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
    <div className="space-y-6">
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
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            <MonitorUp className="h-4 w-4" />
            Iniciar transmissão
          </button>
        )}
      </div>

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
              href={`/dashboard/live/${stream.id}/watch`}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-red-500/25 hover:bg-white/[0.04]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xs font-bold text-blue-300 ring-1 ring-blue-500/20">
                  {stream.hostName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{stream.title}</p>
                  <p className="truncate text-xs text-gray-500">{stream.hostName}</p>
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
