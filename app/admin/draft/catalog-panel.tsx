"use client"

import { useCallback, useEffect, useState } from "react"
import { Database, Download, Loader2, Plus, Search, Sparkles, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { EmptyState, ErrorState, PageLoading, StatusPill } from "@/components/competitions/shared"
import { formatMoney } from "@/lib/money"
import { CatalogImportDialog } from "@/components/competitions/catalog-import-dialog"
import {
  ATTRIBUTE_KEYS,
  attributeLongLabels,
  attributeRow,
  attributeTone,
  hasAttributes,
} from "@/lib/attributes"
import {
  createBasePlayer,
  estimateMissingAttributes,
  estimatePlayerAttributes,
  importCatalogToLeague,
  listBasePlayers,
  removeCatalogPlayer,
  updateCatalogPlayer,
  type BasePlayer,
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
        <span className="hidden w-24 flex-shrink-0 text-right text-[10px] text-amber-400/80 sm:block">
          {formatMoney(player.price)}
        </span>
        <button
          onClick={() => (open ? setOpen(false) : startEditing())}
          className="min-w-0 flex-1 cursor-pointer truncate text-left text-white hover:text-sky-300"
        >
          {player.name}
          {player.team.name !== "Sem clube" && (
            <span className="ml-1.5 text-[10px] text-gray-600">{player.team.name}</span>
          )}
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
  const [name, setName] = useState("")
  const [position, setPosition] = useState("ATA")
  const [realTeam, setRealTeam] = useState("")

  const [importOpen, setImportOpen] = useState(false)
  const [importLeagueId, setImportLeagueId] = useState("")
  const [importReplace, setImportReplace] = useState(true)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      const [base, leagueList] = await Promise.all([
        listBasePlayers({ search: search.trim() || undefined, missingAttributes: onlyMissing }),
        listDraftLeagues().catch(() => []),
      ])
      setPlayers(base.players)
      setTotal(base.total)
      setWithAttributes(base.withAttributes)
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

      {players.length === 0 ? (
        <EmptyState
          icon={Database}
          title={search || onlyMissing ? "Nada com esse filtro" : "Base vazia"}
          description="Adicione jogadores um por um aí em cima, ou cole uma lista de uma vez pelo botão de colar."
        />
      ) : (
        <div className="space-y-1">
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
                void run(`save-${player.id}`, () => updateCatalogPlayer(player.id, input), `${player.name} atualizado.`)
              }
              onRemove={() =>
                void run(`del-${player.id}`, () => removeCatalogPlayer(player.id), `${player.name} removido.`)
              }
            />
          ))}
        </div>
      )}

      {leagues.length > 0 && total > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.05] p-3">
          <div className="mb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Mandar a base para uma liga</h4>
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
              disabled={busy !== "" || !importLeagueId}
              onClick={() =>
                void run(
                  "import",
                  async () => {
                    const result = await importCatalogToLeague({
                      leagueId: importLeagueId,
                      replace: importReplace,
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
          <p className="mt-2 text-[11px] text-gray-500">
            Só aparecem ligas que ainda não começaram o draft, porque depois disso o pool fica travado. Depois do
            draft, cada jogador fica no elenco de quem o escolheu.
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
