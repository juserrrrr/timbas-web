"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Bug, DatabaseZap, FlaskConical, Loader2, Play, Search, Trash2, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  CompetitionHeader,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import { advancePerGroupOptions, groupCountOptions, pickOption } from "@/lib/group-plan"
import { formatMoney } from "@/lib/money"
import {
  buildDemoDraft,
  buildDemoTournament,
  clearDemoData,
  findDemoEaClub,
  getDemoEaHistory,
  listDemoData,
  syncDemoEaMatch,
  type DemoEaMatch,
  type DemoDebug,
  type DemoDraftStage,
  type DemoInventory,
  type DemoTournamentStage,
} from "@/lib/services/demo"
import { RESULT_MODE_HINTS, RESULT_MODE_LABELS, type DraftResultMode } from "@/lib/services/draft.types"
import { FORMAT_LABELS, type TournamentFormat } from "@/lib/services/tournaments.types"

const FORMATS = Object.keys(FORMAT_LABELS) as TournamentFormat[]
const TEAM_COUNTS = [4, 5, 8, 12, 16]

/// O debug vem do servidor com número, texto, lista ou mapa. Aqui tudo vira uma
/// linha legível, sem JSON cru na tela.
function formatDebugValue(value: string | number | boolean | string[] | Record<string, number>): string {
  if (typeof value === "boolean") return value ? "sim" : "não"
  if (Array.isArray(value)) return value.length > 0 ? value.join(" · ") : "vazio"
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value)
    return entries.length > 0 ? entries.map(([key, amount]) => `${key}: ${amount}`).join(" · ") : "nada"
  }
  return String(value)
}

const TOURNAMENT_STAGES: Array<{ id: DemoTournamentStage; label: string; hint: string }> = [
  { id: "REGISTRATION", label: "Só inscrito", hint: "Times cadastrados, chave ainda não gerada" },
  { id: "STARTED", label: "Chave gerada", hint: "Confrontos sorteados, nada jogado" },
  { id: "PARTIAL", label: "Meio andamento", hint: "Primeira rodada resolvida" },
  { id: "FINISHED", label: "Até o campeão", hint: "Simula tudo e fecha o campeonato" },
]

const DRAFT_STAGES: Array<{ id: DemoDraftStage; label: string; hint: string }> = [
  { id: "SETUP", label: "Montada", hint: "Elencos e pool prontos, draft fechado" },
  { id: "DRAFTING", label: "Draft rolando", hint: "Sala aberta com cronômetro" },
  { id: "ACTIVE", label: "Temporada", hint: "Elencos completos e rodadas agendadas" },
  { id: "PLAYED", label: "Encerrada", hint: "Todas as rodadas simuladas" },
]

const STAGE_ACCENTS = {
  amber: { border: "border-amber-500/40 bg-amber-500/[0.08]", text: "text-amber-300" },
  emerald: { border: "border-emerald-500/40 bg-emerald-500/[0.08]", text: "text-emerald-300" },
} as const

function StagePicker<T extends string>({
  stages,
  value,
  onChange,
  accent,
}: {
  stages: Array<{ id: T; label: string; hint: string }>
  value: T
  onChange: (stage: T) => void
  accent: keyof typeof STAGE_ACCENTS
}) {
  const tone = STAGE_ACCENTS[accent]
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {stages.map((stage) => (
        <button
          key={stage.id}
          onClick={() => onChange(stage.id)}
          className={`cursor-pointer rounded-xl border p-3 text-left transition ${
            value === stage.id ? tone.border : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
          }`}
        >
          <span className={`block text-sm font-bold ${value === stage.id ? tone.text : "text-white"}`}>
            {stage.label}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{stage.hint}</span>
        </button>
      ))}
    </div>
  )
}

function Chips<T extends string | number>({
  options,
  value,
  onChange,
  render,
}: {
  options: T[]
  value: T
  onChange: (option: T) => void
  render?: (option: T) => string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={String(option)}
          onClick={() => onChange(option)}
          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            value === option
              ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
              : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
          }`}
        >
          {render ? render(option) : String(option)}
        </button>
      ))}
    </div>
  )
}

export default function DemoLabPage() {
  const [inventory, setInventory] = useState<DemoInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [format, setFormat] = useState<TournamentFormat>("SINGLE_ELIMINATION")
  const [teamCount, setTeamCount] = useState(8)
  const [thirdPlace, setThirdPlace] = useState(true)
  const [groupCount, setGroupCount] = useState(2)
  const [advancePerGroup, setAdvancePerGroup] = useState(2)
  const [tournamentStage, setTournamentStage] = useState<DemoTournamentStage>("PARTIAL")

  const [debug, setDebug] = useState<{ title: string; data: DemoDebug } | null>(null)
  const [eaClubName, setEaClubName] = useState("")
  const [eaClub, setEaClub] = useState<{ externalClubId: string; name: string; platform: string } | null>(null)
  const [eaHistory, setEaHistory] = useState<{ count: number; latest: DemoEaMatch | null } | null>(null)
  const [eaTournamentId, setEaTournamentId] = useState("")
  const [eaMatchId, setEaMatchId] = useState("")

  const [rosterCount, setRosterCount] = useState(4)
  const [rosterSize, setRosterSize] = useState(25)
  const [draftStage, setDraftStage] = useState<DemoDraftStage>("ACTIVE")
  const [draftResultMode, setDraftResultMode] = useState<DraftResultMode>("SIMULATED")
  const [startingBudget, setStartingBudget] = useState(800_000_000)
  const [paySalaries, setPaySalaries] = useState(true)
  const [vacantRosters, setVacantRosters] = useState(0)
  const [auctionsEnabled, setAuctionsEnabled] = useState(true)
  const [auctionHours, setAuctionHours] = useState(24)

  const groupOptions = groupCountOptions(teamCount)
  const activeGroupCount = pickOption(groupOptions, groupCount, 2)
  const advanceOptions = advancePerGroupOptions(teamCount, activeGroupCount)
  const activeAdvance = pickOption(advanceOptions, advancePerGroup, 1)

  const load = useCallback(async () => {
    try {
      setInventory(await listDemoData())
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados de demonstração")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error && !inventory) return <ErrorState message={error} retry={() => void load()} />

  const run = async (key: string, title: string, action: () => Promise<{ message: string; debug?: DemoDebug }>) => {
    setBusy(key)
    setError("")
    setDebug(null)
    try {
      const result = await action()
      setNotice(result.message)
      if (result.debug) setDebug({ title, data: result.debug })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar a demonstração.")
    } finally {
      setBusy("")
    }
  }

  const total = (inventory?.tournaments.length ?? 0) + (inventory?.leagues.length ?? 0)

  return (
    <div className="space-y-6">
      <CompetitionHeader
        eyebrow="Administração"
        title="Laboratório"
        subtitle="Gere campeonatos e ligas de mentira para conferir chave, tabela e telas antes de valer."
        icon={FlaskConical}
        accent="text-orange-400"
        accentBg="bg-orange-500/10 border-orange-500/20"
        actions={
          total > 0 && (
            <Button
              variant="outline"
              disabled={busy !== ""}
              onClick={() =>
                void run("clear", "Limpeza", async () => {
                  const result = await clearDemoData()
                  return {
                    message: `Removidos ${result.tournaments} campeonatos, ${result.leagues} ligas e ${result.users} usuários de teste.`,
                  }
                })
              }
              className="border-red-500/25 text-red-400 hover:bg-red-500/10"
            >
              {busy === "clear" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              Apagar tudo de teste
            </Button>
          )
        }
      />

      <p className="rounded-lg border border-orange-500/20 bg-orange-500/[0.06] px-3 py-2 text-[11px] text-orange-200">
        Tudo criado aqui nasce com o nome começando em <span className="font-mono">[DEMO]</span>, não mexe em carteira de ninguém e pode
        ser apagado de uma vez pelo botão acima. Os elencos de draft usam usuários de teste próprios, sem tocar em
        ninguém real.
      </p>

      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      <Card className="border-blue-500/20 bg-blue-500/[0.035] p-4">
        <div className="mb-4 flex items-center gap-2">
          <DatabaseZap className="h-4 w-4 text-blue-400" />
          <div>
            <h3 className="text-sm font-black text-white">Diagnóstico EA Sports FC Clubs</h3>
            <p className="text-[11px] text-gray-500">Teste cada módulo isoladamente antes de sincronizar uma partida real do campeonato.</p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/10 p-3">
            <Label>1. Procurar clube pelo nome exato</Label>
            <input value={eaClubName} onChange={(event) => setEaClubName(event.target.value)} placeholder="Nome do clube na EA" className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-blue-500/50" />
            <Button disabled={busy !== "" || eaClubName.trim().length < 2} onClick={() => void run("ea-club", "Clube encontrado", async () => {
              const club = await findDemoEaClub(eaClubName.trim())
              setEaClub(club)
              setEaHistory(null)
              return { message: `Clube confirmado: ${club.name} (${club.externalClubId})` }
            })} className="w-full bg-blue-500 text-white hover:bg-blue-400">
              {busy === "ea-club" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />} Procurar
            </Button>
            {eaClub && <p className="rounded-lg bg-emerald-500/10 p-2 font-mono text-[11px] text-emerald-300">{eaClub.name} · ID {eaClub.externalClubId}</p>}
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/10 p-3">
            <Label>2. Buscar histórico e última partida</Label>
            <p className="min-h-9 text-[11px] text-gray-500">Usa o Club ID confirmado e mostra o amistoso mais recente com placar e adversário.</p>
            <Button disabled={busy !== "" || !eaClub} onClick={() => void run("ea-history", "Histórico da EA", async () => {
              const history = await getDemoEaHistory(eaClub!.externalClubId)
              setEaHistory({ count: history.count, latest: history.latest })
              return { message: history.latest ? `${history.count} partidas. Última: ${history.latest.homeClubName} ${history.latest.homeScore} x ${history.latest.awayScore} ${history.latest.awayClubName}` : "Nenhum amistoso encontrado." }
            })} className="w-full bg-cyan-500 text-black hover:bg-cyan-400">
              {busy === "ea-history" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-1.5 h-4 w-4" />} Buscar partidas
            </Button>
            {eaHistory?.latest && <div className="rounded-lg bg-white/[0.04] p-2 text-[11px] text-gray-300"><b className="text-white">{eaHistory.latest.homeClubName} {eaHistory.latest.homeScore} x {eaHistory.latest.awayScore} {eaHistory.latest.awayClubName}</b><br />EA Match ID: <span className="font-mono">{eaHistory.latest.externalMatchId}</span><br />Jogadores recebidos: {eaHistory.latest.players.length}</div>}
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/10 p-3">
            <Label>3. Sincronizar com partida do campeonato</Label>
            <input value={eaTournamentId} onChange={(event) => setEaTournamentId(event.target.value)} placeholder="Tournament ID" className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-xs text-white outline-none focus:border-blue-500/50" />
            <input value={eaMatchId} onChange={(event) => setEaMatchId(event.target.value)} placeholder="Match ID interno do campeonato" className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-xs text-white outline-none focus:border-blue-500/50" />
            <Button disabled={busy !== "" || !eaTournamentId.trim() || !eaMatchId.trim()} onClick={() => void run("ea-sync", "Sincronização concluída", async () => {
              await syncDemoEaMatch(eaTournamentId.trim(), eaMatchId.trim())
              return { message: "Partida associada, placar finalizado e estatísticas importadas da EA." }
            })} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
              {busy === "ea-sync" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />} Sincronizar de verdade
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">Campeonato de teste</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {FORMATS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormat(option)}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                      format === option
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                    }`}
                  >
                    {FORMAT_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Times</Label>
              <Chips options={TEAM_COUNTS} value={teamCount} onChange={setTeamCount} />
              <p className="text-[11px] text-gray-600">
                Use 5 ou 12 para conferir como a chave lida com byes.
              </p>
            </div>

            {format === "GROUPS_KNOCKOUT" && groupOptions.length === 0 && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-200">
                {teamCount} times não dividem em grupos do mesmo tamanho. Escolha outro total de times.
              </p>
            )}

            {format === "GROUPS_KNOCKOUT" && groupOptions.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Grupos</Label>
                  <Chips
                    options={groupOptions}
                    value={activeGroupCount}
                    onChange={setGroupCount}
                    render={(count) => `${count} de ${teamCount / count}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Classificados por grupo</Label>
                  <Chips options={advanceOptions} value={activeAdvance} onChange={setAdvancePerGroup} />
                  <p className="text-[11px] text-gray-600">
                    {activeGroupCount * activeAdvance} times no mata-mata, cruzando líder de um grupo com
                    classificado de outro.
                  </p>
                </div>
              </div>
            )}

            {(format === "SINGLE_ELIMINATION" || format === "GROUPS_KNOCKOUT") && (
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                <span className="text-[12px] text-gray-300">Incluir disputa de 3º lugar</span>
                <Switch checked={thirdPlace} onCheckedChange={setThirdPlace} />
              </label>
            )}

            <div className="space-y-1.5">
              <Label>Até onde simular</Label>
              <StagePicker stages={TOURNAMENT_STAGES} value={tournamentStage} onChange={setTournamentStage} accent="amber" />
            </div>

            <Button
              disabled={busy !== "" || (format === "GROUPS_KNOCKOUT" && groupOptions.length === 0)}
              onClick={() =>
                void run("tournament", "Campeonato gerado", () =>
                  buildDemoTournament({
                    format,
                    teamCount,
                    thirdPlace,
                    groupCount: activeGroupCount,
                    advancePerGroup: activeAdvance,
                    stage: tournamentStage,
                  }),
                )
              }
              className="w-full bg-amber-500 text-black hover:bg-amber-400"
            >
              {busy === "tournament" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Gerar campeonato
            </Button>
          </div>
        </Card>

        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-black text-white">Liga draft de teste</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Times na liga</Label>
              <Chips options={[2, 4, 6, 8, 10, 12, 16, 20]} value={rosterCount} onChange={setRosterCount} />
              <p className="text-[11px] text-gray-600">
                Cada time é um participante com o elenco dele. O primeiro é o seu.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Times sem dono</Label>
              <Chips
                options={[0, 1, 2, 4]}
                value={vacantRosters}
                onChange={setVacantRosters}
                render={(value) => (value === 0 ? "nenhum" : `${value} vagos`)}
              />
              <p className="text-[11px] text-gray-600">
                Vaga aberta escolhe sozinha no draft e perde por W.O. na rodada, até alguém assumir.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Jogadores por elenco</Label>
              <Chips options={[18, 25]} value={rosterSize} onChange={setRosterSize} />
              <p className="text-[11px] text-gray-600">
                18 é o time do jogo, 11 em campo e 7 no banco. 25 é o elenco cheio do EA FC, com as reservas.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Como sai o resultado</Label>
              <div className="grid gap-1.5">
                {(["REPORTED", "SIMULATED"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDraftResultMode(mode)}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                      draftResultMode === mode
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                    }`}
                  >
                    {RESULT_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-snug text-gray-600">{RESULT_MODE_HINTS[draftResultMode]}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Caixa inicial de cada elenco</Label>
              <Chips
                    options={[200_000_000, 800_000_000, 2_000_000_000]}
                    value={startingBudget}
                    onChange={setStartingBudget}
                    render={(value) => formatMoney(value)}
                  />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <span className="text-[12px] text-gray-300">Cobrar salário por rodada</span>
              <Switch checked={paySalaries} onCheckedChange={setPaySalaries} />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <span className="text-[12px] text-gray-300">Leilão liberado</span>
              <Switch checked={auctionsEnabled} onCheckedChange={setAuctionsEnabled} />
            </label>

            {auctionsEnabled && (
              <div className="space-y-1.5">
                <Label>Duração do leilão</Label>
                <Chips
                  options={[1, 6, 24, 48]}
                  value={auctionHours}
                  onChange={setAuctionHours}
                  render={(hours) => `${hours}h`}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Até onde simular</Label>
              <StagePicker stages={DRAFT_STAGES} value={draftStage} onChange={setDraftStage} accent="emerald" />
            </div>

            <Button
              disabled={busy !== ""}
              onClick={() =>
                void run("draft", "Liga gerada", () =>
                  buildDemoDraft({
                    rosterCount,
                    rosterSize,
                    resultMode: draftResultMode,
                    startingBudget,
                    paySalaries,
                    vacantRosters,
                    auctionsEnabled,
                    auctionHours,
                    stage: draftStage,
                  }),
                )
              }
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {busy === "draft" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Gerar liga draft
            </Button>
          </div>
        </Card>
      </div>

      {debug && (
        <Card className="border-orange-500/25 bg-orange-500/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Bug className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-black text-white">{debug.title}: o que saiu de verdade</h3>
          </div>

          <div className="space-y-1">
            {Object.entries(debug.data).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-0.5 border-b border-white/[0.04] py-1.5 last:border-0 sm:flex-row sm:gap-3">
                <span className="w-52 flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                  {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                </span>
                <span className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed text-gray-300">
                  {formatDebugValue(value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {total > 0 && (
        <Card className="border-white/[0.07] bg-white/[0.025] p-4">
          <h3 className="mb-3 text-sm font-black text-white">Criados até agora ({total})</h3>
          <div className="space-y-1.5">
            {inventory?.tournaments.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/tournaments/${item.id}`}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition hover:border-amber-500/30"
              >
                <Trophy className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{item.name}</span>
                <StatusPill tone="neutral">{FORMAT_LABELS[item.format]}</StatusPill>
                <span className="hidden text-[11px] text-gray-600 sm:block">{formatDateTime(item.createdAt)}</span>
                <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
              </Link>
            ))}
            {inventory?.leagues.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/draft/${item.id}`}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition hover:border-emerald-500/30"
              >
                <Users className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{item.name}</span>
                <StatusPill tone="neutral">{item.status}</StatusPill>
                <span className="hidden text-[11px] text-gray-600 sm:block">{formatDateTime(item.createdAt)}</span>
                <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
