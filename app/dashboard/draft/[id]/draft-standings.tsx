"use client"

import { useState } from "react"
import { Loader2, LogIn, LogOut, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState, TeamCrest } from "@/components/competitions/shared"
import { joinDraftLeague, leaveDraftLeague } from "@/lib/services/draft"
import type { DraftLeagueDetail } from "@/lib/services/draft.types"

export function DraftStandings({ league, onChanged }: { league: DraftLeagueDetail; onChanged: () => void }) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const canJoin = league.status === "SETUP" && !league.access.rosterId
  const canLeave = league.status === "SETUP" && Boolean(league.access.rosterId)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError("")
    try {
      await action()
      setName("")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {canJoin && (
        <Card className="border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <h3 className="text-sm font-black text-white">Entrar na liga</h3>
          <p className="mt-1 text-[11px] text-gray-400">
            Escolha o nome do seu time. Você vai montar o elenco na sala do draft.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do seu time"
              className="border-white/10 bg-white/[0.03]"
            />
            <Button
              onClick={() => void run(() => joinDraftLeague(league.id, { name: name.trim() }))}
              disabled={busy || name.trim().length < 2}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />}
              Entrar
            </Button>
          </div>
          {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
        </Card>
      )}

      {league.rosters.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum elenco inscrito"
          description="Chame a galera. Cada participante entra com um time e monta o elenco no draft."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-gray-600">
                  <th className="w-8 px-3 py-2 text-left font-bold">#</th>
                  <th className="px-2 py-2 text-left font-bold">Elenco</th>
                  <th className="w-10 px-1 py-2 text-center font-bold">J</th>
                  <th className="w-10 px-1 py-2 text-center font-bold">V</th>
                  <th className="w-10 px-1 py-2 text-center font-bold">E</th>
                  <th className="w-10 px-1 py-2 text-center font-bold">D</th>
                  <th className="w-14 px-1 py-2 text-center font-bold">Saldo</th>
                  <th className="w-12 px-2 py-2 text-center font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {league.standings.map((row) => {
                  const isMine = row.rosterId === league.access.rosterId
                  return (
                    <tr
                      key={row.rosterId}
                      className={`border-b border-white/[0.03] last:border-0 ${isMine ? "bg-emerald-500/[0.05]" : ""}`}
                    >
                      <td className="px-3 py-2 text-[11px] font-black text-gray-600">{row.position}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <TeamCrest name={row.name} logoUrl={row.logoUrl} size={24} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{row.name}</p>
                            <p className="truncate text-[10px] text-gray-600">{row.manager.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums text-gray-400">{row.played}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-emerald-400">{row.wins}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-gray-400">{row.draws}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-red-400">{row.losses}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-gray-400">
                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                      </td>
                      <td className="px-2 py-2 text-center text-[15px] font-black tabular-nums text-white">
                        {row.points}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canLeave && (
        <Button
          variant="outline"
          onClick={() => void run(() => leaveDraftLeague(league.id))}
          disabled={busy}
          className="border-red-500/25 text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="mr-1.5 h-4 w-4" />
          Sair da liga
        </Button>
      )}
    </div>
  )
}
