"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ShieldAlert, RefreshCw, Search, Zap, AlertCircle, UserSearch,
  Share2, Check, Copy, Brain,
} from "lucide-react"
import { BetaBadge } from "@/components/ui/beta-badge"
import {
  scout as fetchScout,
  saveAnalysis,
  ScoutResult,
} from "@/lib/services/clash"
import ClashResultsView from "./clash-results-view"

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ScoutResult | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareId, setShareId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleScout = async () => {
    const trimmed = input.trim()
    const sep = trimmed.lastIndexOf("#")
    if (sep <= 0 || sep === trimmed.length - 1) {
      setError("Formato inválido. Use: NomeDoJogador#TAG")
      return
    }
    const gameName = trimmed.slice(0, sep)
    const tagLine = trimmed.slice(sep + 1)
    setLoading(true)
    setError(null)
    setData(null)
    setShareId(null)
    try {
      setData(await fetchScout(token, gameName, tagLine))
    } catch (e: any) {
      setError(e.message ?? "Erro ao buscar dados")
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!data) return
    setSharing(true)
    try {
      const { id } = await saveAnalysis(token, data)
      setShareId(id)
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
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-all hover:border-emerald-500/35 hover:bg-emerald-500/15 disabled:opacity-50"
              >
                {sharing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {sharing ? "Salvando..." : copied ? "Link copiado!" : "Compartilhar"}
              </button>
              <button
                onClick={() => { setData(null); setInput(""); setShareId(null) }}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-gray-400 transition-all hover:border-white/[0.15] hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Nova busca
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Search form ── */}
      {!data && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#07070c]/60 backdrop-blur-sm p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleScout()}
                placeholder="NomeDoJogador#BR1"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-200"
              />
            </div>
            <button
              onClick={handleScout}
              disabled={loading || !input.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-black transition-all duration-200 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none sm:w-auto"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {loading ? "Buscando..." : "Scout"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-600">
            Qualquer jogador do servidor BR1 — o sistema encontrará o time de Clash automaticamente
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <p className="text-sm text-amber-400 font-semibold">
              Buscando dados do time — isso pode levar alguns segundos...
            </p>
          </div>
          <ScoutSkeleton />
        </div>
      )}

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
