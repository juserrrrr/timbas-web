"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ClipboardPaste,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import {
  ATTRIBUTE_KEYS,
  attributeLongLabels,
  attributeRow,
  attributeTone,
  hasAttributes,
} from "@/lib/attributes"
import {
  createCatalogTeam,
  createCompetition,
  estimatePlayerAttributes,
  estimateTeamAttributes,
  importCatalogToLeague,
  listCatalogPlayers,
  listCatalogTeams,
  listCompetitions,
  removeCatalogPlayer,
  removeCatalogTeam,
  removeCompetition,
  SOURCE_LABELS,
  syncCompetition,
  updateCatalogPlayer,
  updateCompetition,
  type CatalogCompetition,
  type CatalogPlayer,
  type CatalogSource,
  type CatalogTeam,
} from "@/lib/services/catalog"
import { listDraftLeagues } from "@/lib/services/draft"
import type { DraftLeagueSummary } from "@/lib/services/draft.types"
import { CatalogImportDialog } from "@/components/competitions/catalog-import-dialog"

const SOURCES: Array<{ id: CatalogSource; title: string; hint: string }> = [
  {
    id: "FOOTBALL_DATA",
    title: "football-data.org",
    hint: "API pública com elencos oficiais. Informe o código da competição, por exemplo BSA para o Brasileirão.",
  },
  {
    id: "GENERIC",
    title: "URL própria",
    hint: "Qualquer endereço que devolva JSON com times e jogadores.",
  },
  {
    id: "MANUAL",
    title: "Manual",
    hint: "Você cadastra os times e jogadores na mão ou por foto.",
  },
]

/// Linha do jogador na base: nota, posição, os seis atributos do card e, ao
/// abrir, os campos para ajustar o que a IA estimou.
function PlayerRow({
  player,
  busy,
  onEstimate,
  onSave,
  onRemove,
}: {
  player: CatalogPlayer
  busy: string
  onEstimate: () => void
  onSave: (input: Record<string, number>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const labels = attributeLongLabels(player.position)
  const filled = hasAttributes(player)

  const startEditing = () => {
    setDraft(
      Object.fromEntries([
        ["overall", String(player.overall)],
        ...ATTRIBUTE_KEYS.map((key) => [key, player[key] === null ? "" : String(player[key])]),
      ]),
    )
    setOpen(true)
  }

  const save = () => {
    const input: Record<string, number> = {}
    for (const key of ["overall", ...ATTRIBUTE_KEYS]) {
      const value = Number(draft[key])
      if (Number.isFinite(value) && value >= 1 && value <= 99) input[key] = Math.round(value)
    }
    onSave(input)
    setOpen(false)
  }

  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-2 py-1.5">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-7 flex-shrink-0 text-center font-black text-gray-300">{player.overall}</span>
        <span className="w-9 flex-shrink-0 text-gray-600">{player.position}</span>
        <button
          onClick={() => (open ? setOpen(false) : startEditing())}
          className={`min-w-0 flex-1 cursor-pointer truncate text-left ${
            player.active ? "text-white hover:text-sky-300" : "text-gray-600 line-through"
          }`}
        >
          {player.name}
        </button>

        {filled ? (
          <span className="hidden flex-shrink-0 items-center gap-1.5 sm:flex">
            {attributeRow(player).map((attribute) => (
              <span key={attribute.label} className="flex w-8 flex-col items-center leading-none">
                <span className={`text-[11px] font-black tabular-nums ${attributeTone(attribute.value)}`}>
                  {attribute.value ?? "-"}
                </span>
                <span className="text-[8px] uppercase tracking-wide text-gray-700">{attribute.label}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="hidden flex-shrink-0 text-[10px] text-gray-700 sm:block">sem atributos</span>
        )}

        <button
          onClick={onEstimate}
          disabled={busy !== ""}
          aria-label={`Estimar atributos de ${player.name}`}
          className="flex-shrink-0 cursor-pointer rounded p-1 text-gray-700 hover:text-violet-400 disabled:cursor-default"
        >
          {busy === `attr-${player.id}` ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={onRemove}
          aria-label={`Remover ${player.name}`}
          className="flex-shrink-0 cursor-pointer rounded p-1 text-gray-700 hover:text-red-400"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2 border-t border-white/[0.05] pt-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="block text-[10px] uppercase tracking-wide text-gray-600">Overall</span>
              <input
                inputMode="numeric"
                value={draft.overall ?? ""}
                onChange={(event) => setDraft({ ...draft, overall: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                className="h-8 w-full rounded border border-white/10 bg-black/40 px-2 text-center text-[12px] font-bold text-white outline-none focus:border-sky-500/50"
              />
            </label>
            {ATTRIBUTE_KEYS.map((key, index) => (
              <label key={key} className="space-y-1">
                <span className="block truncate text-[10px] uppercase tracking-wide text-gray-600">
                  {labels[index]}
                </span>
                <input
                  inputMode="numeric"
                  value={draft[key] ?? ""}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                  className="h-8 w-full rounded border border-white/10 bg-black/40 px-2 text-center text-[12px] text-white outline-none focus:border-sky-500/50"
                />
              </label>
            ))}
          </div>

          {player.attributesNote && (
            <p className="text-[10px] leading-snug text-gray-500">
              {player.attributesNote}
              {player.attributesModel ? ` (${player.attributesModel})` : ""}
            </p>
          )}

          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-[11px]">
              Fechar
            </Button>
            <Button size="sm" onClick={save} disabled={busy !== ""} className="bg-sky-500 text-black hover:bg-sky-400">
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CatalogPanel() {
  const [competitions, setCompetitions] = useState<CatalogCompetition[]>([])
  const [footballDataReady, setFootballDataReady] = useState(false)
  const [selected, setSelected] = useState<CatalogCompetition | null>(null)
  const [teams, setTeams] = useState<CatalogTeam[]>([])
  const [openTeam, setOpenTeam] = useState<CatalogTeam | null>(null)
  const [importTeam, setImportTeam] = useState<CatalogTeam | null>(null)
  const [importingTeams, setImportingTeams] = useState<CatalogCompetition | null>(null)
  const [players, setPlayers] = useState<CatalogPlayer[]>([])
  const [leagues, setLeagues] = useState<DraftLeagueSummary[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [newCode, setNewCode] = useState("BSA")
  const [newName, setNewName] = useState("Brasileirão Série A")
  const [newSource, setNewSource] = useState<CatalogSource>("FOOTBALL_DATA")
  const [newPath, setNewPath] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [importing, setImporting] = useState(false)
  const [importLeagueId, setImportLeagueId] = useState("")
  const [importReplace, setImportReplace] = useState(true)

  const load = useCallback(async () => {
    try {
      const [catalog, leagueList] = await Promise.all([listCompetitions(), listDraftLeagues()])
      setCompetitions(catalog.items)
      setFootballDataReady(catalog.footballDataReady)
      setLeagues(leagueList.filter((league) => league.status === "SETUP"))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o catálogo")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected) {
      setTeams([])
      return
    }
    listCatalogTeams(selected.id).then(setTeams).catch(() => setTeams([]))
  }, [selected])

  useEffect(() => {
    if (!openTeam) {
      setPlayers([])
      return
    }
    listCatalogPlayers(openTeam.id).then(setPlayers).catch(() => setPlayers([]))
  }, [openTeam])

  if (loading) return <PageLoading />
  if (error && competitions.length === 0) return <ErrorState message={error} retry={() => void load()} />

  const refresh = async () => {
    await load()
    if (selected) setTeams(await listCatalogTeams(selected.id))
    if (openTeam) setPlayers(await listCatalogPlayers(openTeam.id))
  }

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key)
    setError("")
    try {
      await action()
      // Ação que já escreveu o próprio aviso passa mensagem vazia.
      if (message) setNotice(message)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="space-y-6">
      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-black text-white">Nova competição</h3>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {SOURCES.map((source) => {
            const blocked = source.id === "FOOTBALL_DATA" && !footballDataReady
            return (
              <button
                key={source.id}
                onClick={() => setNewSource(source.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  newSource === source.id
                    ? "cursor-pointer border-sky-500/40 bg-sky-500/[0.08]"
                    : "cursor-pointer border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold ${newSource === source.id ? "text-sky-300" : "text-white"}`}>
                    {source.title}
                  </span>
                  {source.id === "FOOTBALL_DATA" &&
                    (footballDataReady ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-gray-600" />
                    ))}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-gray-500">{source.hint}</span>
                {blocked && (
                  <span className="mt-1 block font-mono text-[10px] text-amber-400">FOOTBALL_DATA_TOKEN ausente</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="comp-code">Código</Label>
            <Input
              id="comp-code"
              value={newCode}
              onChange={(event) => setNewCode(event.target.value.toUpperCase())}
              placeholder="BSA"
              className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="comp-name">Nome</Label>
            <Input
              id="comp-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Brasileirão Série A"
              className="border-white/10 bg-white/[0.03]"
            />
          </div>
          {newSource === "GENERIC" && (
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="comp-path">URL do JSON</Label>
              <Input
                id="comp-path"
                value={newPath}
                onChange={(event) => setNewPath(event.target.value)}
                placeholder="https://exemplo.com/brasileirao.json"
                className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
              />
            </div>
          )}
        </div>

        <Button
          onClick={() =>
            void run(
              "create-competition",
              () =>
                createCompetition({
                  code: newCode.trim(),
                  name: newName.trim(),
                  source: newSource,
                  sourcePath: newSource === "GENERIC" ? newPath.trim() : null,
                }),
              `${newName} adicionada ao catálogo.`,
            )
          }
          disabled={busy !== "" || newCode.trim().length < 2 || newName.trim().length < 3}
          className="mt-3 bg-sky-500 text-black hover:bg-sky-400"
        >
          {busy === "create-competition" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          Adicionar competição
        </Button>
      </Card>

      {competitions.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Catálogo vazio"
          description="Adicione uma competição acima. Com a API pública configurada, um clique traz todos os times e elencos."
        />
      ) : (
        <div className="space-y-2">
          {competitions.map((competition) => {
            const isOpen = selected?.id === competition.id
            return (
              <Card key={competition.id} className="border-white/[0.07] bg-white/[0.025] p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Shield className="h-4 w-4 flex-shrink-0 text-sky-400" />

                  <button
                    onClick={() => {
                      setSelected(isOpen ? null : competition)
                      setOpenTeam(null)
                    }}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <p className="truncate text-sm font-bold text-white">{competition.name}</p>
                    <p className="truncate text-[11px] text-gray-600">
                      {competition.code} · {SOURCE_LABELS[competition.source]} · {competition.teamCount} times ·{" "}
                      {competition.playerCount} jogadores
                    </p>
                  </button>

                  {competition.lastSyncAt && (
                    <StatusPill tone={competition.lastSyncOk ? "live" : "danger"}>
                      {competition.lastSyncOk ? "Sincronizada" : "Falhou"}
                    </StatusPill>
                  )}

                  <label className="flex cursor-pointer items-center gap-1.5" title="Rodada diária que mantém a base viva">
                    <Switch
                      checked={competition.simulationEnabled}
                      onCheckedChange={(checked) =>
                        void run(
                          `sim-${competition.id}`,
                          () => updateCompetition(competition.id, { simulationEnabled: checked }),
                          checked
                            ? `${competition.name} volta a jogar rodadas na base.`
                            : `${competition.name} congelada na base.`,
                        )
                      }
                    />
                    <span className="text-[10px] text-gray-500">
                      Rodadas da base
                      {competition.worldRound > 0 ? ` (${competition.worldRound})` : ""}
                    </span>
                  </label>

                  {competition.source !== "MANUAL" && (
                    <Button
                      size="sm"
                      disabled={busy !== ""}
                      onClick={() =>
                        void run(
                          competition.id,
                          async () => {
                            const result = await syncCompetition(competition.id)
                            setNotice(`${result.teams} times e ${result.players} jogadores atualizados.`)
                          },
                          "Sincronização concluída.",
                        )
                      }
                      className="h-7 bg-sky-500 px-2 text-[11px] text-black hover:bg-sky-400"
                    >
                      {busy === competition.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span className="ml-1">Sincronizar</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== ""}
                    onClick={() =>
                      void run(competition.id, () => removeCompetition(competition.id), `${competition.name} removida.`)
                    }
                    className="h-7 border-red-500/25 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {competition.lastSyncMessage && (
                  <p className="mt-2 text-[11px] text-gray-600">
                    {formatDateTime(competition.lastSyncAt)}: {competition.lastSyncMessage}
                  </p>
                )}

                {isOpen && (
                  <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={newTeamName}
                        onChange={(event) => setNewTeamName(event.target.value)}
                        placeholder="Adicionar time na mão"
                        className="border-white/10 bg-white/[0.03]"
                      />
                      <Button
                        variant="outline"
                        disabled={busy !== "" || newTeamName.trim().length < 2}
                        onClick={() =>
                          void run(
                            "create-team",
                            () => createCatalogTeam(competition.id, { name: newTeamName.trim() }),
                            `${newTeamName} adicionado.`,
                          ).then(() => setNewTeamName(""))
                        }
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Adicionar
                      </Button>
                      <Button variant="outline" onClick={() => setImportingTeams(competition)}>
                        <ClipboardPaste className="mr-1.5 h-4 w-4" />
                        Colar ou foto
                      </Button>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {teams.map((team) => (
                        <div
                          key={team.id}
                          className={`rounded-lg border px-3 py-2 transition ${
                            openTeam?.id === team.id
                              ? "border-sky-500/30 bg-sky-500/[0.06]"
                              : "border-white/[0.06] bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setOpenTeam(openTeam?.id === team.id ? null : team)}
                              className="min-w-0 flex-1 cursor-pointer text-left"
                            >
                              <p className="truncate text-[13px] font-bold text-white">{team.name}</p>
                              <p className="text-[10px] text-gray-600">{team._count.players} jogadores</p>
                            </button>
                            <button
                              onClick={() => setImportTeam(team)}
                              aria-label={`Importar elenco de ${team.name}`}
                              className="cursor-pointer rounded p-1.5 text-gray-600 hover:text-violet-400"
                            >
                              <ClipboardPaste className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                void run(team.id, () => removeCatalogTeam(team.id), `${team.name} removido.`)
                              }
                              aria-label={`Remover ${team.name}`}
                              className="cursor-pointer rounded p-1.5 text-gray-600 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {openTeam?.id === team.id && players.length > 0 && (
                            <div className="mt-2 space-y-2 border-t border-white/[0.06] pt-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy !== ""}
                                  onClick={() =>
                                    void run(
                                      `attrs-${team.id}`,
                                      async () => {
                                        const result = await estimateTeamAttributes(team.id, true)
                                        setNotice(
                                          `${result.updated} de ${result.requested} jogadores estimados por ${result.model}.`,
                                        )
                                      },
                                      "",
                                    )
                                  }
                                >
                                  {busy === `attrs-${team.id}` ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  Estimar quem falta
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busy !== ""}
                                  onClick={() =>
                                    void run(
                                      `attrs-all-${team.id}`,
                                      async () => {
                                        const result = await estimateTeamAttributes(team.id, false)
                                        setNotice(
                                          `${result.updated} de ${result.requested} jogadores refeitos por ${result.model}.`,
                                        )
                                      },
                                      "",
                                    )
                                  }
                                  className="text-[11px] text-gray-500"
                                >
                                  Refazer o elenco todo
                                </Button>
                              </div>

                              <div className="max-h-64 space-y-1 overflow-y-auto">
                                {players.map((player) => (
                                  <PlayerRow
                                    key={player.id}
                                    player={player}
                                    busy={busy}
                                    onEstimate={() =>
                                      void run(
                                        `attr-${player.id}`,
                                        () => estimatePlayerAttributes(player.id),
                                        `Atributos de ${player.name} estimados.`,
                                      )
                                    }
                                    onSave={(input) =>
                                      void run(
                                        `save-${player.id}`,
                                        () => updateCatalogPlayer(player.id, input),
                                        `${player.name} atualizado.`,
                                      )
                                    }
                                    onRemove={() =>
                                      void run(player.id, () => removeCatalogPlayer(player.id), "Jogador removido.")
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {leagues.length > 0 && competition.playerCount > 0 && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Download className="h-4 w-4 text-emerald-400" />
                          <h4 className="text-sm font-bold text-white">Mandar para uma liga de draft</h4>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={importLeagueId}
                            onChange={(event) => setImportLeagueId(event.target.value)}
                            className="h-9 flex-1 rounded-lg border border-white/10 bg-[#0b0b12] px-3 text-[13px] text-white outline-none"
                          >
                            <option value="">Escolha a liga</option>
                            {leagues.map((league) => (
                              <option key={league.id} value={league.id}>
                                {league.name}
                              </option>
                            ))}
                          </select>
                          <label className="flex cursor-pointer items-center gap-2">
                            <Switch checked={importReplace} onCheckedChange={setImportReplace} />
                            <span className="text-[11px] text-gray-400">Substituir o pool atual</span>
                          </label>
                          <Button
                            disabled={importing || !importLeagueId}
                            onClick={async () => {
                              setImporting(true)
                              setError("")
                              try {
                                const result = await importCatalogToLeague({
                                  leagueId: importLeagueId,
                                  competitionId: competition.id,
                                  replace: importReplace,
                                })
                                setNotice(`${result.imported} jogadores enviados, pool agora tem ${result.total}.`)
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Não foi possível enviar o pool.")
                              } finally {
                                setImporting(false)
                              }
                            }}
                            className="bg-emerald-500 text-black hover:bg-emerald-400"
                          >
                            {importing ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <Users className="mr-1.5 h-4 w-4" />
                            )}
                            Enviar pool
                          </Button>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          Só aparecem ligas que ainda não começaram o draft, porque depois disso o pool fica travado.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {importTeam && (
        <CatalogImportDialog
          open
          onOpenChange={(next) => !next && setImportTeam(null)}
          target="players"
          teamId={importTeam.id}
          teamName={importTeam.name}
          onImported={async (message) => {
            setNotice(message)
            setImportTeam(null)
            await refresh()
          }}
        />
      )}

      {importingTeams && (
        <CatalogImportDialog
          open
          onOpenChange={(next) => !next && setImportingTeams(null)}
          target="teams"
          competitionId={importingTeams.id}
          onImported={async (message) => {
            setNotice(message)
            setImportingTeams(null)
            await refresh()
          }}
        />
      )}
    </div>
  )
}
