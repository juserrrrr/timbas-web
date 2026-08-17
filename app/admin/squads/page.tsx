"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Camera,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
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
  CompetitionHeader,
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import {
  createCatalogTeam,
  createCompetition,
  importCatalogToLeague,
  listCatalogPlayers,
  listCatalogTeams,
  listCompetitions,
  removeCatalogPlayer,
  removeCatalogTeam,
  removeCompetition,
  SOURCE_LABELS,
  syncCompetition,
  type CatalogCompetition,
  type CatalogPlayer,
  type CatalogSource,
  type CatalogTeam,
} from "@/lib/services/catalog"
import { listDraftLeagues } from "@/lib/services/draft"
import type { DraftLeagueSummary } from "@/lib/services/draft.types"
import { SquadImageImport } from "./squad-image-import"

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

export default function SquadsCatalogPage() {
  const [competitions, setCompetitions] = useState<CatalogCompetition[]>([])
  const [footballDataReady, setFootballDataReady] = useState(false)
  const [selected, setSelected] = useState<CatalogCompetition | null>(null)
  const [teams, setTeams] = useState<CatalogTeam[]>([])
  const [openTeam, setOpenTeam] = useState<CatalogTeam | null>(null)
  const [imageTeam, setImageTeam] = useState<CatalogTeam | null>(null)
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

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key)
    setError("")
    try {
      await action()
      setNotice(message)
      await load()
      if (selected) setTeams(await listCatalogTeams(selected.id))
      if (openTeam) setPlayers(await listCatalogPlayers(openTeam.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="space-y-6">
      <CompetitionHeader
        eyebrow="Administração"
        title="Base de jogadores"
        subtitle="Sincronize elencos de uma API pública, complete na mão ou por foto, e mande tudo para uma liga de draft."
        icon={Database}
        accent="text-sky-400"
        accentBg="bg-sky-500/10 border-sky-500/20"
      />

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
                              onClick={() => setImageTeam(team)}
                              aria-label={`Importar elenco de ${team.name} por foto`}
                              className="cursor-pointer rounded p-1.5 text-gray-600 hover:text-violet-400"
                            >
                              <Camera className="h-3.5 w-3.5" />
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
                            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto border-t border-white/[0.06] pt-2">
                              {players.map((player) => (
                                <div key={player.id} className="flex items-center gap-2 text-[11px]">
                                  <span className="w-8 flex-shrink-0 font-black text-gray-400">{player.overall}</span>
                                  <span className="w-10 flex-shrink-0 text-gray-600">{player.position}</span>
                                  <span className={`min-w-0 flex-1 truncate ${player.active ? "text-white" : "text-gray-600 line-through"}`}>
                                    {player.name}
                                  </span>
                                  <button
                                    onClick={() =>
                                      void run(player.id, () => removeCatalogPlayer(player.id), "Jogador removido.")
                                    }
                                    aria-label={`Remover ${player.name}`}
                                    className="cursor-pointer text-gray-700 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
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

      {imageTeam && (
        <SquadImageImport
          open
          onOpenChange={(next) => !next && setImageTeam(null)}
          teamId={imageTeam.id}
          teamName={imageTeam.name}
          onImported={async (message) => {
            setNotice(message)
            setImageTeam(null)
            await load()
            if (selected) setTeams(await listCatalogTeams(selected.id))
            if (openTeam) setPlayers(await listCatalogPlayers(openTeam.id))
          }}
        />
      )}
    </div>
  )
}
