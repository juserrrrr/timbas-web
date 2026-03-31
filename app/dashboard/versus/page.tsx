"use client"

import { useState, useEffect } from "react"
import { Swords, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getPlayerDetailStats, PlayerDetailStats } from "@/lib/services/playerStats"
import { getToken } from "@/lib/auth"
import { useServer } from "@/lib/server-context"

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Winner = "left" | "right" | "tie"

function compare(a: number, b: number, lowerIsBetter = false): Winner {
  if (a === b) return "tie"
  if (lowerIsBetter) return a < b ? "left" : "right"
  return a > b ? "left" : "right"
}

function StatRow({
  label,
  left,
  right,
  winner,
  formatFn = (v: number) => String(v),
}: {
  label: string
  left: number
  right: number
  winner: Winner
  formatFn?: (v: number) => string
}) {
  const total = left + right || 1
  const leftPct = Math.round((left / total) * 100)
  const rightPct = 100 - leftPct

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span
          className={`tabular-nums font-bold text-lg w-24 text-right ${
            winner === "left" ? "text-blue-400" : winner === "tie" ? "text-gray-300" : "text-gray-500"
          }`}
        >
          {formatFn(left)}
        </span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 text-center w-32">
          {label}
        </span>
        <span
          className={`tabular-nums font-bold text-lg w-24 text-left ${
            winner === "right" ? "text-red-400" : winner === "tie" ? "text-gray-300" : "text-gray-500"
          }`}
        >
          {formatFn(right)}
        </span>
      </div>
      {/* Bar */}
      <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-l-full transition-all duration-500 ${
            winner === "left" ? "bg-blue-500" : "bg-blue-500/30"
          }`}
          style={{ width: `${leftPct}%` }}
        />
        <div
          className={`h-full rounded-r-full transition-all duration-500 ${
            winner === "right" ? "bg-red-500" : "bg-red-500/30"
          }`}
          style={{ width: `${rightPct}%` }}
        />
      </div>
    </div>
  )
}

function RecentForm({ form }: { form: ("W" | "L")[] }) {
  if (form.length === 0) return <p className="text-gray-500 text-sm">Sem partidas</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${
            r === "W"
              ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
              : "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
          }`}
        >
          {r === "W" ? "V" : "D"}
        </span>
      ))}
    </div>
  )
}

function SideBar({
  wins,
  losses,
  total,
  winRate,
  color,
  label,
}: {
  wins: number
  losses: number
  total: number
  winRate: number
  color: "blue" | "red"
  label: string
}) {
  const pct = Math.round(winRate * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={`flex items-center gap-1.5 ${color === "blue" ? "text-blue-400" : "text-red-400"}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${color === "blue" ? "bg-blue-500" : "bg-red-500"}`} />
          {label}
        </span>
        <span className="text-gray-300 tabular-nums">
          {wins}V / {losses}D <span className="text-gray-500">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all ${color === "blue" ? "bg-blue-500" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-600">{total} partidas</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VersusPage() {
  const { selectedServer } = useServer()
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [rankingLoading, setRankingLoading] = useState(true)
  const [leftId, setLeftId] = useState("")
  const [rightId, setRightId] = useState("")
  const [leftDetail, setLeftDetail] = useState<PlayerDetailStats | null>(null)
  const [rightDetail, setRightDetail] = useState<PlayerDetailStats | null>(null)
  const [leftPlayer, setLeftPlayer] = useState<PlayerStats | null>(null)
  const [rightPlayer, setRightPlayer] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carrega lista de jogadores ao trocar de servidor
  useEffect(() => {
    const fetchPlayers = async () => {
      setRankingLoading(true)
      setPlayers([])
      setLeftId("")
      setRightId("")
      setLeftDetail(null)
      setRightDetail(null)
      setLeftPlayer(null)
      setRightPlayer(null)
      setError(null)
      try {
        const token = getToken()
        if (!token) throw new Error("Não autenticado.")
        const data = await getRanking(token, selectedServer)
        setPlayers(data)
      } catch {
        setError("Falha ao carregar jogadores.")
      } finally {
        setRankingLoading(false)
      }
    }
    fetchPlayers()
  }, [selectedServer])

  // Busca detalhes quando ambos os jogadores estão selecionados
  useEffect(() => {
    if (!leftId || !rightId) return
    const fetchBoth = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = getToken()
        if (!token) throw new Error("Não autenticado.")
        const lp = players.find((p) => String(p.userId) === leftId) ?? null
        const rp = players.find((p) => String(p.userId) === rightId) ?? null
        setLeftPlayer(lp)
        setRightPlayer(rp)
        const [ld, rd] = await Promise.all([
          getPlayerDetailStats(token, selectedServer, Number(leftId)),
          getPlayerDetailStats(token, selectedServer, Number(rightId)),
        ])
        setLeftDetail(ld)
        setRightDetail(rd)
      } catch {
        setError("Falha ao carregar estatísticas.")
      } finally {
        setLoading(false)
      }
    }
    fetchBoth()
  }, [leftId, rightId, selectedServer])

  const showComparison = leftPlayer && rightPlayer && leftDetail && rightDetail && !loading

  const overallWinner = (): Winner => {
    if (!leftPlayer || !rightPlayer) return "tie"
    const lWr = leftPlayer.winRate
    const rWr = rightPlayer.winRate
    if (lWr > rWr) return "left"
    if (rWr > lWr) return "right"
    return "tie"
  }

  const winner = overallWinner()

  return (
    <div className="content-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Comparação</h1>
        <p className="text-gray-400">Compare o desempenho de dois jogadores</p>
      </div>

      {/* Selects */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Select value={leftId} onValueChange={setLeftId} disabled={rankingLoading || players.length === 0}>
          <SelectTrigger className="border-blue-500/30 bg-blue-500/5 text-white hover:border-blue-500/50">
            <User className="mr-2 h-4 w-4 text-blue-400 shrink-0" />
            <SelectValue placeholder={rankingLoading ? "Carregando..." : "Jogador 1"} />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900 text-white">
            {players.map((p) => (
              <SelectItem
                key={p.userId}
                value={String(p.userId)}
                disabled={String(p.userId) === rightId}
                className="focus:bg-gray-800 focus:text-white"
              >
                {p.rank}º {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-center">
          <span className="rounded-xl bg-gray-800/80 px-4 py-2 text-sm font-black text-gray-400 tracking-widest ring-1 ring-white/10">
            VS
          </span>
        </div>

        <Select value={rightId} onValueChange={setRightId} disabled={rankingLoading || players.length === 0}>
          <SelectTrigger className="border-red-500/30 bg-red-500/5 text-white hover:border-red-500/50">
            <User className="mr-2 h-4 w-4 text-red-400 shrink-0" />
            <SelectValue placeholder={rankingLoading ? "Carregando..." : "Jogador 2"} />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900 text-white">
            {players.map((p) => (
              <SelectItem
                key={p.userId}
                value={String(p.userId)}
                disabled={String(p.userId) === leftId}
                className="focus:bg-gray-800 focus:text-white"
              >
                {p.rank}º {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-dashed border-red-500/50 bg-red-500/10 p-4 text-center text-red-400">
          {error}
        </div>
      )}

      {/* Prompt vazio */}
      {!leftId && !rightId && !rankingLoading && !error && (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-14 text-center">
          <Swords className="mx-auto mb-3 h-10 w-10 text-gray-700" />
          <p className="text-gray-500">Selecione dois jogadores para comparar</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Spinner className="size-8 text-blue-500" />
        </div>
      )}

      {/* Comparison */}
      {showComparison && (
        <>
          {/* Player headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Left player */}
            <Card
              className={`border p-5 text-center backdrop-blur-sm transition-all ${
                winner === "left"
                  ? "border-blue-500/40 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                  : "border-gray-800/50 bg-gray-900/50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-black ring-2 ${
                    winner === "left" ? "ring-blue-500 bg-blue-500/20 text-blue-300" : "ring-gray-700 bg-gray-800 text-gray-400"
                  }`}
                >
                  {leftPlayer.name[0].toUpperCase()}
                </div>
                <p className="font-bold text-white text-lg leading-tight">{leftPlayer.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">#{leftPlayer.rank}</span>
                  {winner === "left" && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/30">
                      Melhor WR
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* VS center */}
            <div className="flex flex-col items-center gap-1">
              <Swords className="h-6 w-6 text-gray-600" />
            </div>

            {/* Right player */}
            <Card
              className={`border p-5 text-center backdrop-blur-sm transition-all ${
                winner === "right"
                  ? "border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/10"
                  : "border-gray-800/50 bg-gray-900/50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-black ring-2 ${
                    winner === "right" ? "ring-red-500 bg-red-500/20 text-red-300" : "ring-gray-700 bg-gray-800 text-gray-400"
                  }`}
                >
                  {rightPlayer.name[0].toUpperCase()}
                </div>
                <p className="font-bold text-white text-lg leading-tight">{rightPlayer.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">#{rightPlayer.rank}</span>
                  {winner === "right" && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/30">
                      Melhor WR
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Stats card */}
          <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm space-y-5">
            <h2 className="text-lg font-bold text-white">Estatísticas</h2>

            <StatRow
              label="Win Rate"
              left={Math.round(leftPlayer.winRate * 100)}
              right={Math.round(rightPlayer.winRate * 100)}
              winner={compare(leftPlayer.winRate, rightPlayer.winRate)}
              formatFn={(v) => `${v}%`}
            />
            <StatRow
              label="Vitórias"
              left={leftPlayer.wins}
              right={rightPlayer.wins}
              winner={compare(leftPlayer.wins, rightPlayer.wins)}
            />
            <StatRow
              label="Derrotas"
              left={leftPlayer.losses}
              right={rightPlayer.losses}
              winner={compare(leftPlayer.losses, rightPlayer.losses, true)}
            />
            <StatRow
              label="Total de Jogos"
              left={leftPlayer.totalGames}
              right={rightPlayer.totalGames}
              winner={compare(leftPlayer.totalGames, rightPlayer.totalGames)}
            />
            <StatRow
              label="Pontuação"
              left={leftPlayer.score}
              right={rightPlayer.score}
              winner={compare(leftPlayer.score, rightPlayer.score)}
            />
            <StatRow
              label="Maior Streak"
              left={leftDetail.longestWinStreak}
              right={rightDetail.longestWinStreak}
              winner={compare(leftDetail.longestWinStreak, rightDetail.longestWinStreak)}
              formatFn={(v) => `${v}V`}
            />
          </Card>

          {/* Forma recente */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-gray-800/50 bg-gray-900/50 p-5 backdrop-blur-sm">
              <h3 className="mb-3 font-semibold text-white text-sm">
                Forma Recente —{" "}
                <span className="text-blue-400">{leftPlayer.name}</span>
              </h3>
              <RecentForm form={leftDetail.recentForm} />
            </Card>
            <Card className="border-gray-800/50 bg-gray-900/50 p-5 backdrop-blur-sm">
              <h3 className="mb-3 font-semibold text-white text-sm">
                Forma Recente —{" "}
                <span className="text-red-400">{rightPlayer.name}</span>
              </h3>
              <RecentForm form={rightDetail.recentForm} />
            </Card>
          </div>

          {/* Win Rate por lado */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-gray-800/50 bg-gray-900/50 p-5 backdrop-blur-sm space-y-3">
              <h3 className="font-semibold text-white text-sm">
                WR por Lado — <span className="text-blue-400">{leftPlayer.name}</span>
              </h3>
              <SideBar
                wins={leftDetail.blueSide.wins}
                losses={leftDetail.blueSide.losses}
                total={leftDetail.blueSide.total}
                winRate={leftDetail.blueSide.winRate}
                color="blue"
                label="Lado Azul"
              />
              <SideBar
                wins={leftDetail.redSide.wins}
                losses={leftDetail.redSide.losses}
                total={leftDetail.redSide.total}
                winRate={leftDetail.redSide.winRate}
                color="red"
                label="Lado Vermelho"
              />
            </Card>
            <Card className="border-gray-800/50 bg-gray-900/50 p-5 backdrop-blur-sm space-y-3">
              <h3 className="font-semibold text-white text-sm">
                WR por Lado — <span className="text-red-400">{rightPlayer.name}</span>
              </h3>
              <SideBar
                wins={rightDetail.blueSide.wins}
                losses={rightDetail.blueSide.losses}
                total={rightDetail.blueSide.total}
                winRate={rightDetail.blueSide.winRate}
                color="blue"
                label="Lado Azul"
              />
              <SideBar
                wins={rightDetail.redSide.wins}
                losses={rightDetail.redSide.losses}
                total={rightDetail.redSide.total}
                winRate={rightDetail.redSide.winRate}
                color="red"
                label="Lado Vermelho"
              />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
