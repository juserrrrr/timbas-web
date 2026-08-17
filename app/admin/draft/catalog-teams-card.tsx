"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, Plus, RefreshCw, Shield, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusPill, formatDateTime } from "@/components/competitions/shared"
import {
  SOURCE_LABELS,
  createCatalogTeam,
  createCompetition,
  listCatalogTeams,
  listCompetitions,
  removeCatalogTeam,
  removeCompetition,
  syncCompetition,
  type CatalogCompetition,
  type CatalogTeam,
} from "@/lib/services/catalog"

/// Times de uma competição, carregados só quando o admin abre a linha.
function TeamList({
  competitionId,
  busy,
  onRun,
}: {
  competitionId: string
  busy: string
  onRun: (key: string, action: () => Promise<unknown>, message: string) => Promise<void>
}) {
  const [teams, setTeams] = useState<CatalogTeam[]>([])
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
          <div key={team.id} className="flex items-center gap-2 rounded border border-white/[0.05] bg-white/[0.015] px-2 py-1">
            <span className="min-w-0 flex-1 truncate text-[12px] text-white">{team.name}</span>
            <span className="flex-shrink-0 text-[10px] text-gray-600">{team._count.players} jogadores</span>
            <span className="hidden flex-shrink-0 text-[10px] text-gray-700 sm:block">{SOURCE_LABELS[team.source]}</span>
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

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
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
        Toda a base mora dentro de uma competição e de um time. Aqui você cria a pasta, cria os clubes e manda atualizar
        os elencos pela origem de cada uma.
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
          {competitions.map((competition) => (
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
                  <span className="truncate text-[12px] font-bold">{competition.name}</span>
                  <span className="flex-shrink-0 font-mono text-[10px] text-gray-700">{competition.code}</span>
                </button>

                <StatusPill tone="neutral">{SOURCE_LABELS[competition.source]}</StatusPill>
                <span className="text-[10px] text-gray-600">
                  {competition.teamCount} times, {competition.playerCount} jogadores
                </span>

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
          ))}
        </div>
      )}
    </Card>
  )
}
