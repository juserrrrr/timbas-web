"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, MonitorPlay, MonitorUp, Radio, Users } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import { createStream, getAnnouncementTargets, getStreamPermission, listStreams, type AnnouncementTarget, type StreamSummary } from "@/lib/services/streaming"

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
  const [title, setTitle] = useState("")
  const [guilds, setGuilds] = useState<AnnouncementTarget[]>([])
  const [guildId, setGuildId] = useState("")
  const [visibility, setVisibility] = useState<"MEMBERS" | "PUBLIC">("MEMBERS")

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
        const [list, targets] = await Promise.all([
          listStreams(token).catch(() => []),
          permission.canStream ? getAnnouncementTargets(token).catch(() => []) : Promise.resolve([]),
        ])
        if (active) {
          setStreams(list)
          setGuilds(targets)
          setGuildId((current) => current || targets[0]?.id || "")
        }
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

  const start = async () => {
    const token = getToken()
    if (!token) return
    if (!guildId) {
      toast.error("Nenhum servidor do bot está disponível para esta transmissão.")
      return
    }
    setStarting(true)
    try {
      const stream = await createStream(token, title.trim() || undefined, guildId, visibility)
      router.push(`/dashboard/live/${stream.id}/studio`)
    } catch (e: unknown) {
      toast.error("Não foi possível iniciar", { description: e instanceof Error ? e.message : undefined })
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!featureEnabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <Lock className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-sm font-bold text-white">Transmissões estão desativadas</p>
        <p className="max-w-sm text-xs text-gray-500">
          Um administrador precisa ligar esse recurso no painel para as lives voltarem.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={guildId}
              onChange={(event) => setGuildId(event.target.value)}
              className="h-10 max-w-40 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white focus:border-blue-500/40 focus:outline-none"
              aria-label="Servidor para anunciar a transmissÃ£o"
            >
              {guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name}{guild.configured ? "" : " (sem anúncio)"}</option>)}
            </select>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as "MEMBERS" | "PUBLIC")}
              className="h-10 max-w-48 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white focus:border-blue-500/40 focus:outline-none"
              aria-label="Quem pode assistir à transmissão"
            >
              <option value="MEMBERS">Pessoas logadas</option>
              <option value="PUBLIC">Qualquer pessoa com link</option>
            </select>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Nome da transmissão (opcional)"
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white placeholder:text-gray-600 focus:border-blue-500/40 focus:outline-none sm:w-64 sm:flex-none"
            />
            <button
              onClick={start}
              disabled={starting}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MonitorUp className="h-4 w-4" />
              {starting ? "Abrindo..." : "Transmitir"}
            </button>
          </div>
        )}
      </div>

      {!canStream && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <Lock className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <p className="text-xs text-gray-400">
            Você pode assistir a qualquer transmissão, mas ainda não tem permissão para transmitir. Peça para um admin
            liberar a permissão de transmitir no seu grupo.
          </p>
        </div>
      )}

      {/* List */}
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
          {streams.map((stream) => {
            return (
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Aguardando
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {stream.viewers}
                  </span>
                  <span>começou {elapsed(stream.startedAt)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
