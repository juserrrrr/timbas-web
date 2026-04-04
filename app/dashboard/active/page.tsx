"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Swords, Clock, Users, Plus, Radio } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getActiveMatches, type CustomLeagueMatch } from "@/lib/services/match"
import { useServer, SERVERS } from "@/lib/server-context"
import { LoadingState } from "@/components/ui/loading-state"
import { useNavigation } from "@/lib/navigation-context"

const FORMAT_LABELS: Record<string, string> = {
  ALEATORIO: "Aleatório",
  LIVRE: "Livre",
  ALEATORIO_COMPLETO: "Aleat. Completo",
  BALANCEADO: "Balanceado",
}

const STATUS_CONFIG = {
  WAITING:  { label: "Aguardando", color: "text-yellow-400", bg: "border-yellow-500/20 bg-yellow-500/10", dot: "bg-yellow-400 animate-pulse" },
  STARTED:  { label: "Em andamento", color: "text-green-400",  bg: "border-green-500/20 bg-green-500/10",  dot: "bg-green-400 animate-pulse" },
  FINISHED: { label: "Finalizada",   color: "text-gray-400",   bg: "border-gray-500/20 bg-gray-500/10",    dot: "bg-gray-400" },
  EXPIRED:  { label: "Expirada",     color: "text-red-400",    bg: "border-red-500/20 bg-red-500/10",      dot: "bg-red-400" },
} as const

function MatchCard({ match }: { match: CustomLeagueMatch }) {
  const sc = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.WAITING
  const totalPlayers = match.queuePlayers.length + match.Teams.flatMap(t => t.players).length
  const maxPlayers = match.playersPerTeam * 2
  const { start } = useNavigation()

  return (
    <Link href={`/dashboard/match/${match.id}`} onClick={start} className="group block">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-red-500/20 ring-1 ring-white/10">
              <Swords className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Partida <span className="font-mono text-gray-500">#{match.id}</span>
              </p>
              <p className="text-xs text-gray-500">
                {FORMAT_LABELS[match.matchType]} · {match.playersPerTeam}v{match.playersPerTeam}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${sc.bg} ${sc.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="h-3.5 w-3.5" />
            {match.status === "WAITING" ? (
              <span>{match.queuePlayers.length}/{maxPlayers} na fila</span>
            ) : (
              <span>{totalPlayers} jogadores</span>
            )}
          </div>
          {match.expiresAt && match.status === "WAITING" && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              Expira em 1h
            </div>
          )}
          <span className="text-xs font-semibold text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
            Ver partida →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function ActiveMatchesPage() {
  const token = getToken()
  const { selectedServer } = useServer()
  const [matches, setMatches] = useState<CustomLeagueMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const serverName = SERVERS.find(s => s.id === selectedServer)?.name ?? "Servidor"

  useEffect(() => {
    if (!token || !selectedServer) return
    setLoading(true)
    getActiveMatches(token, selectedServer)
      .then(setMatches)
      .catch(() => setError("Não foi possível carregar as partidas. Tente novamente."))
      .finally(() => setLoading(false))
  }, [selectedServer, token])

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Radio className="h-7 w-7 text-emerald-400" />
            Ao Vivo
          </h1>
          <p className="mt-1 text-sm text-gray-500">Partidas ativas em <span className="text-gray-300">{serverName}</span></p>
        </div>
        <Link
          href="/dashboard/match/create"
          prefetch={false}
          className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          Nova partida
        </Link>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">{error}</div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
            <Swords className="h-6 w-6 text-gray-600" />
          </div>
          <p className="font-semibold text-gray-400">Nenhuma partida ativa</p>
          <p className="mt-1 text-sm text-gray-600">Crie uma nova partida ou aguarde alguém criar via Discord.</p>
          <Link
            href="/dashboard/match/create"
            prefetch={false}
            className="mt-5 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Criar partida
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 animate-in slide-in-from-bottom-4 duration-500">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
