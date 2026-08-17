"use client"

import { useState } from "react"
import { Crown, Loader2, Play, ShieldCheck, Trash2, Upload, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { StatusPill } from "@/components/competitions/shared"
import {
  importDraftPlayers,
  removeDraftStaff,
  setDraftStaff,
  startDraft,
  transferDraftOwnership,
  updateDraftLeague,
  type PlayerImportInput,
} from "@/lib/services/draft"
import type { DraftLeagueDetail } from "@/lib/services/draft.types"

const IMPORT_EXAMPLE = `Neymar;ATA;89;Santos;500
Alisson;GOL;88;Liverpool;400
Casemiro;VOL;85;São Paulo;350`

function parsePlayers(raw: string): PlayerImportInput[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, position, overall, realTeam, price] = line.split(/[;,\t]/).map((part) => part?.trim())
      return {
        name,
        position: position || "ATA",
        overall: Number(overall) || 70,
        realTeam: realTeam || undefined,
        price: Number(price) || 100,
      }
    })
    .filter((player) => player.name && player.name.length >= 2)
}

export function LeagueAdminPanel({ league, onChanged }: { league: DraftLeagueDetail; onChanged: () => void }) {
  const [raw, setRaw] = useState("")
  const [replace, setReplace] = useState(false)
  const [userId, setUserId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const parsed = parsePlayers(raw)

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true)
    setError("")
    try {
      await action()
      setNotice(message)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy(false)
    }
  }

  const owner = league.staff.find((member) => member.role === "OWNER")
  const moderators = league.staff.filter((member) => member.role === "MODERATOR")

  return (
    <div className="space-y-4">
      {notice && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}

      {league.access.canManage && league.status === "SETUP" && (
        <Card className="border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <h3 className="text-sm font-black text-white">Iniciar o draft</h3>
          <p className="mt-1 text-[11px] text-gray-400">
            A ordem das escolhas é sorteada e o cronômetro começa. São necessários ao menos 2 elencos e{" "}
            {league.rosters.length * league.rosterSize || league.rosterSize} jogadores no pool.
          </p>
          <Button
            onClick={() => void run(() => startDraft(league.id), "Draft iniciado. Boa escolha!")}
            disabled={busy || league.rosters.length < 2}
            className="mt-3 bg-emerald-500 text-black hover:bg-emerald-400"
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            Sortear ordem e começar
          </Button>
        </Card>
      )}

      {league.access.canModerate && league.status === "SETUP" && (
        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-black text-white">Pool de jogadores</h3>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            Uma linha por jogador, separando por ponto e vírgula:{" "}
            <span className="text-gray-400">nome;posição;overall;clube;preço</span>
          </p>
          <Textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder={IMPORT_EXAMPLE}
            rows={8}
            className="border-white/10 bg-black/30 font-mono text-[12px]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={replace} onCheckedChange={setReplace} />
              <span className="text-[11px] text-gray-400">Substituir o pool atual</span>
            </label>
            <div className="flex items-center gap-2">
              <StatusPill tone="neutral">{parsed.length} jogadores lidos</StatusPill>
              <Button
                onClick={() =>
                  void run(() => importDraftPlayers(league.id, parsed, replace), `${parsed.length} jogadores importados.`)
                }
                disabled={busy || parsed.length === 0}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Importar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {league.access.canManage && league.status === "ACTIVE" && (
        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span>
              <span className="block text-sm font-bold text-white">Janela de transferências</span>
              <span className="block text-[11px] text-gray-500">
                Quando fechada, ninguém compra, vende ou troca jogadores
              </span>
            </span>
            <Switch
              checked={league.transferWindowOpen}
              onCheckedChange={(checked) =>
                void run(
                  () => updateDraftLeague(league.id, { transferWindowOpen: checked }),
                  checked ? "Mercado aberto." : "Mercado fechado.",
                )
              }
            />
          </label>
        </Card>
      )}

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-black text-white">Quem manda na liga</h3>
        </div>

        <div className="space-y-2">
          {owner && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5">
              <Crown className="h-4 w-4 flex-shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{owner.user.name}</p>
                <p className="text-[11px] text-gray-500">
                  Edita as regras, importa o pool, inicia o draft, abre e fecha o mercado
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
                <p className="text-[11px] text-gray-500">Aprova provas de placar, lança resultados e escolhe por quem travar</p>
              </div>
              {league.access.canManage && (
                <>
                  <button
                    onClick={() =>
                      void run(() => transferDraftOwnership(league.id, member.userId), "Posse transferida.")
                    }
                    disabled={busy}
                    className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 transition hover:bg-amber-500/10 hover:text-amber-400"
                  >
                    Passar posse
                  </button>
                  <button
                    onClick={() => void run(() => removeDraftStaff(league.id, member.userId), "Moderador removido.")}
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
              Nenhum moderador ainda.
            </p>
          )}
        </div>

        {league.access.canManage && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <Label htmlFor="draft-staff-id" className="text-[11px]">
              Adicionar moderador pelo ID do usuário
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="draft-staff-id"
                value={userId}
                onChange={(event) => setUserId(event.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 12"
                className="border-white/10 bg-white/[0.03]"
              />
              <Button
                onClick={() =>
                  void run(() => setDraftStaff(league.id, Number(userId), "MODERATOR"), "Moderador adicionado.").then(
                    () => setUserId(""),
                  )
                }
                disabled={busy || !userId}
                variant="outline"
              >
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
