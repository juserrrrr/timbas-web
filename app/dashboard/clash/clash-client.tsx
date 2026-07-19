"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ShieldAlert, RefreshCw, Search, Zap, AlertCircle, UserSearch,
  Share2, Check, Copy, Radar, History, ChevronRight,
} from "lucide-react"
import { BetaBadge } from "@/components/ui/beta-badge"
import {
  startScout,
  retryScoutAi,
  getScoutJob,
  getScoutHistory,
  fetchSharedAnalysis,
  saveAnalysis,
  ScoutHistoryEntry,
  ScoutJob,
  ScoutResult,
} from "@/lib/services/clash"
import ClashResultsView from "./clash-results-view"

// Guarda o job em andamento para retomar o acompanhamento se o usuário
// sair da tela e voltar — a análise continua rodando no servidor.
const SCOUT_JOB_STORAGE_KEY = "timbas-clash-scout-job"
const POLL_INTERVAL_MS = 3500

// Etapas do pipeline de scout, na ordem em que o backend as reporta
const SCOUT_STEPS = [
  { key: "account", label: "Conta" },
  { key: "team", label: "Time" },
  { key: "players", label: "Jogadores" },
  { key: "ai", label: "Análise IA" },
] as const

function scoutStepIndex(stage?: string): number {
  const idx = SCOUT_STEPS.findIndex((s) => s.key === stage)
  if (idx >= 0) return idx
  return stage === "done" ? SCOUT_STEPS.length : -1
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return days === 1 ? "ontem" : `há ${days} dias`
}

function hasGeneratedAi(data: ScoutResult): boolean {
  const legacyFallback = /^(gemini|configure gemini_api_key)/i.test(data.strategy.trim())
  return data.aiGenerated === true
    || (data.aiGenerated === undefined && Boolean(data.strategy) && !legacyFallback)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ScoutSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[520px] rounded-2xl bg-white/[0.03]" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-white/[0.03]" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClashScoutClient({ token }: { token: string }) {
  const [input, setInput] = useState("")
  const [deep, setDeep] = useState(false)
  const [starting, setStarting] = useState(false)
  const [job, setJob] = useState<ScoutJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ScoutResult | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareId, setShareId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Relatório já salvo no servidor (auto-save da fila ou aberto do histórico)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [history, setHistory] = useState<ScoutHistoryEntry[]>([])
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [retryingAi, setRetryingAi] = useState(false)
  const [aiRetryError, setAiRetryError] = useState<string | null>(null)
  const requestVersionRef = useRef(0)
  const expectedJobIdRef = useRef<string | null>(null)

  const activeJobId = job && (job.status === "queued" || job.status === "running") ? job.id : null
  const loading = starting || activeJobId !== null

  // Parse ao vivo do Riot ID digitado — feedback antes de enviar
  const trimmedInput = input.trim()
  const sepIndex = trimmedInput.lastIndexOf("#")
  const parsedName = sepIndex > 0 ? trimmedInput.slice(0, sepIndex) : null
  const parsedTag = sepIndex > 0 && sepIndex < trimmedInput.length - 1 ? trimmedInput.slice(sepIndex + 1) : null
  const inputValid = Boolean(parsedName && parsedTag)

  // Histórico de relatórios gerados
  const refreshHistory = async () => {
    try {
      setHistory(await getScoutHistory(token))
    } catch {
      // histórico é secundário — falha silenciosa
    }
  }
  useEffect(() => {
    refreshHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Retoma um job em andamento salvo antes de sair da tela
  useEffect(() => {
    const saved = localStorage.getItem(SCOUT_JOB_STORAGE_KEY)
    if (!saved) return
    try {
      const { jobId, input: savedInput } = JSON.parse(saved)
      if (savedInput) setInput(savedInput)
      if (jobId) {
        expectedJobIdRef.current = jobId
        setJob({
          id: jobId,
          riotId: savedInput ?? "",
          status: "queued",
          queuePosition: 0,
          progress: { stage: "resume", message: "Reconectando à análise em andamento...", percent: 0 },
        })
      }
    } catch {
      localStorage.removeItem(SCOUT_JOB_STORAGE_KEY)
    }
  }, [])

  // Polling do job ativo — a fila roda no servidor, aqui só acompanhamos
  useEffect(() => {
    if (!activeJobId) return
    let cancelled = false

    const poll = async () => {
      try {
        const j = await getScoutJob(token, activeJobId)
        if (cancelled || expectedJobIdRef.current !== activeJobId) return
        if (!j) {
          localStorage.removeItem(SCOUT_JOB_STORAGE_KEY)
          expectedJobIdRef.current = null
          setJob(null)
          setError("A análise expirou ou o servidor foi reiniciado. Faça a busca novamente.")
          return
        }
        setJob(j)
        if (j.status === "done" && j.result) {
          localStorage.removeItem(SCOUT_JOB_STORAGE_KEY)
          expectedJobIdRef.current = null
          setData(j.result)
          setAnalysisId(j.analysisId ?? null)
          setJob(null)
          refreshHistory()
        } else if (j.status === "error") {
          localStorage.removeItem(SCOUT_JOB_STORAGE_KEY)
          expectedJobIdRef.current = null
          setError(j.error ?? "Erro ao buscar dados do time")
          setJob(null)
        }
      } catch {
        // erro de rede transitório — o próximo tick tenta de novo
      }
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [activeJobId, token])

  const handleScout = async () => {
    const trimmed = input.trim()
    const sep = trimmed.lastIndexOf("#")
    if (sep <= 0 || sep === trimmed.length - 1) {
      setError("Formato inválido. Use: NomeDoJogador#TAG")
      return
    }
    const gameName = trimmed.slice(0, sep)
    const tagLine = trimmed.slice(sep + 1)
    const requestedRiotId = `${gameName}#${tagLine}`.toLocaleLowerCase()
    const requestVersion = ++requestVersionRef.current
    expectedJobIdRef.current = null
    localStorage.removeItem(SCOUT_JOB_STORAGE_KEY)
    setJob(null)
    setStarting(true)
    setError(null)
    setData(null)
    setShareId(null)
    setAnalysisId(null)
    setAiRetryError(null)
    try {
      const j = await startScout(token, gameName, tagLine, deep)
      if (requestVersion !== requestVersionRef.current) return
      if (j.riotId.toLocaleLowerCase() !== requestedRiotId) {
        throw new Error(`O servidor respondeu com ${j.riotId}, mas a busca atual é ${gameName}#${tagLine}. Tente novamente.`)
      }
      if (j.status === "done" && j.result) {
        // resultado recente reaproveitado pelo servidor — mostra na hora
        setData(j.result)
        setAnalysisId(j.analysisId ?? null)
      } else if (j.status === "error") {
        setError(j.error ?? "Erro ao buscar dados do time")
      } else {
        expectedJobIdRef.current = j.id
        setJob(j)
        localStorage.setItem(SCOUT_JOB_STORAGE_KEY, JSON.stringify({ jobId: j.id, input: trimmed }))
      }
    } catch (e: any) {
      setError(e.message ?? "Erro ao buscar dados")
    } finally {
      setStarting(false)
    }
  }

  const handleShare = async () => {
    if (!data) return
    setSharing(true)
    try {
      // relatório já está salvo no servidor? reusa o link em vez de duplicar
      const id = analysisId ?? (await saveAnalysis(token, data)).id
      setShareId(id)
      setAnalysisId(id)
      const url = `${window.location.origin}/scout/${id}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // silently ignore clipboard errors — link still shows
    } finally {
      setSharing(false)
    }
  }

  const handleRetryAi = async () => {
    if (!data || retryingAi) return
    setRetryingAi(true)
    setAiRetryError(null)
    try {
      const ai = await retryScoutAi(token, data.players, data.teamProfile)
      if (!ai.aiGenerated) {
        setAiRetryError("O Gemini não respondeu após 3 tentativas. Tente novamente em alguns instantes.")
        return
      }
      setData({ ...data, ...ai })
      setAnalysisId(null)
      setShareId(null)
    } catch (e: any) {
      setAiRetryError(e.message ?? "Não foi possível tentar a IA novamente.")
    } finally {
      setRetryingAi(false)
    }
  }

  const openHistoryEntry = async (entry: ScoutHistoryEntry) => {
    setOpeningId(entry.id)
    setError(null)
    setAiRetryError(null)
    try {
      const { data: saved } = await fetchSharedAnalysis(entry.id)
      setData(saved)
      setAnalysisId(entry.id)
      setShareId(null)
    } catch {
      setError("Não foi possível abrir esse relatório. Tente gerar um novo.")
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="dashboard-view relative space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/10">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Clash <span className="text-amber-400">Scout</span>
            </h1>
            <BetaBadge className="text-[10px] px-2" />
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Digite o nick de qualquer jogador para ver o time, stats e análise de IA
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/dashboard/lol-profile"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-black text-sky-300 transition-all hover:border-sky-500/35 hover:bg-sky-500/15"
          >
            <UserSearch className="h-3.5 w-3.5" />
            Perfil individual
          </Link>
          {data && (
            <>
              {!hasGeneratedAi(data) && (
                <div className="flex flex-col items-stretch gap-1 sm:items-end">
                  <button
                    onClick={handleRetryAi}
                    disabled={retryingAi}
                    className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-300 transition-all hover:border-violet-500/40 hover:bg-violet-500/15 disabled:cursor-wait disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${retryingAi ? "animate-spin" : ""}`} />
                    {retryingAi ? "Tentando IA (até 3x)..." : "Tentar IA novamente"}
                  </button>
                  {aiRetryError && <p className="max-w-xs text-right text-[10px] text-red-400">{aiRetryError}</p>}
                </div>
              )}
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-all hover:border-emerald-500/35 hover:bg-emerald-500/15 disabled:opacity-50"
              >
                {sharing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {sharing ? "Salvando..." : copied ? "Link copiado!" : "Compartilhar"}
              </button>
              <button
                onClick={() => { requestVersionRef.current++; expectedJobIdRef.current = null; setData(null); setInput(""); setShareId(null); setAnalysisId(null); setAiRetryError(null); setJob(null); localStorage.removeItem(SCOUT_JOB_STORAGE_KEY) }}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-gray-400 transition-all hover:border-white/[0.15] hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Nova busca
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Busca (aquisição de alvo) ── */}
      {!data && !loading && (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07070c]/60 backdrop-blur-sm">
          {/* Radar de fundo — assinatura visual da tela */}
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-square w-[560px] flex-shrink-0 opacity-70">
              <div className="absolute inset-0 rounded-full border border-amber-500/[0.08]" />
              <div className="absolute inset-[16%] rounded-full border border-amber-500/[0.07]" />
              <div className="absolute inset-[33%] rounded-full border border-amber-500/[0.06]" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-amber-500/[0.05]" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-amber-500/[0.05]" />
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(245,158,11,0.10),transparent_30%)] animate-[spin_9s_linear_infinite]" />
            </div>
          </div>

          <div className="relative z-10 space-y-6 px-6 py-10 sm:px-10">
            <div className="space-y-1.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Reconhecimento inimigo</p>
              <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">Quem você vai enfrentar?</h2>
              <p className="text-xs text-gray-500">Digite o nick de um jogador e o time de Clash inteiro dele entra na mira</p>
            </div>

            <div className="mx-auto max-w-2xl space-y-2.5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleScout()}
                    placeholder="NomeDoJogador#BR1"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a12]/80 py-3.5 pl-11 pr-4 text-base font-bold text-white placeholder:font-normal placeholder:text-gray-600 transition-all duration-200 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10"
                  />
                </div>
                <button
                  onClick={handleScout}
                  disabled={loading || !input.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-black text-black transition-all duration-200 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none sm:w-auto"
                >
                  {starting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {starting ? "Enviando..." : "Iniciar Scout"}
                </button>
              </div>

              {/* Parse ao vivo do Riot ID */}
              <div className="flex min-h-[20px] flex-wrap items-center gap-1.5 px-1 text-[11px]">
                {inputValid ? (
                  <>
                    <Check className="h-3 w-3 text-amber-400" />
                    <span className="text-gray-500">Alvo travado:</span>
                    <span className="font-black text-white">{parsedName}</span>
                    <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-px font-black text-amber-400">#{parsedTag}</span>
                  </>
                ) : (
                  <span className="text-gray-600">
                    {trimmedInput ? "Falta a tag. O formato é Nick#TAG, tipo Faker#BR1" : "Pode ser qualquer jogador do servidor BR, tipo Faker#BR1"}
                  </span>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Modo de scout */}
            <div role="radiogroup" aria-label="Modo de scout" className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                role="radio"
                aria-checked={!deep}
                onClick={() => setDeep(false)}
                className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all duration-200 ${
                  !deep
                    ? "border-amber-500/40 bg-amber-500/[0.07] shadow-lg shadow-amber-500/10"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${!deep ? "border-amber-400" : "border-gray-700"}`}>
                      {!deep && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                    </span>
                    <Zap className={`h-4 w-4 ${!deep ? "text-amber-400" : "text-gray-600"}`} />
                    <span className={`text-sm font-black ${!deep ? "text-amber-300" : "text-gray-400"}`}>Scout Rápido</span>
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums ${!deep ? "text-amber-500" : "text-gray-600"}`}>~4–6 min</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">
                  Ranks, campeões, picks prováveis, bans e plano de jogo da IA.
                </p>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={deep}
                onClick={() => setDeep(true)}
                className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all duration-200 ${
                  deep
                    ? "border-sky-500/40 bg-sky-500/[0.07] shadow-lg shadow-sky-500/10"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${deep ? "border-sky-400" : "border-gray-700"}`}>
                      {deep && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
                    </span>
                    <Radar className={`h-4 w-4 ${deep ? "text-sky-400" : "text-gray-600"}`} />
                    <span className={`text-sm font-black ${deep ? "text-sky-300" : "text-gray-400"}`}>Deep Scout</span>
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums ${deep ? "text-sky-500" : "text-gray-600"}`}>~6–10 min</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">
                  Tudo do rápido + leitura de mapa: rota do jungler, ganks por jogo, zonas de morte e invades.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Histórico de relatórios ── */}
      {!data && !loading && history.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#07070c]/60 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-gray-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Relatórios recentes</p>
          </div>
          <div className="space-y-1.5">
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => openHistoryEntry(entry)}
                disabled={openingId !== null}
                className="group flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2.5 text-left transition-all duration-200 hover:border-amber-500/25 hover:bg-amber-500/[0.04] disabled:cursor-wait disabled:opacity-60"
              >
                <span className="text-sm font-black text-white transition-colors group-hover:text-amber-300">
                  {entry.teamName}
                </span>
                {entry.searchedRiotId && (
                  <span className="text-[11px] text-gray-500">via {entry.searchedRiotId}</span>
                )}
                {entry.deep && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-px text-[9px] font-black uppercase text-sky-400">
                    <Radar className="h-2.5 w-2.5" />
                    Deep
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2 text-[11px] text-gray-600">
                  {timeAgo(entry.createdAt)}
                  {openingId === entry.id
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    : <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400" />}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-gray-600">
            Abrir um relatório salvo é instantâneo e não gasta o limite da API da Riot.
          </p>
        </div>
      )}

      {/* ── Loading / progresso do job ── */}
      {loading && (() => {
        const stepIdx = scoutStepIndex(job?.progress?.stage)
        const percent = Math.max(0, Math.min(100, job?.progress?.percent ?? 0))
        return (
          <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] px-5 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>
                <p className="text-sm text-amber-400 font-semibold">
                  {job?.progress?.message ?? "Enviando solicitação..."}
                </p>
                {job?.status === "queued" && job.queuePosition > 0 && (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                    {job.queuePosition}º na fila
                  </span>
                )}
                {job?.deep && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold text-sky-300">
                    <Radar className="h-3 w-3" />
                    Deep Scout
                  </span>
                )}
              </div>

              {/* Etapas do pipeline */}
              <div className="flex flex-wrap gap-1.5">
                {SCOUT_STEPS.map((step, i) => (
                  <span
                    key={step.key}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-colors duration-300 ${
                      i < stepIdx
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-500"
                        : i === stepIdx
                          ? "border-amber-400/50 bg-amber-500/15 text-amber-300"
                          : "border-white/[0.06] bg-white/[0.02] text-gray-600"
                    }`}
                  >
                    {i < stepIdx && <Check className="h-2.5 w-2.5" />}
                    {step.label}
                    {step.key === "players" && job?.progress?.stage === "players" && job.progress.current && job.progress.total
                      ? ` ${job.progress.current}/${job.progress.total}`
                      : ""}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(2, percent)}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] font-black tabular-nums text-amber-400">{percent}%</span>
              </div>

              <p className="text-[11px] leading-relaxed text-gray-500">
                A análise roda numa fila no servidor, respeitando o limite da API da Riot, então nada fica de fora.
                Pode sair desta tela tranquilo: quando voltar, o acompanhamento continua de onde parou.
              </p>
            </div>
            <ScoutSkeleton />
          </div>
        )
      })()}

      {/* ── Share link banner ── */}
      {shareId && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-400">Análise salva! Compartilhe o link:</p>
            <p className="truncate text-xs text-gray-400 font-mono mt-0.5">{`${typeof window !== "undefined" ? window.location.origin : ""}/scout/${shareId}`}</p>
          </div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/scout/${shareId}`)
              setCopied(true)
              setTimeout(() => setCopied(false), 3000)
            }}
            className="flex-shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && data && <ClashResultsView data={data} />}
    </div>
  )
}
