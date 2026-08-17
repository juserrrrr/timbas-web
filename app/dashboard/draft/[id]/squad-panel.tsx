"use client"

import { useMemo, useState } from "react"
import { Loader2, Save, Shirt, Star, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CoinAmount, EmptyState, StatusPill } from "@/components/competitions/shared"
import { FORMATIONS } from "@/lib/services/draft.types"
import { releasePlayer, setLineup } from "@/lib/services/draft"
import type { DraftLeagueDetail, DraftPlayer } from "@/lib/services/draft.types"

function startersFor(formation: string): number {
  const lines = formation.split("-").map(Number).filter((value) => Number.isFinite(value))
  return lines.reduce((total, value) => total + value, 1)
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
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <CoinAmount value={player.price} className="text-[11px]" />
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
