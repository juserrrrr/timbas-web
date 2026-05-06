"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Shield, CheckCircle2, AlertCircle, RefreshCw,
  Clock, ChevronRight, ShieldAlert, Link2, Unlink, ShieldCheck
} from "lucide-react"
import {
  getVerifyStatus, startVerification, confirmVerification, unlinkAccount
} from "@/lib/services/clash"

type Step = "status" | "form" | "pending" | "success"

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      setRemaining(Math.max(0, diff))
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  const pct = remaining / (10 * 60 * 1000)
  const expired = remaining === 0

  return (
    <div className="flex items-center gap-3">
      <Clock className={`h-4 w-4 flex-shrink-0 ${expired ? "text-red-400" : "text-amber-400"}`} />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Tempo restante</span>
          <span className={`font-mono font-bold tabular-nums ${expired ? "text-red-400" : "text-amber-400"}`}>
            {expired ? "EXPIRADO" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              expired ? "bg-red-500" : pct > 0.5 ? "bg-amber-400" : pct > 0.2 ? "bg-orange-400" : "bg-red-500"
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function VerifyClient({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("status")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [verified, setVerified] = useState(false)
  const [linkedRiotId, setLinkedRiotId] = useState<string | null>(null)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)

  const [riotId, setRiotId] = useState("")

  const [pendingId, setPendingId] = useState<string | null>(null)
  const [targetIconId, setTargetIconId] = useState<number | null>(null)
  const [targetIconUrl, setTargetIconUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const [successRiotId, setSuccessRiotId] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const st = await getVerifyStatus(token)
      if (st.verified && st.riotId) {
        setVerified(true)
        setLinkedRiotId(st.riotId)
        setVerifiedAt(st.verifiedAt ?? null)
      } else {
        setVerified(false)
        setLinkedRiotId(null)
      }
    } catch {
      // silently fall through to show form
    } finally {
      setLoading(false)
      setStep("status")
    }
  }, [token])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleStart = async () => {
    if (!riotId.trim() || !riotId.includes("#")) {
      setError("Digite o Riot ID no formato Nome#TAG")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await startVerification(token, riotId.trim())
      setPendingId(res.pendingId)
      setTargetIconId(res.targetIconId)
      setTargetIconUrl(res.iconUrl)
      setExpiresAt(res.expiresAt)
      setStep("pending")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!pendingId) return
    setLoading(true)
    setError(null)
    try {
      const res = await confirmVerification(token, pendingId)
      setSuccessRiotId(res.riotId)
      setStep("success")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlink = async () => {
    if (!confirm("Tem certeza que deseja desvincular sua conta LoL?")) return
    setLoading(true)
    setError(null)
    try {
      await unlinkAccount(token)
      setVerified(false)
      setLinkedRiotId(null)
      setVerifiedAt(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && step === "status") {
    return (
      <div className="max-w-lg space-y-4 animate-pulse">
        <div className="h-8 rounded-xl bg-white/[0.04] w-56" />
        <div className="h-48 rounded-2xl bg-white/[0.04]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-lg">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Verificar Conta LoL</h1>
        </div>
        <p className="text-sm text-gray-500 ml-11">
          Vincule sua conta do League of Legends ao Timbas para acessar funcionalidades exclusivas
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* VERIFIED */}
      {step === "status" && verified && linkedRiotId && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-black text-white">Conta Verificada</p>
                <p className="text-sm text-emerald-400">{linkedRiotId}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-center gap-3">
              <Link2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Conta vinculada</p>
                <p className="font-bold text-white truncate">{linkedRiotId}</p>
              </div>
              {verifiedAt && (
                <p className="text-xs text-gray-600 flex-shrink-0">
                  {new Date(verifiedAt).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>

            <button
              onClick={handleUnlink}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
            >
              <Unlink className="h-4 w-4" />
              Desvincular conta
            </button>
          </div>

          {/* Feature shortcuts */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Funcionalidades disponíveis</p>
            <Link
              href="/dashboard/clash"
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04] group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Clash Scout</p>
                <p className="text-xs text-gray-500">Analise o time adversário no Clash</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* NOT VERIFIED — form */}
      {step === "status" && !loading && !verified && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Como funciona</p>
            {[
              { n: "1", label: "Digite seu Riot ID", desc: "No formato Nome#TAG (ex: Gabriel#BR1)" },
              { n: "2", label: "Equipe o ícone indicado", desc: "Abra o LoL e troque seu ícone de perfil" },
              { n: "3", label: "Confirme a verificação", desc: "Clique em confirmar — pronto!" },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400">
                  {s.n}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d14] p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Riot ID
              </label>
              <input
                type="text"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="Seu nome#TAG"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <button
              onClick={handleStart}
              disabled={loading || !riotId.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-black transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {loading ? "Iniciando..." : "Iniciar Verificação"}
              {!loading && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* PENDING */}
      {step === "pending" && targetIconUrl && targetIconId !== null && expiresAt && (
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.05] to-transparent p-6 space-y-5">
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-sm font-bold text-white">Equipe este ícone no cliente do LoL</p>
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-amber-400/60 shadow-[0_0_32px_rgba(245,158,11,0.3)] animate-pulse">
                <Image
                  src={targetIconUrl}
                  alt={`Ícone ${targetIconId}`}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0a0e1a] bg-amber-500 text-xs font-black text-black">
                #{targetIconId}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center max-w-[240px]">
              Vá ao cliente do LoL → Perfil → troque para o ícone #{targetIconId} → volte aqui
            </p>
          </div>

          <CountdownTimer expiresAt={expiresAt} />

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-black transition-all hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {loading ? "Verificando..." : "Já equipeI — Confirmar"}
            </button>
            <button
              onClick={() => { setStep("status"); setError(null) }}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-sm font-semibold text-gray-400 transition-all hover:text-white hover:border-white/20 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {step === "success" && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-8 text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">Verificado!</p>
            <p className="text-sm text-emerald-400 mt-1">{successRiotId}</p>
            <p className="text-xs text-gray-500 mt-2">
              Sua conta do LoL foi vinculada com sucesso ao Timbas
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/clash"
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-black transition-all hover:bg-amber-400"
            >
              <ShieldAlert className="h-4 w-4" />
              Clash Scout
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-semibold text-gray-400 transition-all hover:text-white hover:border-white/20"
            >
              Ir ao Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
