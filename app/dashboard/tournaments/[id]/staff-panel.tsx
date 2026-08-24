"use client"

import { useState } from "react"
import { Crown, Loader2, ShieldCheck, Trash2, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CoinAmount, StatusPill } from "@/components/competitions/shared"
import { removeStaff, setStaff, transferOwnership } from "@/lib/services/tournaments"
import type { TournamentDetail } from "@/lib/services/tournaments.types"

export function StaffPanel({ tournament, onChanged }: { tournament: TournamentDetail; onChanged: () => void }) {
  const [userId, setUserId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError("")
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy(false)
    }
  }

  const owner = tournament.staff.find((member) => member.role === "OWNER")
  const moderators = tournament.staff.filter((member) => member.role === "MODERATOR")

  return (
    <div className="space-y-4">
      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-black text-white">Quem manda no campeonato</h3>
        </div>

        <div className="space-y-2">
          {owner && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5">
              <Crown className="h-4 w-4 flex-shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{owner.user.name}</p>
                <p className="text-[11px] text-gray-500">
                  Cria e apaga o campeonato, edita as regras, inicia a chave e gerencia a equipe
                </p>
              </div>
              <StatusPill tone="warn">Dono</StatusPill>
            </div>
          )}

          {moderators.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5"
            >
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{member.user.name}</p>
                <p className="text-[11px] text-gray-500">
                  Aprova ou recusa provas, lança resultados, agenda partidas e declara W.O.
                </p>
              </div>
              {tournament.access.canManage && (
                <>
                  <button
                    onClick={() => void run(() => transferOwnership(tournament.id, member.userId))}
                    disabled={busy}
                    className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 transition hover:bg-amber-500/10 hover:text-amber-400"
                  >
                    Passar posse
                  </button>
                  <button
                    onClick={() => void run(() => removeStaff(tournament.id, member.userId))}
                    disabled={busy}
                    aria-label={`Remover ${member.user.name}`}
                    className="cursor-pointer rounded-lg p-1.5 text-gray-600 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}

          {moderators.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-gray-600">
              Nenhum moderador ainda. Adicione alguém para dividir o trabalho de aprovar resultados.
            </p>
          )}
        </div>

        {tournament.access.canManage && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <Label htmlFor="staff-user-id" className="text-[11px]">
              Adicionar moderador pelo ID do usuário
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="staff-user-id"
                value={userId}
                onChange={(event) => setUserId(event.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 12"
                className="border-white/10 bg-white/[0.03]"
              />
              <Button
                onClick={() => void run(() => setStaff(tournament.id, Number(userId), "MODERATOR")).then(() => setUserId(""))}
                disabled={busy || !userId}
                variant="outline"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      </Card>

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <h3 className="mb-3 text-sm font-black text-white">Premiação em moedas</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Vitória", value: tournament.coinsWin },
            { label: "Empate", value: tournament.coinsDraw },
            { label: "Participação", value: tournament.coinsLoss },
          ].map((prize) => (
            <div key={prize.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">{prize.label}</p>
              <CoinAmount value={prize.value} className="mt-0.5 text-sm" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-gray-600">
          As moedas são creditadas na carteira de cada jogador do time assim que o resultado é confirmado.
        </p>
      </Card>
    </div>
  )
}
