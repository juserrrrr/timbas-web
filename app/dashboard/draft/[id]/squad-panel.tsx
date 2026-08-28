"use client"

import { useMemo, useState } from "react"
import { Loader2, Save, Shirt, Star, Swords } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, StatusPill } from "@/components/competitions/shared"
import { FORMATIONS, INTENSITY_LABELS, MENTALITY_LABELS } from "@/lib/services/draft.types"
import {
  setLineup,
  setTactics,
} from "@/lib/services/draft"
import type { DraftLeagueDetail } from "@/lib/services/draft.types"

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

  return (
    <div className="space-y-4">
      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">{roster.name}</h3>
            <p className="text-[11px] text-gray-500">
              {roster.players.length} de {league.rosterSize} jogadores, {selected.length} escalados e{" "}
              {Math.max(0, roster.players.length - selected.length)} no banco · {roster.points} pontos na temporada
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

        <p className="mt-3 text-[11px] leading-snug text-gray-600">
          {league.resultMode === "SIMULATED"
            ? "Quem você escalar entra em campo na rodada simulada."
            : "Vocês jogam no EA FC 26, então a escalação de verdade é lá. Aqui ela serve para contar presença e para saber quem estava em campo."}
        </p>

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

      {league.resultMode === "SIMULATED" && (
      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-1 flex items-center gap-2">
          <Swords className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-black text-white">Tática</h3>
        </div>
        <p className="mb-3 text-[11px] text-gray-500">
          Vale para a próxima rodada simulada. Postura ofensiva cria mais chance e entrega mais também.
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
      )}

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

              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
