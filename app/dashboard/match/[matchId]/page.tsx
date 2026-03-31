"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  Shuffle,
  Play,
  Flag,
  LogIn,
  LogOut,
  Trophy,
  Clock,
  Wifi,
  WifiOff,
  Shield,
  Swords,
  Crown,
} from "lucide-react"
import { getToken, decodeToken, getDiscordAvatarUrl } from "@/lib/auth"
import {
  getMatch,
  joinMatch,
  leaveMatch,
  drawTeams,
  startMatch,
  finishMatch,
  type CustomLeagueMatch,
  type UserTeamLeague,
} from "@/lib/services/match"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POSITION_ICONS: Record<string, string> = {
  TOP: "🛡️",
  JUNGLE: "🌿",
  MID: "⚡",
  ADC: "🏹",
  SUPPORT: "💙",
}

const FORMAT_LABELS: Record<string, string> = {
  ALEATORIO: "Random",
  LIVRE: "Free",
  ALEATORIO_COMPLETO: "Full Random",
  BALANCEADO: "Balanced",
}

const getMatchEventsUrl = (id: string) => `${process.env.NEXT_PUBLIC_API_URL}/leagueMatch/${id}/events`

function PlayerCard({
  playerLayout,
  side,
  empty = false,
}: {
  playerLayout?: UserTeamLeague
  side: "blue" | "red"
  empty?: boolean
}) {
  const player = playerLayout?.user
  const avatarUrl = player
    ? getDiscordAvatarUrl(player.discordId, player.avatar || undefined, 64)
    : null

  const sideGlow = side === "blue"
    ? "ring-blue-500/40 shadow-blue-500/20"
    : "ring-red-500/40 shadow-red-500/20"
  const sideBg = side === "blue"
    ? "bg-blue-500/10 border-blue-500/20"
    : "bg-red-500/10 border-red-500/20"
  const sideText = side === "blue" ? "text-blue-300" : "text-red-300"

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
      empty
        ? "border-white/5 bg-white/[0.02] opacity-40"
        : `${sideBg} shadow-lg`
    }`}>
      {/* Avatar */}
      <div className={`relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ${empty ? "ring-white/10" : sideGlow}`}>
        {avatarUrl && !empty ? (
          <img src={avatarUrl} alt={player?.name} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center text-xs font-bold ${empty ? "bg-white/5 text-gray-600" : `bg-gradient-to-br ${side === "blue" ? "from-blue-600/50 to-blue-900/50 text-blue-300" : "from-red-600/50 to-red-900/50 text-red-300"}`}`}>
            {empty ? "?" : player?.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {!empty && (
          <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#07070c] ${side === "blue" ? "bg-blue-500" : "bg-red-500"}`} />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${empty ? "text-gray-700" : "text-white"}`}>
          {empty ? "Vazio" : player!.name}
        </p>
        {playerLayout?.position && (
          <p className={`text-xs ${sideText}`}>
            {POSITION_ICONS[playerLayout.position] ?? "⭐"} {playerLayout.position}
          </p>
        )}
      </div>
    </div>
  )
}

function WaitingPlayer({ playerLayout }: { playerLayout: UserTeamLeague }) {
  const player = playerLayout.user
  const avatarUrl = getDiscordAvatarUrl(player.discordId, player.avatar || undefined, 40)
  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-110">
        {avatarUrl ? (
          <img src={avatarUrl} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/10 text-xs font-bold text-white">
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <span className="max-w-[52px] truncate text-[10px] text-gray-500">{player.name}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const matchIdNum = parseInt(matchId as string, 10)

  const [match, setMatch] = useState<CustomLeagueMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const token = getToken()
  const me = token ? decodeToken(token) : null

  const isCreator = me?.discordId && match?.creatorDiscordId === me.discordId
  const allPlayers = match ? [...match.queuePlayers, ...match.Teams.flatMap(t => t.players)] : []
  const isInLobby = me?.discordId && allPlayers.some((p) => p.user.discordId === me.discordId)

  const totalCapacity = match?.queuePlayers.length ?? 0
  const canDraw = isCreator && match?.status === "WAITING" && totalCapacity === 10 && match?.matchType !== "LIVRE"
  const canStart = isCreator && match?.status === "WAITING" && totalCapacity >= 10
  const canFinish = isCreator && match?.status === "STARTED"
  const canJoin = match?.status === "WAITING" && totalCapacity < 10 && !isInLobby
  const canLeave = match?.status === "WAITING" && isInLobby && match.queuePlayers.some(p => p.user.discordId === me?.discordId)

  // ── Load initial state ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token || isNaN(matchIdNum)) return
    getMatch(matchIdNum, token)
      .then(setMatch)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [matchIdNum, token])

  // ── SSE connection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isNaN(matchIdNum)) return
    const url = getMatchEventsUrl(String(matchIdNum))
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        if (["state", "player_joined", "player_left", "teams_drawn", "match_started", "match_finished"].includes(event.type)) {
          setMatch(event.payload)
        } else if (event.type === "match_expired") {
          setMatch((prev) => prev ? { ...prev, status: "EXPIRED" } : prev)
        }
      } catch {}
    }

    return () => { es.close(); setConnected(false) }
  }, [matchIdNum])

  // ── Auto-dismiss action error ────────────────────────────────────────────
  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(null), 5000)
    return () => clearTimeout(t)
  }, [actionError])

  // ── Actions ──────────────────────────────────────────────────────────────
  const runAction = useCallback(async (key: string, fn: () => Promise<any>) => {
    if (!token) return
    setActionLoading(key)
    setActionError(null)
    try {
      const updated = await fn()
      if (updated?.id) setMatch(updated)
    } catch (e: any) {
      setActionError(e.message || "Erro ao executar ação")
    } finally {
      setActionLoading(null)
    }
  }, [token])

  const handleJoin = () => runAction("join", () => joinMatch(token!, matchIdNum, me!.discordId!))
  const handleLeave = () => runAction("leave", () => leaveMatch(token!, matchIdNum, me!.discordId!))
  const handleDraw = () => runAction("draw", () => drawTeams(token!, matchIdNum, me!.discordId!))
  const handleStart = () => runAction("start", () => startMatch(token!, matchIdNum, me!.discordId!))

  const handleFinish = (winnerSide: "BLUE" | "RED") => {
    setShowFinishModal(false)
    runAction("finish", () => finishMatch(token!, matchIdNum, me!.discordId!, winnerSide))
  }

  // ── Render helpers ─────────────────────────────────────────────────────
  const winnerSide = match?.winnerId 
      ? (match.winnerId === match.teamBlueId ? "BLUE" : "RED")
      : null

  const blueTeamObj = match?.Teams.find(t => t.id === match.teamBlueId)
  const redTeamObj = match?.Teams.find(t => t.id === match.teamRedId)

  const blueTeam = blueTeamObj?.players ?? []
  const redTeam = redTeamObj?.players ?? []
  const qPlayers = match?.queuePlayers ?? []

  // Fill empty slots for display
  const blueSlots = Array.from({ length: 5 }, (_, i) => blueTeam[i] ?? null)
  const redSlots  = Array.from({ length: 5 }, (_, i) => redTeam[i]  ?? null)

  const statusConfig = {
    WAITING:  { label: "Waiting", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", dot: "bg-yellow-400 animate-pulse" },
    STARTED:  { label: "In Progress", color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",  dot: "bg-green-400 animate-pulse" },
    FINISHED: { label: "Finished",   color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20",    dot: "bg-gray-400" },
    EXPIRED:  { label: "Expired",     color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",      dot: "bg-red-400" },
  } as const
  const sc = match ? statusConfig[match.status] : statusConfig.WAITING

  // ── Loading / Error ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="-mx-6 -my-8 flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/30">
              <Swords className="h-7 w-7 text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500">Loading match...</p>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="-mx-6 -my-8 flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center animate-in fade-in duration-500">
          <p className="text-lg font-bold text-white">Match not found</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="-mx-6 -my-8 min-h-[calc(100vh-3.5rem)] text-white animate-in fade-in duration-300">
      <div className="relative px-4 py-6 sm:px-8 lg:py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-red-500/20 ring-1 ring-white/10">
                <Swords className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Partida <span className="text-gray-500 text-lg font-mono">#{match.id}</span>
                </h1>
                <p className="text-xs text-gray-500">{FORMAT_LABELS[match.matchType]} · Online</p>
              </div>
            </div>
          </div>

          {/* Status + Connection */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${sc.bg} ${sc.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </div>
            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs ${
              connected
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}>
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? "Live" : "Reconnecting..."}
            </div>
          </div>
        </div>

        {/* ── Winner Banner ───────────────────────────────────────────────── */}
        {winnerSide && (
          <div className={`mb-6 flex items-center justify-center gap-3 rounded-2xl border p-5 ${
            winnerSide === "BLUE"
              ? "border-blue-500/30 bg-gradient-to-r from-blue-500/15 to-blue-500/5 shadow-lg shadow-blue-500/10"
              : "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 shadow-lg shadow-red-500/10"
          }`}>
            <Trophy className={`h-7 w-7 ${winnerSide === "BLUE" ? "text-blue-400" : "text-red-400"}`} />
            <div className="text-center">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Winner</p>
              <p className={`text-xl font-black ${winnerSide === "BLUE" ? "text-blue-300" : "text-red-300"}`}>
                Time {winnerSide === "BLUE" ? "Azul" : "Vermelho"}
              </p>
            </div>
            <Trophy className={`h-7 w-7 ${winnerSide === "BLUE" ? "text-blue-400" : "text-red-400"}`} />
          </div>
        )}

        {/* ── Teams Grid ──────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] gap-4">
          {/* Blue Team */}
          <div className={`rounded-2xl border p-4 transition-all duration-500 ${
            winnerSide === "BLUE"
              ? "border-blue-500/50 bg-blue-500/10 shadow-xl shadow-blue-500/15"
              : "border-blue-500/15 bg-blue-500/[0.04]"
          }`}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 ring-1 ring-blue-500/30">
                <Shield className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-bold text-blue-300">Blue Team</span>
              {winnerSide === "BLUE" && <Crown className="ml-auto h-4 w-4 text-yellow-400" />}
            </div>
            <div className="space-y-2">
              {blueSlots.map((pLayout, i) =>
                pLayout ? (
                  <PlayerCard key={pLayout.user.discordId} playerLayout={pLayout} side="blue" />
                ) : (
                  <PlayerCard key={`empty-b-${i}`} side="blue" empty />
                )
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center gap-3 h-full">
            <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent min-h-[4rem]" />
            <div className="group relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#0d0d14] border border-white/10 shadow-2xl transition-all hover:border-white/20 hover:scale-110">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-red-500/10 animate-pulse" />
              <Swords className="relative h-7 w-7 text-gray-400 drop-shadow-md transition-all group-hover:text-white" />
            </div>
            <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent min-h-[4rem]" />
          </div>

          {/* Red Team */}
          <div className={`rounded-2xl border p-4 transition-all duration-500 ${
            winnerSide === "RED"
              ? "border-red-500/50 bg-red-500/10 shadow-xl shadow-red-500/15"
              : "border-red-500/15 bg-red-500/[0.04]"
          }`}>
            <div className="mb-3 flex items-center gap-2">
              {winnerSide === "RED" && <Crown className="h-4 w-4 text-yellow-400" />}
              <div className={`ml-auto flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 ring-1 ring-red-500/30 ${winnerSide === "RED" ? "" : "ml-0"}`}>
                <Shield className="h-3.5 w-3.5 text-red-400" />
              </div>
              <span className="font-bold text-red-300">Red Team</span>
            </div>
            <div className="space-y-2">
              {redSlots.map((pLayout, i) =>
                pLayout ? (
                  <PlayerCard key={pLayout.user.discordId} playerLayout={pLayout} side="red" />
                ) : (
                  <PlayerCard key={`empty-r-${i}`} side="red" empty />
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Waiting Players (queue) ─────────────────────────────────────── */}
        {match.status === "WAITING" && match.queuePlayers.length > 0 && !match.teamBlueId && (
          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-400">Waiting in Queue</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${qPlayers.length >= 10 ? "text-green-400" : "text-gray-400"}`}>
                {qPlayers.length}/10
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {qPlayers.map((p) => (
                <WaitingPlayer key={p.user.discordId} playerLayout={p} />
              ))}
              {Array.from({ length: Math.max(0, 10 - qPlayers.length) }, (_, i) => (
                <div key={`slot-${i}`} className="flex flex-col items-center gap-1">
                  <div className="h-9 w-9 rounded-full border border-dashed border-white/10" />
                  <span className="text-[10px] text-gray-700">Vazio</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Error ────────────────────────────────────────────────── */}
        {actionError && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            {actionError}
          </div>
        )}

        {/* ── Actions Bar ─────────────────────────────────────────────────── */}
        {match.status !== "EXPIRED" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Join / Leave */}
            {token && canJoin && (
              <ActionBtn
                id="btn-join"
                icon={<LogIn className="h-4 w-4" />}
                label="Join"
                color="green"
                loading={actionLoading === "join"}
                onClick={handleJoin}
              />
            )}
            {token && canLeave && (
              <ActionBtn
                id="btn-leave"
                icon={<LogOut className="h-4 w-4" />}
                label="Leave"
                color="gray"
                loading={actionLoading === "leave"}
                onClick={handleLeave}
              />
            )}

            {/* Creator actions */}
            {isCreator && match.status === "WAITING" && (
              <>
                {canDraw && (
                  <ActionBtn
                    id="btn-draw"
                    icon={<Shuffle className="h-4 w-4" />}
                    label="Draw Teams"
                    color="purple"
                    loading={actionLoading === "draw"}
                    onClick={handleDraw}
                    disabled={qPlayers.length < 10}
                  />
                )}
                <ActionBtn
                  id="btn-start"
                  icon={<Play className="h-4 w-4" />}
                  label="Start Match"
                  color="blue"
                  loading={actionLoading === "start"}
                  onClick={handleStart}
                  disabled={!canStart || actionLoading !== null}
                />
              </>
            )}

            {canFinish && (
              <ActionBtn
                id="btn-finish"
                icon={<Flag className="h-4 w-4" />}
                label="Finish"
                color="red"
                loading={actionLoading === "finish"}
                onClick={() => setShowFinishModal(true)}
              />
            )}

            {/* Player count pill */}
            {match.status === "WAITING" && !match.teamBlueId && (
              <div className="ml-auto rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-500">
                {qPlayers.length >= 10
                  ? "✅ Ready to draw / start"
                  : `Waiting for ${10 - qPlayers.length} more player${10 - qPlayers.length !== 1 ? "s" : ""}`}
              </div>
            )}
            {match.status === "WAITING" && match.teamBlueId && (
               <div className="ml-auto rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-500">
               ✅ Teams drawn! Waiting to start.
             </div>
            )}
          </div>
        )}

        {match.status === "EXPIRED" && (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-gray-500">This match expired after 1 hour without starting.</p>
          </div>
        )}
      </div>

      {/* ── Finish Modal ─────────────────────────────────────────────────── */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d0d14] p-6 shadow-2xl">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 ring-1 ring-yellow-500/20">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Who won?</h2>
              <p className="text-sm text-gray-500">Select the winning team</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-win-blue"
                onClick={() => handleFinish("BLUE")}
                className="flex flex-col items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 transition-all hover:border-blue-500/50 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <Shield className="h-6 w-6 text-blue-400" />
                <span className="font-bold text-blue-300">Blue Team</span>
              </button>
              <button
                id="btn-win-red"
                onClick={() => handleFinish("RED")}
                className="flex flex-col items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 transition-all hover:border-red-500/50 hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10"
              >
                <Shield className="h-6 w-6 text-red-400" />
                <span className="font-bold text-red-300">Red Team</span>
              </button>
            </div>
            <button
              onClick={() => setShowFinishModal(false)}
              className="mt-3 w-full rounded-xl py-2.5 text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Action Button ────────────────────────────────────────────────────────────

type BtnColor = "green" | "red" | "blue" | "purple" | "gray"

const colorMap: Record<BtnColor, { base: string; hover: string; ring: string; text: string; loader: string }> = {
  green:  { base: "bg-green-500/10  border-green-500/25",  hover: "hover:bg-green-500/20  hover:border-green-500/40",  ring: "focus:ring-green-500/30",  text: "text-green-300",  loader: "border-green-400" },
  red:    { base: "bg-red-500/10    border-red-500/25",    hover: "hover:bg-red-500/20    hover:border-red-500/40",    ring: "focus:ring-red-500/30",    text: "text-red-300",    loader: "border-red-400" },
  blue:   { base: "bg-blue-500/10   border-blue-500/25",   hover: "hover:bg-blue-500/20   hover:border-blue-500/40",   ring: "focus:ring-blue-500/30",   text: "text-blue-300",   loader: "border-blue-400" },
  purple: { base: "bg-purple-500/10 border-purple-500/25", hover: "hover:bg-purple-500/20 hover:border-purple-500/40", ring: "focus:ring-purple-500/30", text: "text-purple-300", loader: "border-purple-400" },
  gray:   { base: "bg-white/5       border-white/10",      hover: "hover:bg-white/10      hover:border-white/20",      ring: "focus:ring-white/10",      text: "text-gray-300",   loader: "border-gray-400" },
}

function ActionBtn({
  id,
  icon,
  label,
  color,
  loading,
  onClick,
  disabled = false,
}: {
  id: string
  icon: React.ReactNode
  label: string
  color: BtnColor
  loading: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const c = colorMap[color]
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 ${c.base} ${c.text} ${c.ring} ${disabled || loading ? "cursor-not-allowed opacity-40" : c.hover}`}
    >
      {loading ? (
        <span className={`h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${c.loader}`} />
      ) : icon}
      {label}
    </button>
  )
}
