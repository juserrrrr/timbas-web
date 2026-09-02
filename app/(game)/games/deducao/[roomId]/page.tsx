"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { getOfficeMap, type OfficeMap } from "@/lib/services/games"
import { Lobby } from "./lobby"
import { useDeducaoRoom } from "./use-deducao-room"

/// A partida carrega o Three.js inteiro. Fora daqui ninguém paga por isso, e
/// nada disso renderiza no servidor porque a cena precisa de WebGL.
const Match = dynamic(() => import("./match").then((module) => module.Match), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-black">
      <Spinner className="size-6 text-amber-300" />
    </div>
  ),
})

export default function DeducaoRoomPage() {
  const params = useParams<{ roomId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const [map, setMap] = useState<OfficeMap | null>(null)
  const [minPlayers, setMinPlayers] = useState(4)

  const room = useDeducaoRoom({
    roomId: params.roomId,
    name: search.get("nome") ?? undefined,
    password: search.get("senha") ?? undefined,
  })

  useEffect(() => {
    void getOfficeMap()
      .then((payload) => {
        setMap(payload.map)
        setMinPlayers(payload.minPlayers)
      })
      .catch(() => setMap(null))
  }, [])

  // O fragmento deixa o id real na URL sem navegar para outro segmento. Trocar o
  // parâmetro da rota desmontaria a tela e encerraria a sala recém-criada.
  useEffect(() => {
    if (params.roomId === "nova" && room.roomId && window.location.hash !== `#${room.roomId}`) {
      window.location.replace(`#${room.roomId}`)
    }
  }, [params.roomId, room.roomId])

  const leave = () => {
    room.leave()
    router.push("/games")
  }

  if (room.status === "erro") {
    return (
      <GameScreen>
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-tight text-white">Não deu para entrar</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-400">{room.error}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="cursor-pointer rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300"
              >
                Tentar novamente
              </button>
              <Link
                href="/games"
                className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-200 transition hover:border-white/25"
              >
                Voltar para os jogos
              </Link>
            </div>
          </div>
        </div>
      </GameScreen>
    )
  }

  if (!room.snapshot || !map) {
    return (
      <GameScreen>
        <div className="flex h-full flex-col items-center justify-center">
          <Spinner className="size-7 text-amber-300" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">Entrando na sala</p>
        </div>
      </GameScreen>
    )
  }

  if (room.snapshot.phase === "lobby") {
    return (
      <GameScreen>
        <div className="h-full overflow-hidden">
          <Lobby snapshot={room.snapshot} me={room.me} minPlayers={minPlayers} onSend={room.send} onLeave={leave} />
        </div>
      </GameScreen>
    )
  }

  return (
    <GameScreen>
      <Match
        map={map}
        snapshot={room.snapshot}
        roomRef={room.roomRef}
        me={room.me}
        role={room.role}
        allies={room.allies}
        myTasks={room.myTasks}
        finalRoles={room.finalRoles}
        notices={room.notices}
        onSend={room.send}
        onLeave={leave}
      />
    </GameScreen>
  )
}

function GameScreen({ children }: { children: React.ReactNode }) {
  return <main className="h-[100dvh] overflow-hidden bg-zinc-950 text-white">{children}</main>
}
