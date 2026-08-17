"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeftRight, Check, Coins, Loader2, Search, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CoinAmount, EmptyState, StatusPill } from "@/components/competitions/shared"
import {
  cancelOffer,
  createOffer,
  listBaseMarket,
  listDraftPlayers,
  listOffers,
  respondOffer,
  signFromBase,
  type BaseMarketPlayer,
} from "@/lib/services/draft"
import { OFFER_KIND_LABELS, type DraftLeagueDetail, type DraftPlayer, type TransferOffer } from "@/lib/services/draft.types"

export function MarketPanel({ league, onChanged }: { league: DraftLeagueDetail; onChanged: () => void }) {
  const [players, setPlayers] = useState<DraftPlayer[]>([])
  const [basePlayers, setBasePlayers] = useState<BaseMarketPlayer[]>([])
  const [offers, setOffers] = useState<TransferOffer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      const [playersData, offersData, baseData] = await Promise.all([
        listDraftPlayers(league.id),
        listOffers(league.id),
        league.sources.length > 0
          ? listBaseMarket(league.id, { search: search.trim() || undefined })
          : Promise.resolve({ competitions: [], players: [] }),
      ])
      setPlayers(playersData)
      setOffers(offersData)
      setBasePlayers(baseData.players)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o mercado")
    } finally {
      setLoading(false)
    }
  }, [league.id, league.sources.length, search])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300)
    return () => clearTimeout(timer)
  }, [load])

  const term = search.trim().toLowerCase()
  const freeAgents = useMemo(
    () => players.filter((player) => !player.rosterId && (!term || player.name.toLowerCase().includes(term))),
    [players, term],
  )
  const signedPlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          player.rosterId && player.rosterId !== league.access.rosterId && (!term || player.name.toLowerCase().includes(term)),
      ),
    [players, term, league.access.rosterId],
  )

  const myRoster = league.rosters.find((entry) => entry.id === league.access.rosterId)
  const marketOpen = league.status === "ACTIVE" && league.transferWindowOpen && Boolean(league.access.rosterId)

  const run = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusyId(id)
    setError("")
    try {
      await action()
      setNotice(message)
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a operação.")
    } finally {
      setBusyId("")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    )
  }

  const pendingOffers = offers.filter((offer) => offer.status === "PENDING")

  return (
    <div className="space-y-5">
      {!marketOpen && (
        <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] text-gray-500">
          {league.status !== "ACTIVE"
            ? "O mercado abre quando o draft termina e a temporada começa."
            : !league.transferWindowOpen
              ? "A janela de transferências está fechada pela organização."
              : "Entre na liga com um elenco para negociar."}
        </p>
      )}
      {myRoster && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[12px] text-amber-200">
            <Coins className="h-4 w-4" />
            Caixa do {myRoster.name} nesta liga
          </span>
          <span className={`text-sm font-black ${myRoster.budget < 0 ? "text-red-400" : "text-amber-300"}`}>
            {myRoster.budget.toLocaleString("pt-BR")}
          </span>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">{notice}</p>}

      {pendingOffers.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">Propostas em aberto</h3>
          <div className="space-y-2">
            {pendingOffers.map((offer) => (
              <Card key={offer.id} className="flex flex-wrap items-center gap-3 border-white/[0.07] bg-white/[0.025] p-3">
                <ArrowLeftRight className="h-4 w-4 flex-shrink-0 text-blue-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {offer.fromRoster.name} quer {offer.player.name}
                  </p>
                  <p className="truncate text-[11px] text-gray-600">
                    {OFFER_KIND_LABELS[offer.kind]}
                    {offer.message ? ` · "${offer.message}"` : ""}
                  </p>
                </div>
                <CoinAmount value={offer.price} />
                {offer.canRespond && (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => void run(offer.id, () => respondOffer(league.id, offer.id, true), "Proposta aceita.")}
                      disabled={busyId === offer.id}
                      className="bg-emerald-500 text-black hover:bg-emerald-400"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void run(offer.id, () => respondOffer(league.id, offer.id, false), "Proposta recusada.")}
                      disabled={busyId === offer.id}
                      className="border-red-500/25 text-red-400 hover:bg-red-500/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {offer.canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void run(offer.id, () => cancelOffer(league.id, offer.id), "Proposta cancelada.")}
                    disabled={busyId === offer.id}
                  >
                    Cancelar
                  </Button>
                )}
                {!offer.canRespond && !offer.canCancel && <StatusPill tone="neutral">Aguardando resposta</StatusPill>}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar jogador no mercado"
          className="border-white/10 bg-white/[0.03] pl-9"
        />
      </div>

      {league.sources.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-gray-500">
            Fora da liga ({league.sources.map((source) => source.competition.name).join(", ")})
          </h3>
          <p className="mb-2 text-[11px] text-gray-600">
            Jogadores da base que ainda não estão nesta liga. Contratar traz o cara para o seu elenco na hora.
          </p>

          {basePlayers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-gray-600">
              {term ? "Ninguém com esse nome fora da liga." : "Toda a base liberada já está nesta liga."}
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {basePlayers.slice(0, 30).map((player) => (
                <Card key={player.id} className="flex items-center gap-3 border-sky-500/20 bg-sky-500/[0.04] p-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-black text-white">
                    {player.overall}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{player.name}</p>
                    <p className="truncate text-[11px] text-gray-600">
                      {player.position} · {player.team.name} · {player.team.competition.name}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <CoinAmount value={player.price} className="text-[11px]" />
                    <Button
                      size="sm"
                      disabled={!marketOpen || busyId === player.id}
                      onClick={() =>
                        void run(
                          player.id,
                          () => signFromBase(league.id, player.id),
                          `${player.name} contratado de ${player.team.name}.`,
                        )
                      }
                      className="h-7 bg-sky-500 px-2 text-[11px] text-black hover:bg-sky-400"
                    >
                      {busyId === player.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Contratar"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">
          Jogadores livres ({freeAgents.length})
        </h3>
        {freeAgents.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Sem jogadores livres" description="Todo mundo já tem clube nesta liga." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {freeAgents.slice(0, 60).map((player) => (
              <Card key={player.id} className="flex items-center gap-3 border-white/[0.07] bg-white/[0.025] p-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-black text-white">
                  {player.overall}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{player.name}</p>
                  <p className="truncate text-[11px] text-gray-600">
                    {player.position}
                    {player.realTeam ? ` · ${player.realTeam}` : ""}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <CoinAmount value={player.price} className="text-[11px]" />
                  <Button
                    size="sm"
                    disabled={!marketOpen || busyId === player.id}
                    onClick={() =>
                      void run(
                        player.id,
                        () => createOffer(league.id, { kind: "BUY_FREE_AGENT", playerId: player.id }),
                        `${player.name} contratado.`,
                      )
                    }
                    className="h-7 bg-emerald-500 px-2 text-[11px] text-black hover:bg-emerald-400"
                  >
                    {busyId === player.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Contratar"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">
          Jogadores de outros elencos ({signedPlayers.length})
        </h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {signedPlayers.slice(0, 60).map((player) => (
            <Card key={player.id} className="flex items-center gap-3 border-white/[0.07] bg-white/[0.025] p-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-black text-white">
                {player.overall}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{player.name}</p>
                <p className="truncate text-[11px] text-gray-600">
                  {player.position} · {player.roster?.name ?? "-"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!marketOpen || busyId === player.id}
                onClick={() =>
                  void run(
                    player.id,
                    () =>
                      createOffer(league.id, {
                        kind: "BUY_FROM_ROSTER",
                        playerId: player.id,
                        price: player.price,
                      }),
                    "Proposta enviada.",
                  )
                }
                className="h-7 flex-shrink-0 px-2 text-[11px]"
              >
                {busyId === player.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Fazer proposta"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
