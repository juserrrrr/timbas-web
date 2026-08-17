"use client"

import { useEffect, useMemo, useState } from "react"
import { Coins, Gavel, Loader2, Save, Shirt, Star, Swords, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CoinAmount, EmptyState, StatusPill } from "@/components/competitions/shared"
import { BUDGET_TX_LABELS, FORMATIONS, INTENSITY_LABELS, MENTALITY_LABELS } from "@/lib/services/draft.types"
import {
  createAuction,
  getBudget,
  releasePlayer,
  setLineup,
  setTactics,
  type BudgetStatement,
} from "@/lib/services/draft"
import type { DraftLeagueDetail, DraftPlayer } from "@/lib/services/draft.types"

function startersFor(formation: string): number {
  const lines = formation.split("-").map(Number).filter((value) => Number.isFinite(value))
  return lines.reduce((total, value) => total + value, 1)
}

function TacticRow<T extends string>({
  label,
  options,
  labels,
  value,
  disabled,
  onPick,
}: {
  label: string
  options: readonly T[]
  labels: Record<T, string>
  value: T
  disabled: boolean
  onPick: (option: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-600">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            disabled={disabled}
            onClick={() => onPick(option)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              value === option
                ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
            }`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SquadPanel({ league, onChanged }: { league: DraftLeagueDetail; onChanged: () => void }) {
  const roster = league.rosters.find((entry) => entry.id === league.access.rosterId)
  const [formation, setFormation] = useState(roster?.formation ?? league.formation)
  const [selected, setSelected] = useState<string[]>(
    roster?.players.filter((player) => player.starter).map((player) => player.id) ?? [],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [statement, setStatement] = useState<BudgetStatement | null>(null)

  const rosterId = roster?.id
  useEffect(() => {
    if (!rosterId) return
    getBudget(league.id, rosterId)
      .then(setStatement)
      .catch(() => setStatement(null))
  }, [league.id, rosterId, league.currentRound])

  const wageBill = useMemo(
    () => roster?.players.reduce((total, player) => total + player.salary, 0) ?? 0,
    [roster],
  )

  const limit = useMemo(() => Math.min(startersFor(formation), roster?.players.length ?? 0), [formation, roster])

  if (!roster) {
    return (
      <EmptyState
        icon={Shirt}
        title="Você não tem elenco nesta liga"
        description="Entre na liga pela aba de classificação enquanto as inscrições estiverem abertas para montar seu time."
      />
    )
  }

  const toggle = (playerId: string) => {
    setNotice("")
    setSelected((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : current.length >= limit
          ? current
          : [...current, playerId],
    )
  }

  const save = async () => {
    setBusy(true)
    setError("")
    try {
      const starters = selected.map((playerId) => ({
        playerId,
        slot: roster.players.find((player) => player.id === playerId)?.position ?? "",
      }))
      await setLineup(league.id, formation, starters)
      setNotice("Escalação salva.")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a escalação.")
    } finally {
      setBusy(false)
    }
  }

  const saveTactics = async (input: Parameters<typeof setTactics>[1]) => {
    setBusy(true)
    setError("")
    try {
      await setTactics(league.id, input)
      setNotice("Tática atualizada.")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a tática.")
    } finally {
      setBusy(false)
    }
  }

  const auction = async (player: DraftPlayer) => {
    setBusy(true)
    setError("")
    try {
      await createAuction(league.id, { playerId: player.id })
      setNotice(
        `${player.name} foi para leilão por ${league.auctionHours}h, começando em ${player.price}. Quem der o maior lance leva.`,
      )
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o leilão.")
    } finally {
      setBusy(false)
    }
  }

  const release = async (player: DraftPlayer) => {
    setBusy(true)
    setError("")
    try {
      const result = await releasePlayer(league.id, player.id)
      setNotice(`${player.name} liberado para o mercado. Você recebeu ${result.refund} moedas.`)
      setSelected((current) => current.filter((id) => id !== player.id))
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível liberar o jogador.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">{roster.name}</h3>
            <p className="text-[11px] text-gray-500">
              {roster.players.length} de {league.rosterSize} jogadores · {roster.points} pontos na temporada
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone="neutral">
              {selected.length}/{limit} titulares
            </StatusPill>
            <Button
              onClick={() => void save()}
              disabled={busy || selected.length === 0}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Salvar escalação
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {FORMATIONS.map((option) => (
            <button
              key={option}
              onClick={() => {
                setFormation(option)
                setSelected((current) => current.slice(0, startersFor(option)))
              }}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                formation === option
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {notice && <p className="mt-3 text-[11px] text-emerald-400">{notice}</p>}
        {error && <p className="mt-3 text-[11px] text-red-400">{error}</p>}
      </Card>

      <Card
        className={`p-4 ${
          roster.budget < 0 ? "border-red-500/30 bg-red-500/[0.05]" : "border-white/[0.07] bg-white/[0.025]"
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-black text-white">Caixa da liga</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-600">Disponível</p>
            <p className={`text-lg font-black ${roster.budget < 0 ? "text-red-400" : "text-amber-300"}`}>
              {roster.budget.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-600">Folha por rodada</p>
            <p className="text-lg font-black text-white">{wageBill.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-600">Entrou</p>
            <p className="text-sm font-bold text-emerald-400">{roster.earned.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-600">Saiu</p>
            <p className="text-sm font-bold text-gray-400">{roster.spent.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-snug text-gray-500">
          Esse dinheiro é só desta liga e volta ao valor inicial quando um novo draft começa. Ele paga salário,
          contratação e transferência.
          {roster.budget < 0 && " Você está no vermelho, então não dá para contratar até o caixa virar."}
        </p>

        {statement && statement.entries.length > 0 && (
          <div className="mt-3 max-h-44 space-y-1 overflow-y-auto border-t border-white/[0.06] pt-2">
            {statement.entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 text-[11px]">
                <span
                  className={`w-16 flex-shrink-0 text-right font-black tabular-nums ${
                    entry.amount >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount.toLocaleString("pt-BR")}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-400">{entry.description}</span>
                <span className="flex-shrink-0 text-[10px] text-gray-600">{BUDGET_TX_LABELS[entry.type]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-1 flex items-center gap-2">
          <Swords className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-black text-white">Tática</h3>
        </div>
        <p className="mb-3 text-[11px] text-gray-500">
          {league.resultMode === "SIMULATED"
            ? "Vale para a próxima rodada simulada. Postura ofensiva cria mais chance e entrega mais também."
            : "Fica guardada para quando a liga usar rodada simulada."}
        </p>

        <div className="space-y-3">
          <TacticRow
            label="Postura"
            options={["DEFENSIVE", "BALANCED", "ATTACKING"] as const}
            labels={MENTALITY_LABELS}
            value={roster.mentality}
            disabled={busy}
            onPick={(mentality) => void saveTactics({ mentality })}
          />
          <TacticRow
            label="Marcação"
            options={["LOW", "MEDIUM", "HIGH"] as const}
            labels={INTENSITY_LABELS}
            value={roster.pressing}
            disabled={busy}
            onPick={(pressing) => void saveTactics({ pressing })}
          />
          <TacticRow
            label="Ritmo"
            options={["LOW", "MEDIUM", "HIGH"] as const}
            labels={INTENSITY_LABELS}
            value={roster.tempo}
            disabled={busy}
            onPick={(tempo) => void saveTactics({ tempo })}
          />
        </div>
      </Card>

      {roster.players.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Elenco vazio"
          description="Seus jogadores aparecem aqui conforme você os escolhe na sala do draft."
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {roster.players.map((player) => {
            const isStarter = selected.includes(player.id)
            return (
              <Card
                key={player.id}
                className={`flex items-center gap-3 border p-3 transition ${
                  isStarter ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-white/[0.07] bg-white/[0.025]"
                }`}
              >
                <button
                  onClick={() => toggle(player.id)}
                  aria-label={isStarter ? `Tirar ${player.name} da escalação` : `Escalar ${player.name}`}
                  className={`flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-black transition ${
                    isStarter ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.06] text-white hover:bg-white/[0.1]"
                  }`}
                >
                  {player.overall}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                    {player.name}
                    {isStarter && <Star className="h-3 w-3 flex-shrink-0 fill-emerald-400 text-emerald-400" />}
                  </p>
                  <p className="truncate text-[11px] text-gray-600">
                    {player.position}
                    {player.realTeam ? ` · ${player.realTeam}` : ""} · {player.appearances} jogos
                  </p>
                  {player.appearances > 0 && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500">
                      <span className="font-bold text-gray-300">
                        {player.rating?.toFixed(1) ?? "-"} de média
                      </span>
                      {player.goals > 0 && <span>{player.goals} gol(s)</span>}
                      {player.assists > 0 && <span>{player.assists} assist.</span>}
                      {player.form !== 0 && (
                        <span className={player.form > 0 ? "text-emerald-400" : "text-red-400"}>
                          forma {player.form > 0 ? `+${player.form}` : player.form}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <CoinAmount value={player.price} className="text-[11px]" />
                  <span className="text-[10px] text-gray-600">{player.salary}/rodada</span>
                  {league.status === "ACTIVE" && league.transferWindowOpen && league.auctionsEnabled && (
                    <button
                      onClick={() => void auction(player)}
                      disabled={busy}
                      className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-gray-600 transition hover:text-amber-400"
                    >
                      <Gavel className="h-3 w-3" />
                      Leiloar
                    </button>
                  )}
                  {league.status === "ACTIVE" && league.transferWindowOpen && (
                    <button
                      onClick={() => void release(player)}
                      disabled={busy}
                      className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-gray-600 transition hover:text-red-400"
                    >
                      <Undo2 className="h-3 w-3" />
                      Liberar
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
