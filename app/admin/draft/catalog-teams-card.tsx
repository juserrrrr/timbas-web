"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronRight, Gamepad2, Loader2, Pencil, Plus, RefreshCw, Shield, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusPill, formatDateTime } from "@/components/competitions/shared"
import { formatMoney } from "@/lib/money"
import {
  SOURCE_LABELS,
  createCatalogTeam,
  createCompetition,
  fillCompetitionFromSofifa,
  fillCompetitionWithAi,
  fillTeamFromSofifa,
  fillTeamWithAi,
  listCatalogPlayers,
  listCatalogTeams,
  listCompetitions,
  removeCatalogTeam,
  removeCompetition,
  syncCompetition,
  updateCatalogTeam,
  updateCompetition,
  type CatalogCompetition,
  type CatalogPlayer,
  type CatalogTeam,
} from "@/lib/services/catalog"

type Run = (key: string, action: () => Promise<unknown>, message: string) => Promise<void>

/// Quanto o preenchimento já andou, para a barra e os selos das linhas.
interface FillState {
  competitionId: string
  total: number
  done: number
  players: number
  running: string[]
  failures: string[]
  /// Quando esta leva começou, para mostrar o tempo correndo e denunciar travada.
  roundStartedAt: number
}

interface FillLogEntry {
  team: string
  /// Quantos entraram na base.
  players: number
  /// Quantos o modelo devolveu, antes de tirar emprestado, base e baixa certeza.
  returned: number
  /// O modelo avisou que esse elenco é de uma temporada anterior à pedida.
  outdated: boolean
  error: string | null
}

/// Abaixo disso não é elenco, é uma lista dos famosos: o modelo encurtou.
const THIN_SQUAD = 18

const FLASH_MS = 2600
/// Uma leva de três clubes leva de um a três minutos. Passou disso, o modelo
/// está lento ou engasgou, e a tela precisa dizer isso em vez de só girar.
const SLOW_ROUND_MS = 180_000

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}min ${String(seconds % 60).padStart(2, "0")}s`
}

function EditableName({ value, onSave, className }: { value: string; onSave: (name: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <span className={`group/name flex min-w-0 items-center gap-1.5 ${className ?? ""}`}>
        <span className="truncate">{value}</span>
        <button
          onClick={(event) => {
            event.stopPropagation()
            setDraft(value)
            setEditing(true)
          }}
          aria-label={`Renomear ${value}`}
          className="flex-shrink-0 cursor-pointer rounded p-0.5 text-gray-700 opacity-0 transition group-hover/name:opacity-100 hover:text-sky-400 focus:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </span>
    )
  }

  const commit = () => {
    const name = draft.trim()
    setEditing(false)
    if (name.length >= 2 && name !== value) onSave(name)
  }

  return (
    <input
      autoFocus
      value={draft}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit()
        if (event.key === "Escape") setEditing(false)
      }}
      className="h-6 min-w-0 flex-1 rounded border border-sky-500/40 bg-black/40 px-1.5 text-[12px] text-white outline-none"
    />
  )
}

/// Elenco do clube, carregado quando a linha abre.
function TeamPlayers({ teamId, version }: { teamId: string; version: number }) {
  const [players, setPlayers] = useState<CatalogPlayer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    void listCatalogPlayers(teamId)
      .catch(() => [])
      .then((rows) => {
        if (!live) return
        setPlayers(rows)
        setLoading(false)
      })
    return () => {
      live = false
    }
  }, [teamId, version])

  if (loading) return <p className="px-3 py-2 text-[11px] text-gray-600">Carregando elenco...</p>
  if (players.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] text-gray-600">
        Time vazio. O botão da linha busca o elenco com camisa, atributos e valor.
      </p>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-1 space-y-px duration-300">
      {players.map((player) => (
        <div
          key={player.id}
          className="flex items-center gap-3 rounded px-3 py-1 text-[11px] transition hover:bg-white/[0.03]"
        >
          <span className="w-6 flex-shrink-0 text-right font-mono text-[10px] text-gray-700">
            {player.shirtNumber ?? "-"}
          </span>
          <span className="w-7 flex-shrink-0 text-center font-black text-gray-300">{player.overall}</span>
          <span className="w-9 flex-shrink-0 text-gray-600">{player.position}</span>
          <span className={`min-w-0 flex-1 truncate ${player.active ? "text-white" : "text-gray-600 line-through"}`}>
            {player.name}
          </span>
          <span className="flex-shrink-0 text-[10px] tabular-nums text-amber-400/80">{formatMoney(player.price)}</span>
        </div>
      ))}
    </div>
  )
}

/// As competições são as pastas da base: cada uma guarda os times e, dentro
/// deles, os jogadores. `refreshKey` muda quando o painel importa de fora, para
/// a lista não ficar velha esperando um F5.
export function CatalogTeamsCard({ onChanged, refreshKey = 0 }: { onChanged: () => void; refreshKey?: number }) {
  const [competitions, setCompetitions] = useState<CatalogCompetition[]>([])
  const [teams, setTeams] = useState<CatalogTeam[]>([])
  const [openId, setOpenId] = useState("")
  const [openTeamId, setOpenTeamId] = useState("")
  const [squadVersion, setSquadVersion] = useState(0)
  const [flashing, setFlashing] = useState<string[]>([])
  const [fill, setFill] = useState<FillState | null>(null)
  const [log, setLog] = useState<FillLogEntry[]>([])
  /// De quem é o log que está na tela. Ele fica depois que a rodada acaba, senão
  /// o resultado some justo na hora de ler.
  const [logFor, setLogFor] = useState("")
  const [now, setNow] = useState(() => Date.now())
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [newTeam, setNewTeam] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadCompetitions = useCallback(async () => {
    const catalog = await listCompetitions().catch(() => ({ items: [], footballDataReady: false }))
    setCompetitions(catalog.items)
  }, [])

  const loadTeams = useCallback(async (competitionId: string) => {
    if (!competitionId) {
      setTeams([])
      return
    }
    setTeams(await listCatalogTeams(competitionId).catch(() => []))
  }, [])

  useEffect(() => {
    void loadCompetitions()
  }, [loadCompetitions, refreshKey])

  useEffect(() => {
    void loadTeams(openId)
  }, [loadTeams, openId, refreshKey])

  /// Relógio de um segundo, ligado só enquanto tem leva rodando: é ele que
  /// mostra que a tela está viva e que denuncia a leva que empacou.
  useEffect(() => {
    if (!fill) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [fill])

  const flash = (names: string[]) => {
    setFlashing(names)
    setTimeout(() => setFlashing([]), FLASH_MS)
  }

  const run: Run = async (key, action, message) => {
    setBusy(key)
    setError("")
    try {
      await action()
      if (message) setNotice(message)
      await loadCompetitions()
      await loadTeams(openId)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  /// Preencher vinte clubes numa requisição só estoura o tempo do navegador, por
  /// isso a tela pede de três em três, recarrega entre um lote e outro e mostra
  /// o que chegou. O servidor sempre pega os vazios em ordem de nome, então dá
  /// para adiantar na tela quais estão sendo buscados agora.
  const fillAll = async (competition: CatalogCompetition) => {
    const pending = (openId === competition.id ? teams : await listCatalogTeams(competition.id).catch(() => []))
      .filter((team) => team._count.players === 0)
      .map((team) => team.name)

    if (pending.length === 0) {
      setNotice(`Todos os clubes de ${competition.name} já têm elenco.`)
      return
    }

    setOpenId(competition.id)
    setBusy(`fill-${competition.id}`)
    setError("")
    setLog([])
    setLogFor(competition.id)
    setNow(Date.now())
    setFill({
      competitionId: competition.id,
      total: pending.length,
      done: 0,
      players: 0,
      running: pending.slice(0, 3),
      failures: [],
      roundStartedAt: Date.now(),
    })

    let done = 0
    let players = 0
    const failures: string[] = []

    try {
      for (let round = 0; round < 40; round++) {
        const result = await fillCompetitionWithAi(competition.id)
        done += result.filled.length
        players += result.players
        failures.push(...result.failures)

        flash(result.filled)
        await loadCompetitions()
        const updated = await listCatalogTeams(competition.id).catch(() => [])
        setTeams(updated)
        setSquadVersion((version) => version + 1)

        /// Um item por clube desta leva, com o que entrou de verdade na base,
        /// para dar para ver quem veio cheio, quem veio magro e quem falhou.
        const entries: FillLogEntry[] = [
          ...result.filled.map((team) => {
            const squad = result.squads.find((row) => row.team === team)
            return {
              team,
              players: updated.find((row) => row.name === team)?._count.players ?? 0,
              returned: squad?.players.length ?? 0,
              outdated: squad?.beyondKnowledge ?? false,
              error: null,
            }
          }),
          ...result.failures.map((failure) => ({
            team: failure.split(":")[0] ?? "",
            players: 0,
            returned: 0,
            outdated: false,
            error: failure.slice(failure.indexOf(":") + 1).trim(),
          })),
        ]
        setLog((current) => [...entries, ...current])

        const next = result.remaining === 0 ? [] : pending.slice(done, done + 3)
        setFill({
          competitionId: competition.id,
          total: pending.length,
          done,
          players,
          running: next,
          failures,
          roundStartedAt: Date.now(),
        })

        if (result.remaining === 0) break
      }

      setNotice(
        `${competition.name}: ${players} jogadores em ${done} clube(s).` +
          (failures.length ? ` ${failures.length} falha(s).` : ""),
      )
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível preencher os elencos.")
      await loadCompetitions()
      await loadTeams(competition.id)
    } finally {
      setBusy("")
      setFill(null)
    }
  }

  const addTeam = async (competitionId: string) => {
    await run(`team-${competitionId}`, () => createCatalogTeam(competitionId, { name: newTeam.trim() }), `${newTeam.trim()} criado.`)
    setNewTeam("")
  }

  return (
    <Card className="border-white/[0.07] bg-white/[0.025] p-5">
      <div className="mb-1.5 flex items-center gap-2">
        <Shield className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-black text-white">Competições e times</h3>
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setCreating(!creating)} className="h-7 text-[11px]">
          Nova competição
        </Button>
      </div>
      <p className="mb-4 max-w-3xl text-[11px] leading-relaxed text-gray-500">
        Toda a base mora dentro de uma competição e de um time. Abra um clube para ver o elenco, mande a IA preencher um
        de cada vez ou a competição inteira, e clique no lápis para renomear.
      </p>

      {notice && (
        <p className="animate-in fade-in slide-in-from-top-1 mb-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300 duration-300">
          {notice}
        </p>
      )}
      {error && (
        <p className="animate-in fade-in slide-in-from-top-1 mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300 duration-300">
          {error}
        </p>
      )}

      {creating && (
        <div className="animate-in fade-in slide-in-from-top-2 mb-4 grid gap-2 duration-300 sm:grid-cols-[1fr_150px_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome, por exemplo Brasileirão 2026"
            className="border-white/10 bg-white/[0.03]"
          />
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
            placeholder="CODIGO"
            className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
          />
          <Button
            disabled={busy !== "" || name.trim().length < 3 || code.trim().length < 2}
            onClick={() =>
              void run("create", () => createCompetition({ code: code.trim(), name: name.trim() }), `${name.trim()} criada.`).then(
                () => {
                  setName("")
                  setCode("")
                  setCreating(false)
                },
              )
            }
            className="bg-emerald-500 text-black hover:bg-emerald-400"
          >
            Criar
          </Button>
        </div>
      )}

      {competitions.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-gray-600">Nenhuma competição ainda.</p>
      ) : (
        <div className="space-y-2">
          {competitions.map((competition) => {
            const open = openId === competition.id
            const filling = fill?.competitionId === competition.id
            const showLog = log.length > 0 && logFor === competition.id
            const percent = filling && fill.total > 0 ? Math.round((fill.done / fill.total) * 100) : 0

            return (
              <div
                key={competition.id}
                className={`overflow-hidden rounded-xl border transition-colors duration-300 ${
                  filling ? "border-violet-500/30 bg-violet-500/[0.04]" : "border-white/[0.06] bg-white/[0.015]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <button
                    onClick={() => {
                      setOpenId(open ? "" : competition.id)
                      setOpenTeamId("")
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-white hover:text-sky-300"
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 flex-shrink-0 text-gray-600 transition-transform duration-200 ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                    <EditableName
                      value={competition.name}
                      className="text-[13px] font-bold"
                      onSave={(newName) =>
                        void run(
                          `rename-${competition.id}`,
                          () => updateCompetition(competition.id, { name: newName }),
                          `Agora é ${newName}.`,
                        )
                      }
                    />
                    <span className="hidden flex-shrink-0 font-mono text-[10px] text-gray-700 sm:block">
                      {competition.code}
                    </span>
                  </button>

                  <StatusPill tone="neutral">{SOURCE_LABELS[competition.source]}</StatusPill>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-500">
                    {competition.teamCount} times
                    <span className="mx-1 text-gray-700">·</span>
                    <span className={competition.playerCount === 0 ? "text-amber-500/80" : "text-gray-400"}>
                      {competition.playerCount} jogadores
                    </span>
                  </span>

                  {competition.teamCount > 0 && (
                    <Button
                      size="sm"
                      disabled={busy !== ""}
                      onClick={() =>
                        void run(
                          `sofifa-${competition.id}`,
                          async () => {
                            const result = await fillCompetitionFromSofifa(competition.id)
                            flash(result.filled)
                            setSquadVersion((version) => version + 1)
                            setNotice(
                              `${result.players} jogadores do FC 26 em ${result.filled.length} clube(s).` +
                                (result.remaining ? ` Faltam ${result.remaining}.` : "") +
                                (result.failures.length ? ` Não achei: ${result.failures.join("; ")}` : ""),
                            )
                          },
                          "",
                        )
                      }
                      className="h-7 flex-shrink-0 bg-emerald-500 px-2.5 text-[11px] text-black hover:bg-emerald-400"
                    >
                      {busy === `sofifa-${competition.id}` ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <Gamepad2 className="mr-1.5 h-3 w-3" />
                      )}
                      Elencos do FC 26
                    </Button>
                  )}

                  {competition.source === "AI" && competition.teamCount > 0 && (
                    <Button
                      size="sm"
                      disabled={busy !== ""}
                      onClick={() => void fillAll(competition)}
                      className="h-7 flex-shrink-0 bg-violet-500 px-2.5 text-[11px] text-white hover:bg-violet-400"
                    >
                      {filling ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1.5 h-3 w-3" />
                      )}
                      Preencher elencos
                    </Button>
                  )}

                  {competition.source !== "MANUAL" && (
                    <button
                      onClick={() =>
                        void run(
                          `sync-${competition.id}`,
                          async () => {
                            const result = await syncCompetition(competition.id)
                            setNotice(`${result.players} jogadores atualizados em ${competition.name}.`)
                          },
                          "",
                        )
                      }
                      disabled={busy !== ""}
                      aria-label={`Atualizar ${competition.name}`}
                      className="flex-shrink-0 cursor-pointer rounded p-1.5 text-gray-600 transition hover:bg-white/[0.05] hover:text-sky-400 disabled:cursor-default"
                    >
                      {busy === `sync-${competition.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      void run(`del-${competition.id}`, () => removeCompetition(competition.id), `${competition.name} removida.`)
                    }
                    disabled={busy !== ""}
                    aria-label={`Remover ${competition.name}`}
                    className="flex-shrink-0 cursor-pointer rounded p-1.5 text-gray-700 transition hover:bg-white/[0.05] hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {(filling || showLog) && (
                  <div className="animate-in fade-in px-3 pb-3 duration-300">
                    {filling && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-violet-400 transition-all duration-700 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    {filling && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="font-bold tabular-nums text-violet-300">
                        {fill.done} de {fill.total} clubes
                      </span>
                      <span className="tabular-nums text-gray-400">{fill.players} jogadores</span>
                      <span className="tabular-nums text-gray-600">
                        {formatElapsed(now - fill.roundStartedAt)} nesta leva
                      </span>
                      {fill.failures.length > 0 && (
                        <span className="text-red-400/80">{fill.failures.length} falha(s)</span>
                      )}
                      <span className="flex-1" />
                      <span className="text-gray-600">faltam {fill.total - fill.done}</span>
                    </div>
                    )}

                    {filling && fill.running.length > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                        buscando {fill.running.join(", ")}
                      </p>
                    )}

                    {filling && now - fill.roundStartedAt > SLOW_ROUND_MS && (
                      <p className="mt-1 text-[11px] text-amber-400">
                        Esta leva está demorando mais que o normal. O modelo pode estar lento ou em limite de taxa. A
                        tela continua esperando, e o que já entrou está salvo.
                      </p>
                    )}

                    {showLog && (
                      <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-white/[0.05] bg-black/30 p-2">
                        {log.map((entry, index) => (
                          <p
                            key={`${entry.team}-${index}`}
                            className="animate-in fade-in slide-in-from-left-1 flex items-center gap-2 text-[11px] duration-300"
                          >
                            <span className={entry.error ? "text-red-400" : "text-emerald-400"}>
                              {entry.error ? "✗" : "✓"}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-gray-300">{entry.team}</span>
                            {entry.outdated && (
                              <span
                                title="A IA avisou que esse elenco é de uma temporada anterior à data pedida"
                                className="flex-shrink-0 rounded bg-amber-500/10 px-1.5 text-[10px] text-amber-400"
                              >
                                defasado
                              </span>
                            )}
                            {!entry.error && entry.returned > entry.players && (
                              <span
                                title="Emprestados, gente da base e nomes de baixa certeza não entram na base"
                                className="flex-shrink-0 text-[10px] text-gray-600"
                              >
                                {entry.returned - entry.players} filtrados
                              </span>
                            )}
                            <span
                              className={`flex-shrink-0 tabular-nums ${
                                entry.error
                                  ? "text-red-400/70"
                                  : entry.players < THIN_SQUAD
                                    ? "text-amber-400"
                                    : "text-gray-500"
                              }`}
                            >
                              {entry.error ? entry.error.slice(0, 60) : `${entry.players} jogadores`}
                            </span>
                          </p>
                        ))}
                        {!filling && (
                          <button
                            onClick={() => {
                              setLog([])
                              setLogFor("")
                            }}
                            className="mt-1 w-full cursor-pointer text-center text-[10px] text-gray-600 hover:text-gray-400"
                          >
                            fechar resultado
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {competition.lastSyncAt && !filling && (
                  <p
                    className={`px-3 pb-2.5 pl-8 text-[10px] leading-snug ${
                      competition.lastSyncOk ? "text-gray-600" : "text-red-400/80"
                    }`}
                  >
                    {formatDateTime(competition.lastSyncAt)}: {competition.lastSyncMessage}
                  </p>
                )}

                {open && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-1 border-t border-white/[0.05] bg-black/20 p-2.5 duration-300">
                    {teams.length === 0 ? (
                      <p className="py-2 text-center text-[11px] text-gray-600">Nenhum time aqui ainda.</p>
                    ) : (
                      teams.map((team) => {
                        const openTeam = openTeamId === team.id
                        const justFilled = flashing.includes(team.name)
                        const running = filling && fill.running.includes(team.name)

                        return (
                          <div
                            key={team.id}
                            className={`overflow-hidden rounded-lg border transition-all duration-500 ${
                              justFilled
                                ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                                : running
                                  ? "border-violet-500/30 bg-violet-500/[0.05]"
                                  : "border-white/[0.05] bg-white/[0.015]"
                            }`}
                          >
                            <div className="flex items-center gap-2 px-2.5 py-1.5">
                              <button
                                onClick={() => setOpenTeamId(openTeam ? "" : team.id)}
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-[12px] text-white hover:text-sky-300"
                              >
                                <ChevronRight
                                  className={`h-3 w-3 flex-shrink-0 text-gray-600 transition-transform duration-200 ${
                                    openTeam ? "rotate-90" : ""
                                  }`}
                                />
                                <EditableName
                                  value={team.name}
                                  onSave={(newName) =>
                                    void run(
                                      `rename-${team.id}`,
                                      () => updateCatalogTeam(team.id, { name: newName }),
                                      `Agora é ${newName}.`,
                                    )
                                  }
                                />
                              </button>

                              {running ? (
                                <span className="flex flex-shrink-0 items-center gap-1.5 text-[10px] text-violet-300">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  buscando
                                </span>
                              ) : (
                                <span
                                  className={`flex-shrink-0 text-[10px] tabular-nums transition-colors duration-500 ${
                                    justFilled
                                      ? "font-bold text-emerald-300"
                                      : team._count.players > 0
                                        ? "text-gray-500"
                                        : "text-amber-500/70"
                                  }`}
                                >
                                  {team._count.players} jogadores
                                </span>
                              )}

                              <button
                                onClick={() =>
                                  void run(
                                    `sofifa-${team.id}`,
                                    async () => {
                                      const result = await fillTeamFromSofifa(team.id)
                                      flash([team.name])
                                      setSquadVersion((version) => version + 1)
                                      setNotice(
                                        `${result.players} jogadores do FC 26 em ${team.name} (${result.matched}).`,
                                      )
                                    },
                                    "",
                                  )
                                }
                                disabled={busy !== ""}
                                aria-label={`Trazer elenco do ${team.name} do FC 26`}
                                className="flex-shrink-0 cursor-pointer rounded p-1.5 text-gray-600 transition hover:bg-white/[0.05] hover:text-emerald-400 disabled:cursor-default"
                              >
                                {busy === `sofifa-${team.id}` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Gamepad2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  void run(
                                    `fill-${team.id}`,
                                    async () => {
                                      const result = await fillTeamWithAi(team.id)
                                      if (result.failures.length) throw new Error(result.failures.join(" | "))
                                      flash([team.name])
                                      setSquadVersion((version) => version + 1)
                                    },
                                    `Elenco do ${team.name} veio da IA.`,
                                  )
                                }
                                disabled={busy !== ""}
                                aria-label={`Buscar elenco do ${team.name} pela IA`}
                                className="flex-shrink-0 cursor-pointer rounded p-1.5 text-gray-600 transition hover:bg-white/[0.05] hover:text-violet-400 disabled:cursor-default"
                              >
                                {busy === `fill-${team.id}` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  void run(`delteam-${team.id}`, () => removeCatalogTeam(team.id), `${team.name} removido.`)
                                }
                                disabled={busy !== ""}
                                aria-label={`Remover ${team.name}`}
                                className="flex-shrink-0 cursor-pointer rounded p-1.5 text-gray-700 transition hover:bg-white/[0.05] hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {openTeam && (
                              <div className="border-t border-white/[0.05] bg-black/20 py-1">
                                <TeamPlayers teamId={team.id} version={squadVersion} />
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}

                    <div className="flex gap-2 pt-1.5">
                      <Input
                        value={newTeam}
                        onChange={(event) => setNewTeam(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && newTeam.trim().length >= 2) void addTeam(competition.id)
                        }}
                        placeholder="Novo time"
                        className="h-8 border-white/10 bg-white/[0.03] text-[12px]"
                      />
                      <Button
                        size="sm"
                        disabled={busy !== "" || newTeam.trim().length < 2}
                        onClick={() => void addTeam(competition.id)}
                        className="h-8 bg-white/10 text-[11px] text-white hover:bg-white/20"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Criar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
