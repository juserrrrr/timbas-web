"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, DoorOpen, Lock, Play, RefreshCw, Users } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  getGameCatalog,
  listDeducaoRooms,
  saveDeducaoRoomPassword,
  type GameCatalog,
  type RoomSummary,
} from "@/lib/services/games"
import { toast } from "@/lib/toast"
import { CreateRoomDialog } from "../create-room-dialog"
import { JoinRoomDialog } from "./join-room-dialog"

const PHASE_LABEL: Record<string, string> = {
  lobby: "Esperando jogadores",
  jogando: "Em partida",
  reuniao: "Em reunião",
  votacao: "Votando",
  fim: "Encerrada",
}

export default function DeducaoPage() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<GameCatalog | null>(null)
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [creating, setCreating] = useState(false)
  const [privateRoom, setPrivateRoom] = useState<RoomSummary | null>(null)
  const [code, setCode] = useState("")

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true)
    try {
      setRooms(await listDeducaoRooms())
    } catch {
      setRooms([])
    } finally {
      setLoadingRooms(false)
    }
  }, [])

  useEffect(() => {
    void getGameCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null))
    void loadRooms()
    const timer = setInterval(() => {
      if (!document.hidden) void loadRooms()
    }, 8_000)
    return () => clearInterval(timer)
  }, [loadRooms])

  const game = catalog?.games.find((item) => item.id === "deducao")
  const canPlay = Boolean(game)

  const openRoom = (room: RoomSummary) => {
    if (room.private) {
      setPrivateRoom(room)
      return
    }
    router.push(`/games/deducao/${room.roomId}`)
  }

  const enterByCode = () => {
    const target = rooms.find((room) => room.code === code.trim().toUpperCase())
    if (!target) {
      toast.error("Nenhuma sala aberta com esse código.")
      return
    }
    openRoom(target)
  }

  const createRoom = (input: { name: string; password: string }) => {
    const params = new URLSearchParams({ nome: input.name })
    if (input.password) saveDeducaoRoomPassword("nova", input.password)
    router.push(`/games/deducao/nova?${params.toString()}`)
  }

  return (
    <div className="dashboard-view space-y-7">
      <Link
        href="/games"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos os jogos
      </Link>

      <header className="relative overflow-hidden rounded-3xl border border-red-400/15 bg-[linear-gradient(135deg,rgba(239,68,68,0.08),transparent_58%)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-red-600/10 blur-[100px]" />
        <div className="relative">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-red-300/75">Jogo de dedução</p>
          <h1 className="font-display mt-3 text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">
            Timbas Detetive
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Descubra os assassinos antes que eles eliminem o grupo, ou conclua todas as tarefas para vencer.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.13em] text-zinc-400">
            <span>4 a 12 jogadores</span>
            <span>10 a 20 min</span>
            <span>Funcionário · Detetive · Assassino</span>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-3xl border border-white/[0.07] bg-zinc-950/50 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Salas abertas</h2>
              <p className="mt-1 text-xs text-zinc-500">Escolha uma sala para entrar</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRooms()}
              className="cursor-pointer rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:border-white/20 hover:text-white"
              aria-label="Atualizar a lista de salas"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRooms ? "animate-spin" : ""}`} />
            </button>
          </div>

          <ul className="mt-5 space-y-2">
            {loadingRooms && rooms.length === 0 && (
              <li className="flex justify-center py-8">
                <Spinner className="size-5 text-zinc-600" />
              </li>
            )}
            {!loadingRooms && rooms.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
                Nenhuma sala aberta. Crie uma para começar.
              </li>
            )}
            {rooms.map((room) => (
              <li key={room.roomId}>
                <button
                  type="button"
                  disabled={!canPlay || room.locked || room.phase !== "lobby"}
                  onClick={() => openRoom(room)}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition hover:border-amber-400/30 hover:bg-amber-400/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="font-mono text-sm font-bold tracking-[0.18em] text-amber-300">{room.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{room.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                      {room.host ? `Criada por ${room.host} · ` : ""}
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
        </div>

        <aside className="h-fit rounded-3xl border border-white/[0.07] bg-zinc-950/50 p-5 sm:p-6">
          <h2 className="text-base font-black text-white">Entrar com código</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 5))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && code.length === 5) enterByCode()
              }}
              placeholder="CÓDIGO"
              aria-label="Código da sala"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm uppercase tracking-[0.25em] text-white placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={enterByCode}
              disabled={!canPlay || code.length < 5}
              className="cursor-pointer rounded-xl border border-white/10 px-3 text-xs font-bold uppercase tracking-wide text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-200 disabled:cursor-not-allowed disabled:text-zinc-600"
            >
              Entrar
            </button>
          </div>

          <div className="my-6 h-px bg-white/[0.07]" />

          <h2 className="text-base font-black text-white">Nova sala</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Você será o anfitrião e poderá ajustar as regras antes da partida.
          </p>
          <button
            type="button"
            disabled={!canPlay}
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
          >
            <Play className="h-4 w-4" />
            Criar sala
          </button>
        </aside>
      </section>

      <CreateRoomDialog open={creating} onOpenChange={setCreating} onConfirm={createRoom} />
      <JoinRoomDialog
        room={privateRoom}
        onOpenChange={(open) => {
          if (!open) setPrivateRoom(null)
        }}
        onConfirm={(room, password) => {
          saveDeducaoRoomPassword(room.roomId, password)
          router.push(`/games/deducao/${room.roomId}`)
        }}
      />
    </div>
  )
}
