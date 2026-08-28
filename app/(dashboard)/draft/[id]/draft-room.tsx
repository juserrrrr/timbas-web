"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock, Loader2, Search, Sparkles, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OVERALL_TIERS, groupByTier, tierOf, type OverallTierId } from "@/lib/tiers"
import { EmptyState, StatusPill } from "@/components/competitions/shared"
import { attributeRow, attributeTone, hasAttributes } from "@/lib/attributes"
import { listDraftPlayers, makePick } from "@/lib/services/draft"
import type { DraftLeagueDetail, DraftPlayer } from "@/lib/services/draft.types"

const POLL_MS = 3000

function useCountdown(deadline: string | null | undefined) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!deadline) {
      setRemaining(0)
      return
    }
    const tick = () => setRemaining(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  return remaining
}

export function DraftRoom({ league, onChanged }: { league: DraftLeagueDetail; onChanged: () => void }) {
  const [players, setPlayers] = useState<DraftPlayer[]>([])
  const [search, setSearch] = useState("")
  const [position, setPosition] = useState("")
  const [tier, setTier] = useState<OverallTierId | "">("")
  const [loading, setLoading] = useState(true)
  const [pickingId, setPickingId] = useState("")
  const [error, setError] = useState("")

  const remaining = useCountdown(league.board.pickDeadline)
  const myTurn = league.board.onTheClock?.id === league.access.rosterId
  const canPickForOthers = league.access.canModerate

  const loadPlayers = useCallback(async () => {
    try {
      setPlayers(await listDraftPlayers(league.id, { free: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o pool")
    } finally {
      setLoading(false)
    }
  }, [league.id])

  useEffect(() => {
    void loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    if (!league.board.active) return
    const timer = setInterval(() => {
      onChanged()
      void loadPlayers()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [league.board.active, onChanged, loadPlayers])

  const positions = useMemo(
    () => [...new Set(players.map((player) => player.position.toUpperCase()))].sort(),
    [players],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return players.filter(
      (player) =>
        (!position || player.position.toUpperCase() === position) &&
        (!tier || tierOf(player.overall).id === tier) &&
        (!term || player.name.toLowerCase().includes(term) || (player.realTeam ?? "").toLowerCase().includes(term)),
    )
  }, [players, search, position, tier])

  // O pool vem em blocos de dez de overall: dá para ver de relance se ainda
  // sobrou craque na mesa ou se o que resta é elenco.
  const groups = useMemo(() => groupByTier(visible), [visible])
  const tierCounts = useMemo(
    () =>
      OVERALL_TIERS.map((option) => ({
        ...option,
        count: players.filter((player) => tierOf(player.overall).id === option.id).length,
      })).filter((option) => option.count > 0),
    [players],
  )

  const pick = async (playerId: string) => {
    setPickingId(playerId)
    setError("")
    try {
      await makePick(league.id, playerId, canPickForOthers ? league.board.onTheClock?.id : undefined)
      await loadPlayers()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar a escolha.")
    } finally {
      setPickingId("")
    }
  }

  if (!league.board.active) {
    return (
      <EmptyState
        icon={Sparkles}
        title={league.status === "SETUP" ? "O draft ainda não começou" : "O draft já foi concluído"}
        description={
          league.status === "SETUP"
            ? "O dono da liga inicia o draft quando houver elencos inscritos e jogadores suficientes no pool."
            : "Todos os elencos foram montados. Acompanhe as rodadas e a classificação."
        }
      />
    )
  }

  const pickedSoFar = league.board.currentPickNumber
  const progress = Math.round((pickedSoFar / Math.max(1, league.board.totalPicks)) * 100)

  return (
    <div className="space-y-4">
      <Card
        className={`border p-4 transition ${
          myTurn ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "border-white/[0.07] bg-white/[0.025]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Rodada {league.board.currentRound} · escolha {pickedSoFar + 1} de {league.board.totalPicks}
            </p>
            <p className="truncate text-xl font-black text-white">
              {myTurn ? "É a sua vez de escolher" : `Na vez: ${league.board.onTheClock?.name ?? "-"}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Timer className={`h-5 w-5 ${remaining <= 15 ? "text-red-400" : "text-gray-500"}`} />
            <span className={`text-2xl font-black tabular-nums ${remaining <= 15 ? "text-red-400" : "text-white"}`}>
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
        </div>

        {league.board.queue.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] text-gray-600">
              <Clock className="h-3 w-3" />
              Próximos:
            </span>
            {league.board.queue.slice(1, 5).map((entry, index) => (
              <span
                key={`${entry.roster.id}-${index}`}
                className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-gray-400"
              >
                {entry.roster.name}
              </span>
            ))}
          </div>
        )}

        {remaining === 0 && (
          <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300">
            O tempo acabou. O sistema escolhe o melhor jogador disponível em instantes.
          </p>
        )}
      </Card>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTier("")}
          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            tier === ""
              ? "border-white/20 bg-white/[0.08] text-white"
              : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
          }`}
        >
          Todos os níveis
        </button>
        {tierCounts.map((option) => (
          <button
            key={option.id}
            onClick={() => setTier(tier === option.id ? "" : option.id)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              tier === option.id ? option.chip : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
            }`}
          >
            {option.short}
            <span className="ml-1.5 text-[10px] font-black opacity-60">{option.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar jogador ou clube"
            className="border-white/10 bg-white/[0.03] pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setPosition("")}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              position === ""
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
            }`}
          >
            Todas
          </button>
          {positions.map((option) => (
            <button
              key={option}
              onClick={() => setPosition(option)}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                position === option
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.tier.id}>
              <div className="mb-2 flex items-center gap-2">
                <h4 className={`text-xs font-black uppercase tracking-wide ${group.tier.tone}`}>{group.tier.label}</h4>
                <span className="text-[11px] font-bold text-gray-600">{group.tier.short}</span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[11px] text-gray-600">{group.players.length} livres</span>
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {group.players.map((player) => (
                  <Card key={player.id} className="border-white/[0.07] bg-white/[0.025] p-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-black ${tierOf(player.overall).tone}`}
                      >
                        {player.overall}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{player.name}</p>
                        <p className="truncate text-[11px] text-gray-600">
                          {player.position}
                          {player.realTeam ? ` · ${player.realTeam}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => void pick(player.id)}
                        disabled={(!myTurn && !canPickForOthers) || pickingId !== ""}
                        className="flex-shrink-0 bg-emerald-500 text-black hover:bg-emerald-400"
                      >
                        {pickingId === player.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Escolher"}
                      </Button>
                    </div>

                    {hasAttributes(player) && (
                      <div className="mt-2 flex items-center justify-between gap-1 border-t border-white/[0.05] pt-2">
                        {attributeRow(player).map((attribute) => (
                          <span key={attribute.label} className="flex flex-1 flex-col items-center leading-none">
                            <span className={`text-[12px] font-black tabular-nums ${attributeTone(attribute.value)}`}>
                              {attribute.value ?? "-"}
                            </span>
                            <span className="text-[8px] uppercase tracking-wide text-gray-700">{attribute.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {visible.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
              Nenhum jogador livre com esse filtro.
            </p>
          )}
        </div>
      )}

      {!myTurn && !canPickForOthers && <StatusPill tone="neutral">Aguarde sua vez para poder escolher</StatusPill>}
    </div>
  )
}
