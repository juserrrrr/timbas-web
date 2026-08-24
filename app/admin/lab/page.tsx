"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Bug, DatabaseZap, FlaskConical, GitBranch, Loader2, Play, RefreshCw, Search, Trash2, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AwardCardStudio } from "@/components/admin/award-card-studio"
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
  buildRealEaTournament,
  buildLiveEaKnockout,
  createLiveEaTournament,
  assignLiveEaGroups,
  getLiveEaTournament,
  clearDemoData,
  findDemoEaClub,
  getDemoEaHistory,
  listDemoData,
  prepareDemoEaMatch,
  type DemoEaMatch,
  type DemoDebug,
  type DemoDraftStage,
  type DemoInventory,
  type LiveEaWorkspace,
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
  const [eaHistory, setEaHistory] = useState<{ count: number; latest: DemoEaMatch | null; matches: DemoEaMatch[] } | null>(null)
  const [selectedEaMatchId, setSelectedEaMatchId] = useState("")
  const [eaTournamentId, setEaTournamentId] = useState("")
  const [eaMatchId, setEaMatchId] = useState("")
  const [eaSide, setEaSide] = useState<"HOME" | "AWAY">("HOME")
  const [preparedMatchId, setPreparedMatchId] = useState("")
  const [realEaTeamCount, setRealEaTeamCount] = useState(8)
  const [realEaMatchCount, setRealEaMatchCount] = useState(24)
  const [realEaTournamentUrl, setRealEaTournamentUrl] = useState("")
  const [liveName, setLiveName] = useState("Corujão")
  const [liveClubNames, setLiveClubNames] = useState("")
  const [liveGroupCount, setLiveGroupCount] = useState(2)
  const [liveAdvancePerGroup, setLiveAdvancePerGroup] = useState(2)
  const [liveTournamentId, setLiveTournamentId] = useState("")
  const [liveWorkspace, setLiveWorkspace] = useState<LiveEaWorkspace | null>(null)
  const [liveAssignments, setLiveAssignments] = useState<Record<string, number>>({})

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

  const adoptLiveWorkspace = useCallback((workspace: LiveEaWorkspace) => {
    setLiveWorkspace(workspace)
    setLiveTournamentId(workspace.id)
    const groupById = new Map(workspace.groups.map((group) => [group.id, group.order]))
    setLiveAssignments(Object.fromEntries(workspace.teams.map((team, index) => [
      team.id,
      team.groupId ? (groupById.get(team.groupId) ?? index % workspace.groupCount) : index % workspace.groupCount,
    ])))
    window.localStorage.setItem("timbas.lab.liveTournamentId", workspace.id)
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem("timbas.lab.liveTournamentId")
    if (!saved) return
    setLiveTournamentId(saved)
    void getLiveEaTournament(saved).then(adoptLiveWorkspace).catch(() => window.localStorage.removeItem("timbas.lab.liveTournamentId"))
  }, [adoptLiveWorkspace])

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
  const liveClubList = liveClubNames.split(/\r?\n/).map((name) => name.trim()).filter(Boolean)
  const liveGroupsPublished = liveWorkspace?.status === "RUNNING" || liveWorkspace?.status === "FINISHED"
  const liveGroupMatches = liveWorkspace?.matches.filter((match) => match.phase === "GROUP") ?? []
  const liveKnockoutMatches = liveWorkspace?.matches.filter((match) => match.phase !== "GROUP") ?? []

  return (
    <div className="space-y-6">
      <CompetitionHeader
        eyebrow="Administração"
        title="Laboratório"
        subtitle="Gere cenários isolados ou opere campeonatos EA reais, passo a passo, antes de liberar o fluxo oficial."
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
              setSelectedEaMatchId("")
              return { message: `Clube confirmado: ${club.name} (${club.externalClubId})` }
            })} className="w-full bg-blue-500 text-white hover:bg-blue-400">
              {busy === "ea-club" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />} Procurar
            </Button>
            {eaClub && <p className="rounded-lg bg-emerald-500/10 p-2 font-mono text-[11px] text-emerald-300">{eaClub.name} · ID {eaClub.externalClubId}</p>}
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/10 p-3">
            <Label>2. Buscar as 10 partidas mais recentes</Label>
            <p className="min-h-9 text-[11px] text-gray-500">Usa o Club ID confirmado e mostra os 10 amistosos mais recentes com placar, adversário e EA Match ID.</p>
            <Button disabled={busy !== "" || !eaClub} onClick={() => void run("ea-history", "Histórico da EA", async () => {
              const history = await getDemoEaHistory(eaClub!.externalClubId)
              const matches = history.matches.slice(0, 10)
              setEaHistory({ count: history.count, latest: history.latest, matches })
              setSelectedEaMatchId(matches[0]?.externalMatchId ?? "")
              return { message: history.latest ? `${history.count} partidas. Última: ${history.latest.homeClubName} ${history.latest.homeScore} x ${history.latest.awayScore} ${history.latest.awayClubName}` : "Nenhum amistoso encontrado." }
            })} className="w-full bg-cyan-500 text-black hover:bg-cyan-400">
              {busy === "ea-history" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-1.5 h-4 w-4" />} Buscar partidas
            </Button>
            {eaHistory && eaHistory.matches.length > 0 && (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {eaHistory.matches.map((match, index) => {
                  const selected = selectedEaMatchId === match.externalMatchId
                  const playerCount = Object.values(match.playersByClub ?? {}).reduce((total, players) => total + players.length, 0)
                  return (
                    <button
                      key={match.externalMatchId}
                      type="button"
                      onClick={() => setSelectedEaMatchId(match.externalMatchId)}
                      className={`w-full rounded-lg border p-2 text-left text-[11px] transition ${selected ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/[0.06] bg-white/[0.03] hover:border-white/15"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <b className="text-white">{match.homeClubName} {match.homeScore} x {match.awayScore} {match.awayClubName}</b>
                        <span className={selected ? "font-bold text-cyan-300" : "text-gray-600"}>#{index + 1}</span>
                      </span>
                      <span className="mt-1 block text-gray-500">{formatDateTime(match.playedAt)} · {playerCount} jogadores</span>
                      <span className="mt-0.5 block font-mono text-gray-400">EA Match ID: {match.externalMatchId}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/10 p-3">
            <Label>3. Preparar confronto para testar como jogador</Label>
            <input value={eaTournamentId} onChange={(event) => setEaTournamentId(event.target.value)} placeholder="Tournament ID" className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-xs text-white outline-none focus:border-blue-500/50" />
            <input value={eaMatchId} onChange={(event) => setEaMatchId(event.target.value)} placeholder="Match ID interno usado como base" className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-xs text-white outline-none focus:border-blue-500/50" />
            <div className="grid grid-cols-2 gap-2">
              {(["HOME", "AWAY"] as const).map((side) => <button key={side} onClick={() => setEaSide(side)} className={`rounded-lg border px-2 py-2 text-[11px] font-bold ${eaSide === side ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-gray-500"}`}>{side === "HOME" ? "Entrar no mandante" : "Entrar no visitante"}</button>)}
            </div>
            <Button disabled={busy !== "" || !eaTournamentId.trim() || !eaMatchId.trim() || !eaClub || !selectedEaMatchId} onClick={() => void run("ea-prepare", "Confronto de teste preparado", async () => {
              const prepared = await prepareDemoEaMatch({ tournamentId: eaTournamentId.trim(), matchId: eaMatchId.trim(), clubId: eaClub!.externalClubId, externalMatchId: selectedEaMatchId, side: eaSide })
              setPreparedMatchId(prepared.matchId)
              return { message: "Sua conta foi colocada no time. Abra o campeonato, entre na partida [LAB] e clique em Checar na EA." }
            })} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
              {busy === "ea-prepare" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />} Preparar teste como jogador
            </Button>
            {preparedMatchId && <Link href={`/dashboard/tournaments/${eaTournamentId.trim()}?match=${encodeURIComponent(preparedMatchId)}&lab=ea`} className="block rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-center text-xs font-bold text-blue-300">Abrir diretamente a partida [LAB]</Link>}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.045] p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Simulação completa com dados reais</p>
              <h4 className="mt-1 text-base font-black text-white">Reconstruir um campeonato a partir dos amistosos da EA</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                Começa pelo clube informado, descobre adversários reais e monta Grupos + mata-mata. Cada confronto exige um EA Match ID único e posterior à fase anterior; sem uma partida real compatível, o teste avisa o confronto ausente e não inventa resultado.
              </p>
              <span className="mt-2 inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">Formato fixo: Grupos + mata-mata</span>
              <div className="mt-3 grid gap-2 text-[10px] text-gray-400 sm:grid-cols-4">
                {[
                  "1 · Validar clube",
                  "2 · Descobrir adversários",
                  "3 · Separar por horário e fase",
                  "4 · Encerrar e premiar",
                ].map((step) => <span key={step} className="rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5">{step}</span>)}
              </div>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:w-[420px]">
              <div className="space-y-1.5">
                <Label>Clubes reais</Label>
                <Chips options={[4, 6, 8, 10, 12]} value={realEaTeamCount} onChange={setRealEaTeamCount} />
              </div>
              <div className="space-y-1.5">
                <Label>Máximo de amistosos</Label>
                <Chips options={[8, 16, 24, 32, 40]} value={realEaMatchCount} onChange={setRealEaMatchCount} />
              </div>
              <Button
                disabled={busy !== "" || eaClubName.trim().length < 2}
                onClick={() => void run("ea-real-tournament", "Campeonato EA reconstruído", async () => {
                  const result = await buildRealEaTournament({
                    clubName: eaClubName.trim(),
                    teamCount: realEaTeamCount,
                    maxMatches: realEaMatchCount,
                  })
                  setRealEaTournamentUrl(result.url)
                  return result
                })}
                className="sm:col-span-2 bg-violet-500 text-white hover:bg-violet-400"
              >
                {busy === "ea-real-tournament" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trophy className="mr-1.5 h-4 w-4" />}
                Montar campeonato real completo
              </Button>
              {realEaTournamentUrl && (
                <Link href={realEaTournamentUrl} className="sm:col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs font-black text-violet-200">
                  Abrir resultado final, estatísticas e cartas <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-cyan-500/25 bg-cyan-500/[0.035] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Operação real · modo debug</p>
            <h3 className="mt-1 text-base font-black text-white">Corujão ao vivo, passo a passo</h3>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-gray-400">Cadastre clubes reais sem usuário responsável, monte os grupos manualmente e sincronize cada amistoso pela EA. Este modo não possui check-in, tolerância, timeout ou W.O. automático.</p>
          </div>
          <div className="flex min-w-0 gap-2 lg:w-[420px]">
            <input value={liveTournamentId} onChange={(event) => setLiveTournamentId(event.target.value)} placeholder="ID de uma operação existente" className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-3 font-mono text-[11px] text-white outline-none focus:border-cyan-400/50" />
            <Button variant="outline" disabled={busy !== "" || !liveTournamentId.trim()} onClick={() => void run("live-load", "Operação ao vivo carregada", async () => { const workspace = await getLiveEaTournament(liveTournamentId.trim()); adoptLiveWorkspace(workspace); return { message: "Operação recarregada com o estado atual da API." } })} className="h-9 border-cyan-400/25 text-cyan-300"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Carregar</Button>
          </div>
        </div>

        {!liveWorkspace && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3 rounded-xl border border-white/[0.07] bg-black/15 p-3">
              <div className="space-y-1.5"><Label>Nome do evento</Label><input value={liveName} onChange={(event) => setLiveName(event.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-cyan-400/50" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Quantidade de grupos</Label><Chips options={[2, 4]} value={liveGroupCount} onChange={setLiveGroupCount} /></div>
                <div className="space-y-1.5"><Label>Classificados por grupo</Label><Chips options={[1, 2, 3, 4]} value={liveAdvancePerGroup} onChange={setLiveAdvancePerGroup} /></div>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/15 p-3">
              <Label>Clubes da EA · um nome exato por linha</Label>
              <textarea value={liveClubNames} onChange={(event) => setLiveClubNames(event.target.value)} rows={7} placeholder={"Bote Seu Pix\nTimbas EC\nTerreiros Club\nOutro clube"} className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs leading-relaxed text-white outline-none focus:border-cyan-400/50" />
              <Button disabled={busy !== "" || liveName.trim().length < 3 || liveClubList.length < 4} onClick={() => void run("live-create", "Operação ao vivo criada", async () => { const workspace = await createLiveEaTournament({ name: liveName.trim(), clubNames: liveClubList, groupCount: liveGroupCount, advancePerGroup: liveAdvancePerGroup }); adoptLiveWorkspace(workspace); return { message: `${workspace.teams.length} clubes validados pela EA. Agora distribua os grupos.` } })} className="w-full bg-cyan-500 font-bold text-black hover:bg-cyan-400">{busy === "live-create" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-1.5 h-4 w-4" />}Validar clubes e criar</Button>
            </div>
          </div>
        )}

        {liveWorkspace && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2.5"><span className="block text-[9px] font-bold uppercase text-gray-600">Clubes</span><b className="text-lg text-white">{liveWorkspace.teams.length}</b></div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2.5"><span className="block text-[9px] font-bold uppercase text-gray-600">Grupos</span><b className="text-lg text-white">{liveWorkspace.groupCount}</b></div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2.5"><span className="block text-[9px] font-bold uppercase text-gray-600">Fase de grupos</span><b className="text-lg text-white">{liveWorkspace.groupProgress.finished}/{liveWorkspace.groupProgress.total}</b></div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2.5"><span className="block text-[9px] font-bold uppercase text-gray-600">Mata-mata</span><b className="text-lg text-white">{liveKnockoutMatches.filter((match) => match.homeTeam && match.awayTeam).length}</b></div>
            </div>

            {!liveGroupsPublished ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.035] p-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">2 · Distribuição manual dos grupos</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {liveWorkspace.teams.map((team) => <label key={team.id} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2"><span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{team.name}</span><select value={liveAssignments[team.id] ?? 0} onChange={(event) => setLiveAssignments((current) => ({ ...current, [team.id]: Number(event.target.value) }))} className="h-8 rounded-md border border-white/10 bg-[#0b0b10] px-2 text-[11px] text-white">{Array.from({ length: liveWorkspace.groupCount }, (_, group) => <option key={group} value={group}>Grupo {String.fromCharCode(65 + group)}</option>)}</select></label>)}
                </div>
                <Button disabled={busy !== "" || liveWorkspace.teams.some((team) => liveAssignments[team.id] === undefined)} onClick={() => void run("live-groups", "Grupos publicados", async () => { const workspace = await assignLiveEaGroups(liveWorkspace.id, liveWorkspace.teams.map((team) => ({ teamId: team.id, group: liveAssignments[team.id] }))); adoptLiveWorkspace(workspace); return { message: `${workspace.groupProgress.total} confrontos publicados sem timeout. Abra o campeonato para sincronizar ao vivo.` } })} className="mt-3 bg-amber-500 font-bold text-black hover:bg-amber-400"><GitBranch className="mr-1.5 h-4 w-4" />Publicar grupos e confrontos</Button>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.035] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">3 · Sincronização ao vivo</h4><p className="mt-1 text-[11px] text-gray-500">Abra um confronto e use Checar na EA. Não há relógio nem W.O. neste campeonato.</p></div><Link href={liveWorkspace.url} className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300">Abrir campeonato <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
                  <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">{liveGroupMatches.map((match) => <Link key={match.id} href={`${liveWorkspace.url}?match=${encodeURIComponent(match.id)}&lab=live`} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px]"><span className="min-w-0 flex-1 truncate text-gray-300">{match.homeTeam?.name} × {match.awayTeam?.name}</span><b className={match.status === "FINISHED" ? "text-emerald-300" : "text-amber-300"}>{match.status === "FINISHED" ? `${match.homeScore} × ${match.awayScore}` : "Checar EA"}</b></Link>)}</div>
                </div>
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.035] p-3"><h4 className="text-xs font-black uppercase tracking-wider text-violet-300">4 · Montar mata-mata</h4><p className="mt-1 text-[11px] leading-relaxed text-gray-500">A API usa a classificação oficial dos grupos somente quando você confirmar.</p><Button disabled={busy !== "" || liveWorkspace.groupProgress.total === 0 || liveWorkspace.groupProgress.finished < liveWorkspace.groupProgress.total || liveKnockoutMatches.some((match) => match.homeTeam || match.awayTeam)} onClick={() => void run("live-knockout", "Mata-mata publicado", async () => { const workspace = await buildLiveEaKnockout(liveWorkspace.id); adoptLiveWorkspace(workspace); return { message: "Classificados posicionados e mata-mata liberado para sincronização ao vivo." } })} className="mt-3 w-full bg-violet-500 text-white hover:bg-violet-400"><Trophy className="mr-1.5 h-4 w-4" />{liveKnockoutMatches.some((match) => match.homeTeam || match.awayTeam) ? "Mata-mata publicado" : "Gerar mata-mata"}</Button><p className="mt-2 text-center text-[10px] text-gray-600">{liveKnockoutMatches.some((match) => match.homeTeam || match.awayTeam) ? "Chave em andamento" : liveWorkspace.groupProgress.finished < liveWorkspace.groupProgress.total ? `Faltam ${liveWorkspace.groupProgress.total - liveWorkspace.groupProgress.finished} resultados` : "Grupos concluídos · pronto para gerar"}</p></div>
              </div>
            )}

            {liveGroupsPublished && liveKnockoutMatches.some((match) => match.homeTeam && match.awayTeam) && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.035] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-violet-300">Mata-mata ao vivo</h4>
                    <p className="mt-1 text-[11px] text-gray-500">Cada fase seguinte só fica disponível quando os dois classificados estiverem definidos.</p>
                  </div>
                  <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-black text-violet-200">
                    {liveKnockoutMatches.filter((match) => match.status === "FINISHED").length}/{liveKnockoutMatches.length} encerradas
                  </span>
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {liveKnockoutMatches.filter((match) => match.homeTeam && match.awayTeam).map((match) => (
                    <Link key={match.id} href={`${liveWorkspace.url}?match=${encodeURIComponent(match.id)}&lab=live`} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px]">
                      <span className="min-w-0 flex-1 truncate text-gray-300">{match.homeTeam?.name} × {match.awayTeam?.name}</span>
                      <b className={match.status === "FINISHED" ? "text-emerald-300" : "text-violet-300"}>{match.status === "FINISHED" ? `${match.homeScore} × ${match.awayScore}` : "Checar EA"}</b>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={() => { setLiveWorkspace(null); setLiveTournamentId(""); setLiveAssignments({}); window.localStorage.removeItem("timbas.lab.liveTournamentId") }} className="text-[10px] font-bold text-gray-600 hover:text-red-300">Desvincular esta operação do painel</button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden border-emerald-500/20 bg-emerald-500/[0.035] p-4">
        <div>
          <div className="max-w-3xl">
            <h3 className="text-sm font-black text-white">Exemplo do banner de premiação</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Cada categoria possui arte e título fixos. Somente nick, feito estatístico e QR Code do campeonato são aplicados dinamicamente.</p>
            <p className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px] text-emerald-300">Abra um campeonato encerrado → Estatísticas EA → botão de download no card.</p>
          </div>
          <AwardCardStudio />
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
