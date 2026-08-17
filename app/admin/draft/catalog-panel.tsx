"use client"

import { useCallback, useEffect, useState } from "react"
import { Database, Download, Loader2, Plus, RefreshCw, Search, Sparkles, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { EmptyState, ErrorState, PageLoading, StatusPill } from "@/components/competitions/shared"
import { formatMoney } from "@/lib/money"
import { OVERALL_TIERS, groupByTier, tierOf, type OverallTierId } from "@/lib/tiers"
import { CatalogImportDialog } from "@/components/competitions/catalog-import-dialog"
import { CatalogTeamsCard } from "./catalog-teams-card"
import { ATTRIBUTE_KEYS, attributeLongLabels, attributeRow, attributeTone, hasAttributes } from "@/lib/attributes"
import {
  createAiCompetition,
  createBasePlayer,
  createCompetition,
  estimateMissingAttributes,
  estimatePlayerAttributes,
  importCatalogToLeague,
  listBasePlayers,
  listCatalogTeams,
  listCompetitions,
  removeCatalogPlayer,
  syncAiSquads,
  syncCompetition,
  syncWikipediaSquads,
  updateCatalogPlayer,
  type BasePlayer,
  type CatalogCompetition,
  type CatalogTeam,
} from "@/lib/services/catalog"
import { listDraftLeagues } from "@/lib/services/draft"
import type { DraftLeagueSummary } from "@/lib/services/draft.types"

const POSITIONS = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PD", "PE", "ATA"]

/// Linha do jogador: nota, posição, atributos e, ao abrir, os campos para ajustar.
function PlayerRow({
  player,
  busy,
  onEstimate,
  onSave,
  onRemove,
}: {
  player: BasePlayer
  busy: string
  onEstimate: () => void
  onSave: (input: Record<string, number | string>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [club, setClub] = useState(player.team.name)
  const [position, setPosition] = useState(player.position)

  const labels = attributeLongLabels(player.position)
  const filled = hasAttributes(player)

  const startEditing = () => {
    setDraft(
      Object.fromEntries([
        ["overall", String(player.overall)],
        ...ATTRIBUTE_KEYS.map((key) => [key, player[key] === null ? "" : String(player[key])]),
      ]),
    )
    setClub(player.team.name)
    setPosition(player.position)
    setOpen(true)
  }

  const save = () => {
    const input: Record<string, number | string> = {}
    for (const key of ["overall", ...ATTRIBUTE_KEYS]) {
      const value = Number(draft[key])
      if (Number.isFinite(value) && value >= 1 && value <= 99) input[key] = Math.round(value)
    }
    if (position !== player.position) input.position = position
    if (club.trim() !== player.team.name) input.realTeam = club.trim()
    onSave(input)
    setOpen(false)
  }

  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-2 py-1.5">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-7 flex-shrink-0 text-center font-black text-gray-300">{player.overall}</span>
        <span className="w-9 flex-shrink-0 text-gray-600">{player.position}</span>
        <span className="hidden w-24 flex-shrink-0 text-right text-[10px] text-amber-400/80 sm:block">
          {formatMoney(player.price)}
        </span>
        <button
          onClick={() => (open ? setOpen(false) : startEditing())}
          className="min-w-0 flex-1 cursor-pointer truncate text-left text-white hover:text-sky-300"
        >
          {player.name}
          <span className={`ml-1.5 text-[10px] ${player.team.name === "Sem clube" ? "text-gray-700" : "text-sky-400/70"}`}>
            {player.team.name}
          </span>
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
          <span className="hidden flex-shrink-0 text-[10px] text-amber-500/70 sm:block">sem atributos</span>
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
          <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
            <label className="space-y-1">
              <span className="block text-[10px] uppercase tracking-wide text-gray-600">Clube</span>
              <input
                value={club}
                onChange={(event) => setClub(event.target.value)}
                placeholder="Sem clube"
                className="h-8 w-full rounded border border-white/10 bg-black/40 px-2 text-[12px] text-white outline-none focus:border-sky-500/50"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] uppercase tracking-wide text-gray-600">Posição</span>
              <select
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                className="h-8 w-full rounded border border-white/10 bg-[#0b0b12] px-2 text-[12px] text-white outline-none focus:border-sky-500/50"
              >
                {POSITIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <span className="self-end pb-1.5 text-[10px] text-gray-600">{player.team.competition.name}</span>
          </div>

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
  const [players, setPlayers] = useState<BasePlayer[]>([])
  const [total, setTotal] = useState(0)
  const [withAttributes, setWithAttributes] = useState(0)
  const [leagues, setLeagues] = useState<DraftLeagueSummary[]>([])

  const [search, setSearch] = useState("")
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [tier, setTier] = useState<OverallTierId | "">("")
  const [name, setName] = useState("")
  const [position, setPosition] = useState("ATA")
  const [realTeam, setRealTeam] = useState("")

  const [importOpen, setImportOpen] = useState(false)
  const [apiOpen, setApiOpen] = useState(false)
  const [apiSource, setApiSource] = useState<"FOOTBALL_DATA" | "GENERIC" | "WIKIPEDIA" | "AI">("FOOTBALL_DATA")
  const [apiCode, setApiCode] = useState("BSA")
  const [apiName, setApiName] = useState("Brasileirão Série A")
  const [apiUrl, setApiUrl] = useState("")
  const [wikipediaTeams, setWikipediaTeams] = useState("")
  const [aiTeams, setAiTeams] = useState("")
  const [aiDate, setAiDate] = useState(new Date().toISOString().slice(0, 10))
  const [aiMode, setAiMode] = useState<"TEAMS" | "COMPETITION">("TEAMS")
  const [aiCompetition, setAiCompetition] = useState("")
  const [footballDataReady, setFootballDataReady] = useState(false)
  const [importLeagueId, setImportLeagueId] = useState("")
  const [importReplace, setImportReplace] = useState(true)
  const [competitions, setCompetitions] = useState<CatalogCompetition[]>([])
  const [poolCompetitionId, setPoolCompetitionId] = useState("")
  const [poolTeams, setPoolTeams] = useState<CatalogTeam[]>([])
  const [poolTeamIds, setPoolTeamIds] = useState<string[]>([])
  const [poolMinOverall, setPoolMinOverall] = useState("")

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      const [base, leagueList, catalog] = await Promise.all([
        listBasePlayers({ search: search.trim() || undefined, missingAttributes: onlyMissing }),
        listDraftLeagues().catch(() => []),
        listCompetitions().catch(() => ({ items: [], footballDataReady: false })),
      ])
      setPlayers(base.players)
      setTotal(base.total)
      setWithAttributes(base.withAttributes)
      setFootballDataReady(catalog.footballDataReady)
      setCompetitions(catalog.items)
      setLeagues(leagueList.filter((league) => league.status === "SETUP"))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a base")
    } finally {
      setLoading(false)
    }
  }, [search, onlyMissing])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300)
    return () => clearTimeout(timer)
  }, [load])

  // Escolher a competição do pool troca a lista de times que dá para marcar.
  useEffect(() => {
    setPoolTeamIds([])
    if (!poolCompetitionId) {
      setPoolTeams([])
      return
    }
    void listCatalogTeams(poolCompetitionId)
      .then(setPoolTeams)
      .catch(() => setPoolTeams([]))
  }, [poolCompetitionId])

  if (loading) return <PageLoading />
  if (error && players.length === 0 && total === 0) return <ErrorState message={error} retry={() => void load()} />

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key)
    setError("")
    try {
      await action()
      if (message) setNotice(message)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  const missing = total - withAttributes

  // A base cresce rápido e vira uma lista sem relevo. Separada em faixas de dez
  // dá para ver quantos craques existem e onde falta gente.
  const tierCounts = OVERALL_TIERS.map((option) => ({
    ...option,
    count: players.filter((player) => tierOf(player.overall).id === option.id).length,
  })).filter((option) => option.count > 0)
  const groups = groupByTier(tier ? players.filter((player) => tierOf(player.overall).id === tier) : players)

  return (
    <div className="space-y-5">
      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-1 flex items-center gap-2">
          <Database className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-black text-white">Base de jogadores</h3>
        </div>
        <p className="mb-4 text-[11px] leading-snug text-gray-500">
          Uma base só, e ela serve para os dois modos. Liga <span className="text-gray-300">real</span> precisa só do
          nome e da posição, porque quem joga é você no EA FC. Liga <span className="text-gray-300">simulada</span>{" "}
          precisa dos atributos, que a IA estima e você ajusta.
        </p>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do jogador"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || name.trim().length < 2) return
              void run(
                "add",
                () => createBasePlayer({ name: name.trim(), position, realTeam: realTeam.trim() || undefined }),
                `${name.trim()} entrou na base.`,
              ).then(() => setName(""))
            }}
            className="border-white/10 bg-white/[0.03]"
          />
          <select
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className="h-9 rounded-lg border border-white/10 bg-[#0b0b12] px-3 text-[13px] text-white outline-none"
          >
            {POSITIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Input
            value={realTeam}
            onChange={(event) => setRealTeam(event.target.value)}
            placeholder="Clube (opcional)"
            className="w-40 border-white/10 bg-white/[0.03]"
          />
          <Button
            disabled={busy !== "" || name.trim().length < 2}
            onClick={() =>
              void run(
                "add",
                () => createBasePlayer({ name: name.trim(), position, realTeam: realTeam.trim() || undefined }),
                `${name.trim()} entrou na base.`,
              ).then(() => setName(""))
            }
            className="bg-sky-500 text-black hover:bg-sky-400"
          >
            {busy === "add" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            Adicionar
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill tone="neutral">{total} na base</StatusPill>
          <StatusPill tone={missing === 0 ? "done" : "warn"}>
            {withAttributes} com atributos
            {missing > 0 ? `, ${missing} sem` : ""}
          </StatusPill>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-7 text-[11px]">
            Colar lista ou foto
          </Button>
          <Button variant="outline" size="sm" onClick={() => setApiOpen(!apiOpen)} className="h-7 text-[11px]">
            Trazer de uma API
          </Button>
          {missing > 0 && (
            <Button
              size="sm"
              disabled={busy !== ""}
              onClick={() =>
                void run(
                  "estimate",
                  async () => {
                    const result = await estimateMissingAttributes(24)
                    setNotice(`${result.updated} jogadores estimados por ${result.model}.`)
                  },
                  "",
                )
              }
              className="h-7 bg-violet-500 px-2 text-[11px] text-white hover:bg-violet-400"
            >
              {busy === "estimate" ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3 w-3" />
              )}
              Estimar quem falta
            </Button>
          )}
        </div>
      </Card>

      {apiOpen && (
        <Card className="border-sky-500/20 bg-sky-500/[0.04] p-4">
          <h4 className="mb-1 text-sm font-bold text-white">Trazer elencos de uma API</h4>
          <p className="mb-3 text-[11px] leading-snug text-gray-500">
            Os jogadores chegam com nome, posição, nacionalidade e nascimento. Só a IA traz atributo e valor junto; nas
            outras origens eles são estimados aqui depois, e só a liga simulada precisa deles.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  id: "FOOTBALL_DATA" as const,
                  title: "football-data.org",
                  hint: footballDataReady
                    ? "Elencos oficiais por competição. Informe o código, por exemplo BSA."
                    : "Falta a variável FOOTBALL_DATA_TOKEN no servidor.",
                },
                {
                  id: "GENERIC" as const,
                  title: "URL própria",
                  hint: "Qualquer endereço que devolva JSON com times e seus jogadores.",
                },
                {
                  id: "WIKIPEDIA" as const,
                  title: "Wikipedia",
                  hint: "Cole uma lista de clubes e buscamos o elenco principal atual de cada um.",
                },
                {
                  id: "AI" as const,
                  title: "Perguntar para a IA",
                  hint: "A IA lista o elenco de memória, numa data que você escolhe. Confira antes de usar.",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => setApiSource(option.id)}
                className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                  apiSource === option.id
                    ? "border-sky-500/40 bg-sky-500/[0.08]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <span className={`block text-sm font-bold ${apiSource === option.id ? "text-sky-300" : "text-white"}`}>
                  {option.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="api-name">Nome da origem</Label>
              <Input
                id="api-name"
                value={apiName}
                onChange={(event) => setApiName(event.target.value)}
                className="border-white/10 bg-white/[0.03]"
              />
            </div>
            {apiSource === "AI" ? (
              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_170px]">
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: "TEAMS" as const, label: "Clubes que eu listar" },
                        { id: "COMPETITION" as const, label: "Uma liga inteira" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setAiMode(option.id)}
                        className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
                          aiMode === option.id
                            ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                            : "border-white/10 text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {aiMode === "COMPETITION" ? (
                    <>
                      <Label htmlFor="ai-competition">Nome da liga</Label>
                      <Input
                        id="ai-competition"
                        value={aiCompetition}
                        onChange={(event) => setAiCompetition(event.target.value)}
                        placeholder="Brasileirão Série A"
                        className="border-white/10 bg-white/[0.03]"
                      />
                      <p className="pt-1 text-[11px] leading-snug text-gray-500">
                        Isso cria a liga com todos os clubes. Os elencos vêm depois, no botão de preencher da
                        competição, em lotes curtos.
                      </p>
                    </>
                  ) : (
                    <>
                      <Label htmlFor="ai-teams">Times, um por linha</Label>
                      <textarea
                        id="ai-teams"
                        value={aiTeams}
                        onChange={(event) => setAiTeams(event.target.value)}
                        placeholder={"Flamengo\nPalmeiras\nReal Madrid"}
                        className="min-h-24 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white outline-none focus:border-sky-500/50"
                      />
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-date">Elenco na data</Label>
                  <Input
                    id="ai-date"
                    type="date"
                    value={aiDate}
                    onChange={(event) => setAiDate(event.target.value)}
                    className="border-white/10 bg-white/[0.03] text-[12px]"
                  />
                  <p className="text-[11px] leading-snug text-gray-500">
                    Os elencos vêm de 12 em 12 clubes, com camisa, ficha, os seis atributos e o valor de mercado. Quem
                    está emprestado ou ainda é da base fica de fora, e o modelo avisa se a data passa do que ele
                    conhece.
                  </p>
                </div>
              </div>
            ) : apiSource === "WIKIPEDIA" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wikipedia-teams">Times, um por linha</Label>
                <textarea
                  id="wikipedia-teams"
                  value={wikipediaTeams}
                  onChange={(event) => setWikipediaTeams(event.target.value)}
                  placeholder={"Flamengo\nPalmeiras\nReal Madrid"}
                  className="min-h-28 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white outline-none focus:border-sky-500/50"
                />
                <p className="text-[11px] text-gray-500">A busca usa a Wikipedia em inglês e importa todos os jogadores encontrados no elenco principal.</p>
              </div>
            ) : apiSource === "FOOTBALL_DATA" ? (
              <div className="space-y-1.5">
                <Label htmlFor="api-code">Código da competição</Label>
                <Input
                  id="api-code"
                  value={apiCode}
                  onChange={(event) => setApiCode(event.target.value.toUpperCase())}
                  placeholder="BSA"
                  className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="api-url">URL do JSON</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="https://exemplo.com/elencos.json"
                  className="border-white/10 bg-white/[0.03] text-[12px]"
                />
              </div>
            )}
          </div>

          <Button
            disabled={
              busy !== "" ||
              (apiSource === "AI"
                ? aiMode === "COMPETITION"
                  ? aiCompetition.trim().length < 3
                  : !aiTeams.split("\n").some((team) => team.trim().length >= 2)
                : apiSource === "WIKIPEDIA"
                  ? !wikipediaTeams.split("\n").some((team) => team.trim().length >= 2)
                  : apiName.trim().length < 3 || (apiSource === "GENERIC" && !apiUrl.trim()))
            }
            onClick={() =>
              void run(
                "api",
                async () => {
                  if (apiSource === "AI" && aiMode === "COMPETITION") {
                    const result = await createAiCompetition({
                      name: aiCompetition.trim(),
                      referenceDate: aiDate,
                    })
                    setNotice(
                      `${result.competition.name}: ${result.teams.length} clubes` +
                        (result.season ? ` da temporada ${result.season}` : "") +
                        `. Use "Preencher elencos" ali embaixo para trazer os jogadores.` +
                        (result.beyondKnowledge ? ` A IA avisou: ${result.notes || "temporada anterior à data pedida"}.` : ""),
                    )
                    return
                  }
                  if (apiSource === "AI") {
                    const result = await syncAiSquads({
                      teams: aiTeams
                        .split("\n")
                        .map((team) => team.trim())
                        .filter(Boolean),
                      referenceDate: aiDate,
                    })
                    const outdated = result.squads.filter((squad) => squad.beyondKnowledge).map((squad) => squad.team)
                    setNotice(
                      `${result.players} jogadores vieram da IA (${result.squads[0]?.model ?? "modelo"}).` +
                        (outdated.length ? ` Elenco possivelmente defasado: ${outdated.join(", ")}.` : "") +
                        (result.failures.length ? ` ${result.failures.length} time(s) não vieram.` : ""),
                    )
                    return
                  }
                  if (apiSource === "WIKIPEDIA") {
                    const result = await syncWikipediaSquads(
                      wikipediaTeams
                        .split("\n")
                        .map((team) => team.trim())
                        .filter(Boolean),
                    )
                    setNotice(
                      `${result.players} jogadores vieram da Wikipedia.${result.failures.length ? ` ${result.failures.length} time(s) precisaram de ajuste.` : ""}`,
                    )
                    return
                  }
                  const competition = await createCompetition({
                    code: apiSource === "FOOTBALL_DATA" ? apiCode.trim() : `URL${Date.now().toString().slice(-6)}`,
                    name: apiName.trim(),
                    source: apiSource,
                    sourcePath: apiSource === "GENERIC" ? apiUrl.trim() : null,
                  })
                  const result = await syncCompetition(competition.id)
                  setNotice(`${result.players} jogadores vieram de ${apiName.trim()}.`)
                },
                "",
              ).then(() => setApiOpen(false))
            }
            className="mt-3 w-full bg-sky-500 text-black hover:bg-sky-400"
          >
            {busy === "api" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Buscar e trazer para a base
          </Button>
        </Card>
      )}

      <CatalogTeamsCard onChanged={() => void load()} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar na base"
            className="border-white/10 bg-white/[0.03] pl-9"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <Switch checked={onlyMissing} onCheckedChange={setOnlyMissing} />
          <span className="text-[11px] text-gray-400">Só quem está sem atributos</span>
        </label>
      </div>

      {tierCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTier("")}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              tier === ""
                ? "border-white/20 bg-white/[0.08] text-white"
                : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
            }`}
          >
            Todos os níveis
          </button>
          {tierCounts.map((option) => (
            <button
              key={option.id}
              onClick={() => setTier(tier === option.id ? "" : option.id)}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                tier === option.id ? option.chip : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
              }`}
            >
              {option.short}
              <span className="ml-1.5 text-[10px] font-black opacity-60">{option.count}</span>
            </button>
          ))}
        </div>
      )}

      {players.length === 0 ? (
        <EmptyState
          icon={Database}
          title={search || onlyMissing ? "Nada com esse filtro" : "Base vazia"}
          description="Adicione jogadores um por um aí em cima, ou cole uma lista de uma vez pelo botão de colar."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.tier.id}>
              <div className="mb-1.5 flex items-center gap-2">
                <h4 className={`text-xs font-black uppercase tracking-wide ${group.tier.tone}`}>{group.tier.label}</h4>
                <span className="text-[11px] font-bold text-gray-600">{group.tier.short}</span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[11px] text-gray-600">{group.players.length}</span>
              </div>

              <div className="space-y-1">
                {group.players.map((player) => (
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
                      void run(`del-${player.id}`, () => removeCatalogPlayer(player.id), `${player.name} removido.`)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {leagues.length > 0 && total > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.05] p-3">
          <div className="mb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Mandar a base para uma liga</h4>
          </div>
          <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
            <select
              value={importLeagueId}
              onChange={(event) => setImportLeagueId(event.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-[#0b0b12] px-3 text-[13px] text-white outline-none"
            >
              <option value="">Escolha a liga</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
            <select
              value={poolCompetitionId}
              onChange={(event) => setPoolCompetitionId(event.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-[#0b0b12] px-3 text-[13px] text-white outline-none"
            >
              <option value="">De onde: a base inteira</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name} ({competition.playerCount})
                </option>
              ))}
            </select>
            <Input
              value={poolMinOverall}
              onChange={(event) => setPoolMinOverall(event.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="Overall min"
              className="border-white/10 bg-white/[0.03] text-[12px]"
            />
          </div>

          {poolTeams.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {poolTeams.map((team) => {
                const picked = poolTeamIds.includes(team.id)
                return (
                  <button
                    key={team.id}
                    onClick={() =>
                      setPoolTeamIds(
                        picked ? poolTeamIds.filter((id) => id !== team.id) : [...poolTeamIds, team.id],
                      )
                    }
                    className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                      picked
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-white/10 text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {team.name}
                    <span className="ml-1 text-[10px] text-gray-600">{team._count.players}</span>
                  </button>
                )
              })}
              <span className="self-center text-[11px] text-gray-600">
                {poolTeamIds.length === 0 ? "nenhum time marcado, vai a competição toda" : `${poolTeamIds.length} marcados`}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={importReplace} onCheckedChange={setImportReplace} />
              <span className="text-[11px] text-gray-400">Substituir o pool atual</span>
            </label>
            <Button
              disabled={busy !== "" || !importLeagueId}
              onClick={() =>
                void run(
                  "import",
                  async () => {
                    const result = await importCatalogToLeague({
                      leagueId: importLeagueId,
                      replace: importReplace,
                      competitionId: poolCompetitionId || undefined,
                      teamIds: poolTeamIds.length > 0 ? poolTeamIds : undefined,
                      minOverall: Number(poolMinOverall) >= 1 ? Number(poolMinOverall) : undefined,
                    })
                    setNotice(`${result.imported} jogadores enviados, pool agora tem ${result.total}.`)
                  },
                  "",
                )
              }
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {busy === "import" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-1.5 h-4 w-4" />
              )}
              Enviar pool
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-gray-500">
            Sem escolher competição vai a base inteira. Escolhendo uma, dá para marcar só os clubes que você quer no
            pool, e o overall mínimo corta a reserva. Só aparecem ligas que ainda não começaram o draft, porque depois
            disso o pool fica travado e cada jogador fica no elenco de quem o escolheu.
          </p>
        </Card>
      )}

      {importOpen && (
        <CatalogImportDialog
          open
          onOpenChange={(next) => !next && setImportOpen(false)}
          target="players"
          onImported={async (message) => {
            setNotice(message)
            setImportOpen(false)
            await load()
          }}
        />
      )}
    </div>
  )
}
