"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDownRight, ArrowUpRight, Coins, Crown, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CompetitionHeader,
  EmptyState,
  ErrorState,
  PageLoading,
  StatTile,
  formatCoins,
  formatDateTime,
} from "@/components/competitions/shared"
import { getCoinRanking, getStatement, TX_LABELS, type CoinRankingRow, type WalletStatement } from "@/lib/services/wallet"

const PAGE_SIZE = 20

export default function WalletPage() {
  const [statement, setStatement] = useState<WalletStatement | null>(null)
  const [ranking, setRanking] = useState<CoinRankingRow[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [statementData, rankingData] = await Promise.all([
        getStatement(PAGE_SIZE, page * PAGE_SIZE),
        getCoinRanking(10),
      ])
      setStatement(statementData)
      setRanking(rankingData)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar sua carteira")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error || !statement) return <ErrorState message={error || "Carteira indisponível"} retry={() => void load()} />

  const totalPages = Math.max(1, Math.ceil(statement.total / PAGE_SIZE))

  return (
    <div className="dashboard-view space-y-6">
      <CompetitionHeader
        eyebrow="Economia"
        title="Carteira"
        subtitle="Suas moedas vêm de vitórias, empates e premiações. Use no mercado da Liga Draft."
        icon={Wallet}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Saldo atual" value={formatCoins(statement.balance)} icon={Coins} accent="text-amber-400" />
        <StatTile
          label="Total ganho"
          value={formatCoins(statement.totalEarned)}
          icon={TrendingUp}
          accent="text-emerald-400"
        />
        <StatTile label="Total gasto" value={formatCoins(statement.totalSpent)} icon={TrendingDown} accent="text-rose-400" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">Extrato</h2>

          {statement.items.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="Sua carteira ainda está zerada"
              description="Jogue um campeonato ou uma rodada da Liga Draft para começar a ganhar moedas."
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                {statement.items.map((transaction) => {
                  const positive = transaction.amount >= 0
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0"
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                          positive ? "bg-emerald-500/10" : "bg-rose-500/10"
                        }`}
                      >
                        {positive ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-rose-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">{transaction.description}</p>
                        <p className="text-[11px] text-gray-600">
                          {TX_LABELS[transaction.type]} · {formatDateTime(transaction.createdAt)}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p
                          className={`text-sm font-black tabular-nums ${
                            positive ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {positive ? "+" : ""}
                          {formatCoins(transaction.amount)}
                        </p>
                        <p className="text-[11px] tabular-nums text-gray-600">
                          saldo {formatCoins(transaction.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Anterior
                  </Button>
                  <span className="text-[11px] text-gray-600">
                    Página {page + 1} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">Maiores saldos</h2>
          <Card className="overflow-hidden border-white/[0.07] bg-white/[0.02] p-0">
            {ranking.map((row) => (
              <div key={row.userId} className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-0">
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[11px] font-black ${
                    row.position === 1 ? "bg-amber-500/15 text-amber-400" : "text-gray-600"
                  }`}
                >
                  {row.position === 1 ? <Crown className="h-3.5 w-3.5" /> : row.position}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{row.name}</span>
                <span className="flex-shrink-0 text-[13px] font-black tabular-nums text-amber-400">
                  {formatCoins(row.balance)}
                </span>
              </div>
            ))}
            {ranking.length === 0 && (
              <p className="px-4 py-8 text-center text-[11px] text-gray-600">Ninguém tem moedas ainda.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
