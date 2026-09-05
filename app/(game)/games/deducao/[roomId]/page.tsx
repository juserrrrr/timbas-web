"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { getOfficeMap, type OfficeMap } from "@/lib/services/games"
import { Lobby } from "./lobby"
import { useDeducaoRoom, type Snapshot } from "./use-deducao-room"
import { useProximityVoice } from "./use-proximity-voice"

/// A partida carrega o Three.js inteiro. Fora daqui ninguém paga por isso, e
/// nada disso renderiza no servidor porque a cena precisa de WebGL.
let matchModule: Promise<typeof import("./match")> | null = null
const loadMatch = () => {
  matchModule ??= import("./match")
  return matchModule
}

const Match = dynamic(() => loadMatch().then((module) => module.Match), {
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
  const [lobbyMap, setLobbyMap] = useState<OfficeMap | null>(null)
  const [minPlayers, setMinPlayers] = useState(4)

  const room = useDeducaoRoom({
    roomId: params.roomId,
    name: search.get("nome") ?? undefined,
    password: search.get("senha") ?? undefined,
    mapId: search.get("mapa") ?? undefined,
  })

  useEffect(() => {
    void loadMatch()
  }, [])

  useEffect(() => {
    if (!room.snapshot?.mapId) return
    setMap(null)
    setLobbyMap(null)
    void getOfficeMap(room.snapshot.mapId)
      .then((payload) => {
        setMap(payload.map)
        setLobbyMap(payload.lobby ?? null)
        setMinPlayers(payload.minPlayers)
      })
      .catch(() => setMap(null))
  }, [room.snapshot?.mapId])

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

  if (!room.snapshot) {
    return (
      <GameScreen>
        <div className="flex h-full flex-col items-center justify-center">
          <Spinner className="size-7 text-amber-300" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">Entrando na sala</p>
        </div>
      </GameScreen>
    )
  }

  return <ConnectedRoom room={room} snapshot={room.snapshot} map={map} lobbyMap={lobbyMap} minPlayers={minPlayers} onLeave={leave} />
}

function ConnectedRoom({ room, snapshot, map, lobbyMap, minPlayers, onLeave }: {
  room: ReturnType<typeof useDeducaoRoom>
  snapshot: Snapshot
  map: OfficeMap | null
  lobbyMap: OfficeMap | null
  minPlayers: number
  onLeave: () => void
}) {
  const poseRef = useRef({ x: 0, z: 0, dir: 0 })
  const voice = useProximityVoice({ roomRef: room.roomRef, me: room.me, snapshot, poseRef })
  const [exploring, setExploring] = useState(false)
  const inLobby = snapshot.phase === "lobby"
  const activeMap = inLobby ? lobbyMap : map
  useEffect(() => setExploring(false), [snapshot.phase])

  return (
    <GameScreen>
      <div className="relative h-full overflow-hidden">
        {activeMap ? <Match
          map={activeMap}
          lobby={inLobby}
          lobbyControlsEnabled={exploring}
          onLobbySetup={() => setExploring(false)}
          snapshot={snapshot}
          roomRef={room.roomRef}
          poseRef={poseRef}
          voice={voice}
          me={room.me}
          role={room.role}
          sabotageStatus={room.sabotageStatus}
          emergencyStatus={room.emergencyStatus}
          allies={room.allies}
          myTasks={room.myTasks}
          finalRoles={room.finalRoles}
          notices={room.notices}
          onSend={room.send}
          onLeave={onLeave}
        /> : <div className="flex h-full items-center justify-center"><Spinner className="size-7 text-amber-300" /></div>}
        {snapshot.phase === "lobby" && (
          <div className={`absolute inset-0 h-full overflow-hidden ${exploring ? "pointer-events-none z-20" : "z-[70]"}`}>
            <Lobby
              snapshot={snapshot}
              me={room.me}
              minPlayers={minPlayers}
              voice={voice}
              exploring={exploring}
              canExplore={Boolean(lobbyMap)}
              onExploreChange={(next) => { if (!next || lobbyMap) setExploring(next) }}
              onSend={room.send}
              onLeave={onLeave}
            />
          </div>
        )}
      </div>
    </GameScreen>
  )
}

function GameScreen({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const oldHtmlOverflow = html.style.overflow
    const oldHtmlOverscroll = html.style.overscrollBehavior
    const oldBodyOverflow = body.style.overflow
    const oldBodyOverscroll = body.style.overscrollBehavior
    const oldBodyPosition = body.style.position
    const oldBodyWidth = body.style.width
    const oldViewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    const viewport = oldViewport ?? document.createElement("meta")
    const oldViewportContent = viewport.content
    if (!oldViewport) {
      viewport.name = "viewport"
      document.head.appendChild(viewport)
    }
    viewport.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    html.style.overflow = "hidden"
    html.style.overscrollBehavior = "none"
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    body.style.position = "fixed"
    body.style.width = "100%"

    const blockGesture = (event: Event) => event.preventDefault()
    document.addEventListener("gesturestart", blockGesture, { passive: false })
    document.addEventListener("gesturechange", blockGesture, { passive: false })
    document.addEventListener("gestureend", blockGesture, { passive: false })
    return () => {
      document.removeEventListener("gesturestart", blockGesture)
      document.removeEventListener("gesturechange", blockGesture)
      document.removeEventListener("gestureend", blockGesture)
      html.style.overflow = oldHtmlOverflow
      html.style.overscrollBehavior = oldHtmlOverscroll
      body.style.overflow = oldBodyOverflow
      body.style.overscrollBehavior = oldBodyOverscroll
      body.style.position = oldBodyPosition
      body.style.width = oldBodyWidth
      if (oldViewport) viewport.content = oldViewportContent
      else viewport.remove()
    }
  }, [])

  return <main className="fixed inset-0 overflow-hidden overscroll-none bg-zinc-950 text-white">{children}</main>
}
