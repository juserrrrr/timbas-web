"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, RefreshCw, Shield, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusPill, formatDateTime } from "@/components/competitions/shared"
import { formatMoney } from "@/lib/money"
import {
  SOURCE_LABELS,
  createCatalogTeam,
  createCompetition,
  fillCompetitionWithAi,
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

/// Nome editável no lugar, para não precisar de tela separada só para renomear.
function EditableName({
  value,
  onSave,
  className,
}: {
  value: string
  onSave: (name: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <span className={`flex min-w-0 items-center gap-1 ${className ?? ""}`}>
        <span className="truncate">{value}</span>
        <button
          onClick={(event) => {
            event.stopPropagation()
            setDraft(value)
            setEditing(true)
          }}
          aria-label={`Renomear ${value}`}
          className="flex-shrink-0 cursor-pointer rounded p-0.5 text-gray-700 hover:text-sky-400"
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

/// Elenco de um time, aberto sob demanda, com o botão que manda a IA preencher.
function TeamPlayers({ team, busy, onRun }: { team: CatalogTeam; busy: string; onRun: Run }) {
  const [players, setPlayers] = useState<CatalogPlayer[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setPlayers(await listCatalogPlayers(team.id).catch(() => []))
    setLoading(false)
  }, [team.id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mt-1.5 space-y-1 border-l border-white/[0.06] pl-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={busy !== ""}
          onClick={() =>
            void onRun(
              `fill-${team.id}`,
              async () => {
                const result = await fillTeamWithAi(team.id)
                if (result.failures.length) throw new Error(result.failures.join(" | "))
              },
              `Elenco do ${team.name} veio da IA.`,
            ).then(load)
          }
          className="h-7 bg-violet-500 px-2 text-[11px] text-white hover:bg-violet-400"
        >
          {busy === `fill-${team.id}` ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          {players.length > 0 ? "Atualizar elenco pela IA" : "Trazer elenco pela IA"}
        </Button>
        {players.length > 0 && <span className="text-[10px] text-gray-600">{players.length} no elenco</span>}
      </div>

      {loading ? (
        <p className="text-[11px] text-gray-600">Carregando elenco...</p>
      ) : players.length === 0 ? (
        <p className="text-[11px] text-gray-600">Time vazio. O botão aí em cima busca o elenco com camisa, atributos e valor.</p>
      ) : (
        players.map((player) => (
          <div key={player.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-6 flex-shrink-0 text-right font-mono text-[10px] text-gray-700">
              {player.shirtNumber ?? "-"}
            </span>
            <span className="w-7 flex-shrink-0 text-center font-black text-gray-300">{player.overall}</span>
            <span className="w-9 flex-shrink-0 text-gray-600">{player.position}</span>
            <span className={`min-w-0 flex-1 truncate ${player.active ? "text-white" : "text-gray-600 line-through"}`}>
              {player.name}
            </span>
            <span className="flex-shrink-0 text-[10px] text-amber-400/80">{formatMoney(player.price)}</span>
          </div>
        ))
      )}
    </div>
  )
}

function TeamList({ competitionId, busy, onRun }: { competitionId: string; busy: string; onRun: Run }) {
  const [teams, setTeams] = useState<CatalogTeam[]>([])
  const [openId, setOpenId] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setTeams(await listCatalogTeams(competitionId).catch(() => []))
    setLoading(false)
  }, [competitionId])

  useEffect(() => {
    void load()
  }, [load])

  const add = async () => {
    await onRun(`team-${competitionId}`, () => createCatalogTeam(competitionId, { name: name.trim() }), `${name.trim()} criado.`)
    setName("")
    await load()
  }

  return (
    <div className="mt-2 space-y-1.5 border-t border-white/[0.05] pt-2">
      {loading ? (
        <p className="text-[11px] text-gray-600">Carregando times...</p>
      ) : teams.length === 0 ? (
        <p className="text-[11px] text-gray-600">Nenhum time aqui ainda.</p>
      ) : (
        teams.map((team) => (
          <div key={team.id} className="rounded border border-white/[0.05] bg-white/[0.015] px-2 py-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenId(openId === team.id ? "" : team.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 text-left text-[12px] text-white hover:text-sky-300"
              >
                {openId === team.id ? (
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                )}
                <EditableName
                  value={team.name}
                  onSave={(newName) =>
                    void onRun(`rename-${team.id}`, () => updateCatalogTeam(team.id, { name: newName }), `Agora é ${newName}.`).then(
                      load,
                    )
                  }
                />
              </button>
              <span
                className={`flex-shrink-0 text-[10px] ${team._count.players > 0 ? "text-gray-600" : "text-amber-500/70"}`}
              >
                {team._count.players} jogadores
              </span>
              <button
                onClick={() =>
                  void onRun(`delteam-${team.id}`, () => removeCatalogTeam(team.id), `${team.name} removido.`).then(load)
                }
                aria-label={`Remover ${team.name}`}
                className="flex-shrink-0 cursor-pointer rounded p-1 text-gray-700 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {openId === team.id && <TeamPlayers team={team} busy={busy} onRun={onRun} />}
          </div>
        ))
      )}

      <div className="flex gap-2 pt-1">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim().length >= 2) void add()
          }}
          placeholder="Novo time"
          className="h-8 border-white/10 bg-white/[0.03] text-[12px]"
        />
        <Button
          size="sm"
          disabled={busy !== "" || name.trim().length < 2}
          onClick={() => void add()}
          className="h-8 bg-white/10 text-[11px] text-white hover:bg-white/20"
        >
          <Plus className="mr-1 h-3 w-3" />
          Criar
        </Button>
      </div>
    </div>
  )
}

/// As competições são as pastas da base: cada uma guarda os times e, dentro
/// deles, os jogadores. Atualizar refaz a busca na origem daquela competição.
export function CatalogTeamsCard({ onChanged }: { onChanged: () => void }) {
  const [competitions, setCompetitions] = useState<CatalogCompetition[]>([])
  const [openId, setOpenId] = useState("")
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    const catalog = await listCompetitions().catch(() => ({ items: [], footballDataReady: false }))
    setCompetitions(catalog.items)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run: Run = async (key, action, message) => {
    setBusy(key)
    setError("")
    try {
      await action()
      if (message) setNotice(message)
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  /// Preencher vinte clubes numa requisição só estoura o tempo do navegador, por
  /// isso a tela pede de três em três e vai contando o que falta.
  const fillAll = async (competition: CatalogCompetition) => {
    setBusy(`fill-${competition.id}`)
    setError("")
    let imported = 0
    const problems: string[] = []
    try {
      for (let round = 0; round < 20; round++) {
        const result = await fillCompetitionWithAi(competition.id)
        imported += result.players
        problems.push(...result.failures)
        setNotice(
          `${competition.name}: ${imported} jogadores, ${result.remaining} clube(s) na fila.` +
            (problems.length ? ` ${problems.length} falha(s).` : ""),
        )
        if (result.remaining === 0) break
      }
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível preencher os elencos.")
      await load()
    } finally {
      setBusy("")
    }
  }

  return (
    <Card className="border-white/[0.07] bg-white/[0.025] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Shield className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-black text-white">Competições e times</h3>
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setCreating(!creating)} className="h-7 text-[11px]">
          Nova competição
        </Button>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-gray-500">
        Toda a base mora dentro de uma competição e de um time. Abra um clube para ver o elenco, mande a IA preencher um
        de cada vez ou a competição inteira, e clique no lápis para renomear.
      </p>

      {notice && <p className="mb-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      {creating && (
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
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
        <p className="text-[11px] text-gray-600">Nenhuma competição ainda.</p>
      ) : (
        <div className="space-y-1.5">
          {competitions.map((competition) => {
            const empty = competition.playerCount === 0 && competition.teamCount > 0
            return (
              <div key={competition.id} className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <button
                    onClick={() => setOpenId(openId === competition.id ? "" : competition.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left text-white hover:text-sky-300"
                  >
                    {openId === competition.id ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    )}
                    <EditableName
                      value={competition.name}
                      className="text-[12px] font-bold"
                      onSave={(newName) =>
                        void run(
                          `rename-${competition.id}`,
                          () => updateCompetition(competition.id, { name: newName }),
                          `Agora é ${newName}.`,
                        )
                      }
                    />
                    <span className="flex-shrink-0 font-mono text-[10px] text-gray-700">{competition.code}</span>
                  </button>

                  <StatusPill tone="neutral">{SOURCE_LABELS[competition.source]}</StatusPill>
                  <span className={`text-[10px] ${empty ? "text-amber-500/80" : "text-gray-600"}`}>
                    {competition.teamCount} times, {competition.playerCount} jogadores
                  </span>

                  {competition.source === "AI" && competition.teamCount > 0 && (
                    <Button
                      size="sm"
                      disabled={busy !== ""}
                      onClick={() => void fillAll(competition)}
                      className="h-6 bg-violet-500 px-2 text-[10px] text-white hover:bg-violet-400"
                    >
                      {busy === `fill-${competition.id}` ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-3 w-3" />
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
                      className="flex-shrink-0 cursor-pointer rounded p-1 text-gray-600 hover:text-sky-400 disabled:cursor-default"
                    >
                      {busy === `sync-${competition.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      void run(`del-${competition.id}`, () => removeCompetition(competition.id), `${competition.name} removida.`)
                    }
                    aria-label={`Remover ${competition.name}`}
                    className="flex-shrink-0 cursor-pointer rounded p-1 text-gray-700 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {competition.lastSyncAt && (
                  <p className={`mt-0.5 pl-4 text-[10px] ${competition.lastSyncOk ? "text-gray-600" : "text-red-400/80"}`}>
                    {formatDateTime(competition.lastSyncAt)}: {competition.lastSyncMessage}
                  </p>
                )}

                {openId === competition.id && <TeamList competitionId={competition.id} busy={busy} onRun={run} />}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
