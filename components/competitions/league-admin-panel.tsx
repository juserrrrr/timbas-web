"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Crown, Globe2, Loader2, Play, ShieldCheck, Trash2, Upload, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { StatusPill } from "@/components/competitions/shared"
import { formatMoney } from "@/lib/money"
import { listCompetitions } from "@/lib/services/catalog"
import {
  importDraftPlayers,
  removeDraftStaff,
  setDraftStaff,
  startDraft,
  transferDraftOwnership,
  updateDraftLeague,
  type PlayerImportInput,
} from "@/lib/services/draft"
import {
  RESULT_MODE_HINTS,
  RESULT_MODE_LABELS,
  WEEKDAY_SHORT,
  type DraftLeagueDetail,
} from "@/lib/services/draft.types"

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
  const [competitions, setCompetitions] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (!league.access.canManage) return
    listCompetitions()
      .then((result) => setCompetitions(result.items))
      .catch(() => setCompetitions([]))
  }, [league.access.canManage])

  const parsed = parsePlayers(raw)
  const sourceIds = league.sources.map((source) => source.competitionId)

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

      {league.access.canManage && (
        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-black text-white">Calendário, simulação e mercado</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Dias de rodada</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_SHORT.map((label, day) => {
                  const active = league.matchDays.includes(day)
                  return (
                    <button
                      key={day}
                      disabled={busy}
                      onClick={() => {
                        const next = active
                          ? league.matchDays.filter((item) => item !== day)
                          : [...league.matchDays, day].sort((first, second) => first - second)
                        if (next.length === 0) return
                        void run(
                          () => updateDraftLeague(league.id, { matchDays: next }),
                          `Rodadas em ${next.map((item) => WEEKDAY_SHORT[item]).join(", ")}.`,
                        )
                      }}
                      className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                        active
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                          : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-gray-600">
                A rodada é marcada nesses dias, às {String(league.matchHour).padStart(2, "0")}h.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="match-hour">Hora da rodada</Label>
                <Input
                  id="match-hour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={league.matchHour}
                  onBlur={(event) => {
                    const hour = Number(event.target.value)
                    if (hour === league.matchHour || hour < 0 || hour > 23) return
                    void run(() => updateDraftLeague(league.id, { matchHour: hour }), `Rodadas às ${hour}h.`)
                  }}
                  className="border-white/10 bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="market-close">Mercado fecha antes (minutos)</Label>
                <Input
                  id="market-close"
                  type="number"
                  min={0}
                  max={10080}
                  defaultValue={league.marketClosesMinutesBefore}
                  onBlur={(event) => {
                    const minutes = Number(event.target.value)
                    if (minutes === league.marketClosesMinutesBefore || minutes < 0) return
                    void run(
                      () => updateDraftLeague(league.id, { marketClosesMinutesBefore: minutes }),
                      `Mercado fecha ${minutes} minutos antes da rodada.`,
                    )
                  }}
                  className="border-white/10 bg-white/[0.03]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="starting-budget">Caixa inicial de cada elenco</Label>
                <Input
                  id="starting-budget"
                  type="number"
                  min={0}
                  step={100}
                  defaultValue={league.startingBudget}
                  onBlur={(event) => {
                    const budget = Number(event.target.value)
                    if (budget === league.startingBudget || budget < 0) return
                    void run(
                      () => updateDraftLeague(league.id, { startingBudget: budget }),
                      `Cada elenco começa com ${budget}.`,
                    )
                  }}
                  className="border-white/10 bg-white/[0.03]"
                />
                <p className="text-[11px] text-gray-600">
                  {formatMoney(league.startingBudget)} por elenco. Vale a partir do próximo draft: começar o draft
                  reparte esse caixa de novo para todos.
                </p>
              </div>

              <label className="flex h-fit cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">Cobrar salário</span>
                  <span className="block text-[11px] leading-snug text-gray-500">
                    A cada rodada, a folha do elenco sai do caixa
                  </span>
                </span>
                <Switch
                  checked={league.paySalaries}
                  onCheckedChange={(checked) =>
                    void run(
                      () => updateDraftLeague(league.id, { paySalaries: checked }),
                      checked ? "Salário passa a ser cobrado." : "Salário desligado.",
                    )
                  }
                />
              </label>
            </div>

            <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">Leilão</span>
                  <span className="block text-[11px] leading-snug text-gray-500">
                    Lance aberto, dinheiro preso no lance e prorrogação no fim
                  </span>
                </span>
                <Switch
                  checked={league.auctionsEnabled}
                  onCheckedChange={(checked) =>
                    void run(
                      () => updateDraftLeague(league.id, { auctionsEnabled: checked }),
                      checked ? "Leilão liberado." : "Leilão desligado.",
                    )
                  }
                />
              </label>

              {league.auctionsEnabled && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="auction-hours">Duração (h)</Label>
                    <Input
                      id="auction-hours"
                      type="number"
                      min={1}
                      max={336}
                      defaultValue={league.auctionHours}
                      onBlur={(event) => {
                        const hours = Number(event.target.value)
                        if (hours === league.auctionHours || hours < 1) return
                        void run(
                          () => updateDraftLeague(league.id, { auctionHours: hours }),
                          `Leilão passa a durar ${hours}h.`,
                        )
                      }}
                      className="border-white/10 bg-white/[0.03]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auction-increment">Incremento (%)</Label>
                    <Input
                      id="auction-increment"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={league.auctionMinIncrementPercent}
                      onBlur={(event) => {
                        const percent = Number(event.target.value)
                        if (percent === league.auctionMinIncrementPercent || percent < 0) return
                        void run(
                          () => updateDraftLeague(league.id, { auctionMinIncrementPercent: percent }),
                          `Cada lance sobe ao menos ${percent}%.`,
                        )
                      }}
                      className="border-white/10 bg-white/[0.03]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auction-antisnipe">Prorrogação (min)</Label>
                    <Input
                      id="auction-antisnipe"
                      type="number"
                      min={0}
                      max={120}
                      defaultValue={league.auctionAntiSnipeMinutes}
                      onBlur={(event) => {
                        const minutes = Number(event.target.value)
                        if (minutes === league.auctionAntiSnipeMinutes || minutes < 0) return
                        void run(
                          () => updateDraftLeague(league.id, { auctionAntiSnipeMinutes: minutes }),
                          minutes === 0 ? "Prorrogação desligada." : `Lance no fim empurra ${minutes} min.`,
                        )
                      }}
                      className="border-white/10 bg-white/[0.03]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              {(["REPORTED", "SIMULATED"] as const).map((mode) => (
                <button
                  key={mode}
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => updateDraftLeague(league.id, { resultMode: mode }),
                      mode === "SIMULATED"
                        ? "A rodada passa a ser jogada pelo servidor."
                        : "O placar volta a ser lançado por quem joga.",
                    )
                  }
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    league.resultMode === mode
                      ? "border-violet-500/40 bg-violet-500/[0.08]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${
                      league.resultMode === mode ? "text-violet-300" : "text-white"
                    }`}
                  >
                    {RESULT_MODE_LABELS[mode]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                    {RESULT_MODE_HINTS[mode]}
                  </span>
                </button>
              ))}
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white">Mercado automático</span>
                <span className="block text-[11px] leading-snug text-gray-500">
                  Fecha sozinho antes da rodada e reabre quando ela termina
                </span>
              </span>
              <Switch
                checked={league.marketAutoManaged}
                onCheckedChange={(checked) =>
                  void run(
                    () => updateDraftLeague(league.id, { marketAutoManaged: checked }),
                    checked ? "Mercado no automático." : "Mercado no manual.",
                  )
                }
              />
            </label>

            {league.status === "ACTIVE" && (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">Janela de transferências</span>
                  <span className="block text-[11px] leading-snug text-gray-500">
                    {league.marketAutoManaged
                      ? "No automático isso volta a mudar sozinho na próxima checagem"
                      : "Quando fechada, ninguém compra, vende ou troca jogadores"}
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
            )}
          </div>
        </Card>
      )}

      {league.access.canManage && (
        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-1 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-black text-white">De onde vêm os jogadores</h3>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            Marque as competições da base que esta liga aceita. Só o Brasileirão deixa a liga fechada nele; com mais de
            uma, dá para contratar de fora durante a temporada.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {competitions.map((competition) => {
              const active = sourceIds.includes(competition.id)
              return (
                <button
                  key={competition.id}
                  disabled={busy}
                  onClick={() => {
                    const next = active
                      ? sourceIds.filter((item) => item !== competition.id)
                      : [...sourceIds, competition.id]
                    void run(
                      () => updateDraftLeague(league.id, { sourceCompetitionIds: next }),
                      next.length === 0
                        ? "Liga fechada no pool atual."
                        : `${next.length} competição(ões) liberada(s).`,
                    )
                  }}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                      : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                  }`}
                >
                  {competition.name}
                </button>
              )
            })}
            {competitions.length === 0 && (
              <p className="text-[11px] text-gray-600">
                Nenhuma competição na base ainda. Monte a base de jogadores primeiro.
              </p>
            )}
          </div>
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
