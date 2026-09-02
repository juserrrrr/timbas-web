"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Client, type Room } from "@colyseus/sdk"
import { getToken } from "@/lib/auth"
import { clearDeducaoRoomPassword, createGameTicket, gameServerUrl, getDeducaoRoomPassword } from "@/lib/services/games"

export type Phase = "lobby" | "jogando" | "reuniao" | "votacao" | "fim"
export type Role = "assassino" | "detetive" | "funcionario"

export interface PlayerRow {
  id: string
  name: string
  avatar: string
  color: string
  alive: boolean
  connected: boolean
  ready: boolean
  inVent: boolean
  tasksDone: number
  tasksTotal: number
  emergenciesLeft: number
}

export interface MeetingRow {
  open: boolean
  reason: string
  calledByName: string
  victimName: string
  voting: boolean
  endsAt: number
  voted: string[]
  tally: { id: string; count: number }[]
  skips: number
  ejectedId: string
  ejectedName: string
  ejectedRole: string
  tie: boolean
}

export interface CorpseRow {
  id: string
  playerId: string
  name: string
  color: string
  x: number
  z: number
  reported: boolean
}

export interface ChatRow {
  id: string
  from: string
  name: string
  color: string
  text: string
  at: number
  system: boolean
}

export interface Snapshot {
  roomName: string
  code: string
  private: boolean
  hostId: string
  phase: Phase
  tasksDone: number
  tasksTotal: number
  blackout: boolean
  blackoutEndsAt: number
  winner: string
  endReason: string
  players: PlayerRow[]
  corpses: CorpseRow[]
  meeting: MeetingRow
  chat: ChatRow[]
  config: Record<string, number | boolean>
}

export interface Notice {
  id: number
  kind: "aviso" | "perigo" | "pista"
  text: string
}

interface Options {
  roomId: string
  name?: string
  password?: string
}

const EMPTY_MEETING: MeetingRow = {
  open: false,
  reason: "",
  calledByName: "",
  victimName: "",
  voting: false,
  endsAt: 0,
  voted: [],
  tally: [],
  skips: 0,
  ejectedId: "",
  ejectedName: "",
  ejectedRole: "",
  tie: false,
}

/// O estado de posição não passa por aqui de propósito. Ele muda vinte vezes por
/// segundo, e um setState nesse ritmo derruba o React inteiro. A cena 3D lê a
/// posição direto do objeto do Colyseus dentro do quadro de animação, e este
/// retrato guarda só o que precisa redesenhar HTML: quem está na sala, a fase,
/// a reunião, o chat.
function snapshotOf(state: any): Snapshot {
  const players: PlayerRow[] = []
  state.players.forEach((player: any) => {
    players.push({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      color: player.color,
      alive: player.alive,
      connected: player.connected,
      ready: player.ready,
      inVent: player.inVent,
      tasksDone: player.tasksDone,
      tasksTotal: player.tasksTotal,
      emergenciesLeft: player.emergenciesLeft,
    })
  })

  const voted: string[] = []
  state.meeting.voted.forEach((_: boolean, id: string) => voted.push(id))
  const tally: { id: string; count: number }[] = []
  state.meeting.tally.forEach((count: number, id: string) => tally.push({ id, count }))

  const corpses: CorpseRow[] = []
  state.corpses.forEach((corpse: any) => {
    corpses.push({
      id: corpse.id,
      playerId: corpse.playerId,
      name: corpse.name,
      color: corpse.color,
      x: corpse.x,
      z: corpse.z,
      reported: corpse.reported,
    })
  })

  const chat: ChatRow[] = []
  state.chat.forEach((message: any) => {
    chat.push({
      id: message.id,
      from: message.from,
      name: message.name,
      color: message.color,
      text: message.text,
      at: message.at,
      system: message.system,
    })
  })

  return {
    roomName: state.roomName,
    code: state.code,
    private: state.private,
    hostId: state.hostId,
    phase: state.phase as Phase,
    tasksDone: state.tasksDone,
    tasksTotal: state.tasksTotal,
    blackout: state.blackout,
    blackoutEndsAt: state.blackoutEndsAt,
    winner: state.winner,
    endReason: state.endReason,
    players,
    corpses,
    meeting: {
      open: state.meeting.open,
      reason: state.meeting.reason,
      calledByName: state.meeting.calledByName,
      victimName: state.meeting.victimName,
      voting: state.meeting.voting,
      endsAt: state.meeting.endsAt,
      voted,
      tally,
      skips: state.meeting.skips,
      ejectedId: state.meeting.ejectedId,
      ejectedName: state.meeting.ejectedName,
      ejectedRole: state.meeting.ejectedRole,
      tie: state.meeting.tie,
    },
    chat,
    config: {
      killers: state.config.killers,
      withDetective: state.config.withDetective,
      tasksPerPlayer: state.config.tasksPerPlayer,
      killCooldownMs: state.config.killCooldownMs,
      killRange: state.config.killRange,
      meetingSeconds: state.config.meetingSeconds,
      voteSeconds: state.config.voteSeconds,
      revealRoleOnEject: state.config.revealRoleOnEject,
      emergencyPerPlayer: state.config.emergencyPerPlayer,
      blackoutEverySeconds: state.config.blackoutEverySeconds,
      blackoutSeconds: state.config.blackoutSeconds,
    },
  }
}

/// A reconexão do Colyseus usa um ticket diferente do ticket de entrada da API.
const reconnectKey = (roomId: string) => `timbas_deducao_${roomId}`

function rememberReconnect(roomId: string, ticket: string) {
  try {
    window.sessionStorage.setItem(reconnectKey(roomId), ticket)
  } catch {
    // Sem sessionStorage a pessoa só perde a volta automática depois da queda.
  }
}

function forgetReconnect(roomId: string) {
  try {
    window.sessionStorage.removeItem(reconnectKey(roomId))
  } catch {
    // Nada a fazer: o bilhete expira sozinho em 40 segundos.
  }
}

async function enterRoom(client: Client, roomId: string, options: { name?: string; password?: string }): Promise<Room> {
  if (roomId !== "nova") {
    let saved: string | null = null
    try {
      saved = window.sessionStorage.getItem(reconnectKey(roomId))
    } catch {
      saved = null
    }
    // A volta depois de uma queda não passa pela portaria de novo, então ela
    // vem antes de gastar um bilhete de entrada.
    if (saved) {
      try {
        return await client.reconnect(saved)
      } catch {
        forgetReconnect(roomId)
      }
    }
  }

  const password = options.password ?? getDeducaoRoomPassword(roomId)
  const { ticket } = await createGameTicket()
  return roomId === "nova"
    ? client.create("deducao", { ...options, password, ticket })
    : client.joinById(roomId, { ...options, password, ticket })
}

export function useDeducaoRoom({ roomId, name, password }: Options) {
  const [status, setStatus] = useState<"conectando" | "pronto" | "erro">("conectando")
  const [error, setError] = useState("")
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [allies, setAllies] = useState<string[]>([])
  const [myTasks, setMyTasks] = useState<string[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [ghostChat, setGhostChat] = useState<ChatRow[]>([])
  const [finalRoles, setFinalRoles] = useState<Record<string, string>>({})
  const [realRoomId, setRealRoomId] = useState("")

  const roomRef = useRef<Room | null>(null)
  const connectingRef = useRef(false)
  const teardownRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const goingRef = useRef(false)
  const signatureRef = useRef("")

  const notice = useCallback((kind: Notice["kind"], text: string) => {
    setNotices((current) => [...current.slice(-3), { id: Date.now() + Math.random(), kind, text }])
  }, [])

  useEffect(() => {
    // Em desenvolvimento o React monta, desmonta e monta de novo na sequência.
    // Desligar na limpeza faria a conexão nascer e morrer, e a segunda entrada
    // seria recusada porque a primeira ainda estaria ocupando a cadeira. Por
    // isso a saída é agendada: se a tela voltar, ela é cancelada.
    if (teardownRef.current) {
      clearTimeout(teardownRef.current)
      teardownRef.current = null
    }
    if (roomRef.current || connectingRef.current) return () => scheduleTeardown()
    connectingRef.current = true

    if (!getToken()) {
      setError("Sua sessão expirou. Entre de novo para jogar.")
      setStatus("erro")
      return
    }

    const client = new Client(gameServerUrl())

    function scheduleTeardown() {
      teardownRef.current = setTimeout(() => {
        teardownRef.current = null
        goingRef.current = true
        void roomRef.current?.leave(true)
        roomRef.current = null
        connectingRef.current = false
      }, 0)
    }

    const connect = async () => {
      const room = await enterRoom(client, roomId, { name, password })
      if (goingRef.current) {
        void room.leave(true)
        return
      }

      roomRef.current = room
      clearDeducaoRoomPassword(roomId)
      // A volta depois de uma queda: a sala segura o lugar por 40 segundos, e
      // entrar de novo pela porta da frente seria recusado porque a partida já
      // começou. Este bilhete é o que devolve a pessoa ao mesmo boneco.
      rememberReconnect(room.roomId, room.reconnectionToken)
      setRealRoomId(room.roomId)
      setStatus("pronto")

      room.onStateChange((state: any) => {
        const next = snapshotOf(state)
        const signature = JSON.stringify(next)
        if (signature === signatureRef.current) return
        signatureRef.current = signature
        setSnapshot(next)
      })

      room.onMessage("papel", (payload: { role: Role; tasks: string[]; allies: string[] }) => {
        setFinalRoles({})
        setRole(payload.role)
        setAllies(payload.allies)
        setMyTasks(payload.tasks)
      })
      room.onMessage("morte", (payload: { by: string }) => {
        notice("perigo", `${payload.by} te pegou. Agora você observa e termina suas tarefas.`)
      })
      room.onMessage("apagao", () => notice("perigo", "A luz caiu. Ninguém enxerga direito."))
      room.onMessage("investigacao", (payload: { status: string; name: string }) => {
        if (payload.status === "anotado")
          notice("pista", `${payload.name} entrou na sua lista. A leitura sai na próxima reunião.`)
        else notice("pista", `Leitura de ${payload.name}: ${payload.status === "suspeito" ? "suspeito" : "limpo"}.`)
      })
      room.onMessage("chat:fantasma", (payload: { name: string; color: string; text: string; at: number }) => {
        setGhostChat((current) => [
          ...current.slice(-40),
          {
            id: `${payload.at}-${payload.name}`,
            from: "",
            name: payload.name,
            color: payload.color,
            text: payload.text,
            at: payload.at,
            system: false,
          },
        ])
      })
      room.onMessage("erro", (text: string) => notice("aviso", text))
      room.onMessage("fim", (payload: { roles: { id: string; role: string }[] }) => {
        setFinalRoles(Object.fromEntries(payload.roles.map((entry) => [entry.id, entry.role])))
      })

      room.onError((_code, message) => {
        setError(message ?? "A conexão com a sala caiu.")
        setStatus("erro")
      })
      room.onLeave(() => {
        if (goingRef.current) return
        roomRef.current = null
        connectingRef.current = false
        setError("A conexão com a sala caiu. Sua vaga fica guardada por 40 segundos.")
        setStatus("erro")
      })
    }

    connect().catch((problem: Error) => {
      connectingRef.current = false
      if (goingRef.current) return
      setError(problem?.message || "Não foi possível entrar na sala.")
      setStatus("erro")
    })

    return () => scheduleTeardown()
  }, [roomId, name, password, notice])

  const send = useCallback((type: string, payload?: unknown) => {
    roomRef.current?.send(type as never, payload as never)
  }, [])

  const leave = useCallback(() => {
    goingRef.current = true
    if (roomRef.current) forgetReconnect(roomRef.current.roomId)
    void roomRef.current?.leave(true)
    roomRef.current = null
  }, [])

  const dismissNotice = useCallback((id: number) => {
    setNotices((current) => current.filter((item) => item.id !== id))
  }, [])

  return {
    status,
    error,
    snapshot,
    role,
    allies,
    myTasks,
    notices,
    ghostChat,
    finalRoles,
    roomId: realRoomId,
    me: roomRef.current?.sessionId ?? "",
    roomRef,
    send,
    leave,
    dismissNotice,
    meeting: snapshot?.meeting ?? EMPTY_MEETING,
  }
}
