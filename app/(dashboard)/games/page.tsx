"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DoorOpen, Eye, Lock, Play, RefreshCw, Users } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import { getGameCatalog, listDeducaoRooms, type GameCatalog, type RoomSummary } from "@/lib/services/games"
import { toast } from "@/lib/toast"
import { CreateRoomDialog } from "./create-room-dialog"

const PHASE_LABEL: Record<string, string> = {
  lobby: "Montando o time",
  jogando: "Expediente rolando",
  reuniao: "Reunião aberta",
  votacao: "Votando",
  fim: "Acabou agora",
}

export default function GamesPage() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<GameCatalog | null>(null)
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState("")

  const loadRooms = useCallback(async () => {
    try {
      setRooms(await listDeducaoRooms())
    } catch {
      setRooms([])
    } finally {
      setLoadingRooms(false)
    }
  }, [])

  useEffect(() => {
    void getGameCatalog().then(setCatalog).catch(() => setCatalog(null))
    void loadRooms()
    const timer = setInterval(() => {
      if (!document.hidden) void loadRooms()
    }, 8_000)
    return () => clearInterval(timer)
  }, [loadRooms])

  const enterByCode = () => {
    const target = rooms.find((room) => room.code === code.trim().toUpperCase())
    if (!target) {
      toast.error("Nenhuma sala aberta com esse código.")
      return
    }
    router.push(`/games/deducao/${target.roomId}`)
  }

  const game = catalog?.games[0]
  const locked = Boolean(game && !game.enabled && !game.adminPreview)
  const hasToken = Boolean(getToken())

  return (
    <div className="dashboard-view space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-[linear-gradient(135deg,rgba(244,165,43,0.09),transparent_55%)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-amber-300/70">
          Timbas · andar 3
        </p>
        <h1 className="font-display mt-3 text-4xl uppercase leading-[0.92] tracking-tight text-white sm:text-5xl">
          Sala de jogos
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Jogos para a galera do Timbas jogar junto, direto no navegador. Sem instalar nada, sem
          conta nova: entra quem já está aqui.
        </p>

        {catalog?.adminPreview && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200">
            <Eye className="h-3.5 w-3.5" />
            Só você está vendo isto. A área de jogos ainda está desligada para os outros.
          </p>
        )}
      </header>

      {!catalog && <div className="flex justify-center py-16"><Spinner className="size-6 text-amber-300" /></div>}

      {game && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <article className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-zinc-950/60 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background:repeating-linear-gradient(115deg,rgba(255,255,255,0.02)_0_2px,transparent_2px_9px)]" />
            <div className="pointer-events-none absolute -left-16 bottom-[-10rem] h-72 w-72 rounded-full bg-red-600/10 blur-[100px]" />

            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-red-300/80">
                  {game.tagline}
                </span>
                {!game.enabled && (
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200">
                    Prévia admin
                  </span>
                )}
              </div>

              <h2 className="font-display mt-3 text-3xl uppercase leading-[0.95] tracking-tight text-white sm:text-4xl">
                {game.name}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">{game.description}</p>

              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/[0.06] pt-5 font-mono text-[11px] uppercase tracking-[0.14em]">
                <div>
                  <dt className="text-zinc-600">Mesa</dt>
                  <dd className="mt-1 text-zinc-200">{game.players}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Duração</dt>
                  <dd className="mt-1 text-zinc-200">{game.minutes}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Papéis</dt>
                  <dd className="mt-1 text-zinc-200">Funcionário · Detetive · Assassino</dd>
                </div>
              </dl>

              <button
                type="button"
                disabled={locked || !hasToken}
                onClick={() => setCreating(true)}
                className="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
              >
                <Play className="h-4 w-4" />
                Abrir uma sala
              </button>
              {locked && (
                <p className="mt-3 text-xs text-zinc-500">
                  Este jogo está desligado pelo administrador da plataforma.
                </p>
              )}
            </div>
          </article>

          <section className="rounded-3xl border border-white/[0.07] bg-zinc-950/50 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                  Recepção
                </p>
                <h3 className="mt-1.5 text-lg font-black text-white">Salas abertas</h3>
              </div>
              <button
                type="button"
                onClick={() => void loadRooms()}
                className="cursor-pointer rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:border-white/20 hover:text-white"
                aria-label="Atualizar a lista de salas"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 5))}
                placeholder="CÓDIGO"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm uppercase tracking-[0.3em] text-white placeholder:tracking-[0.2em] placeholder:text-zinc-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={enterByCode}
                disabled={code.length < 5}
                className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-4 text-xs font-bold uppercase tracking-wide text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-200 disabled:cursor-not-allowed disabled:text-zinc-600"
              >
                Entrar
              </button>
            </div>

            <ul className="mt-5 space-y-2">
              {loadingRooms && (
                <li className="flex justify-center py-8"><Spinner className="size-5 text-zinc-600" /></li>
              )}
              {!loadingRooms && rooms.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
                  Nenhuma sala aberta agora. Abra a primeira e chame a galera.
                </li>
              )}
              {rooms.map((room) => (
                <li key={room.roomId}>
                  <button
                    type="button"
                    onClick={() => router.push(`/games/deducao/${room.roomId}`)}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition hover:border-amber-400/30 hover:bg-amber-400/[0.04]"
                  >
                    <span className="font-mono text-sm font-bold tracking-[0.18em] text-amber-300">{room.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{room.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                        {room.host ? `por ${room.host} · ` : ""}
                        {PHASE_LABEL[room.phase] ?? room.phase}
                      </span>
                    </span>
                    {room.private && <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />}
                    <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-zinc-400">
                      <Users className="h-3.5 w-3.5" />
                      {room.players}/{room.maxPlayers}
                    </span>
                    <DoorOpen className="h-4 w-4 shrink-0 text-zinc-700 transition group-hover:text-amber-300" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </section>
      )}

      <CreateRoomDialog
        open={creating}
        onOpenChange={setCreating}
        onConfirm={(input) => {
          const params = new URLSearchParams({ nome: input.name })
          if (input.password) params.set("senha", input.password)
          router.push(`/games/deducao/nova?${params.toString()}`)
        }}
      />
    </div>
  )
}
