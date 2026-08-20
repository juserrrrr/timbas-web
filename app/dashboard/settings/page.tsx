"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, Info, Code2, Coins, MessageSquare, Zap, Shield, Clock, ExternalLink } from "lucide-react"

import { getToken, decodeToken, clearToken, TokenPayload } from "@/lib/auth"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<TokenPayload | null>(null)

  useEffect(() => {
    const token = getToken()
    if (token) setUser(decodeToken(token))
  }, [])

  const handleLogout = () => {
    clearToken()
    router.push("/login")
  }

  if (!user) return null

  return (
    <div className="dashboard-view mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Preferências do dashboard</p>
      </div>

      {/* Funcionalidades */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Funcionalidades</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {[
            { icon: Shield,  label: "Ranking",         desc: "Classificação em tempo real do Timbas",            status: "Ativo" },
            { icon: Clock,   label: "Histórico",        desc: "Registro completo de todas as partidas",           status: "Ativo" },
            { icon: Zap,     label: "Estatísticas",     desc: "Win rate, streaks, duplas e desempenho semanal",   status: "Ativo" },
          ].map(({ icon: Icon, label, desc, status }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
              <Icon className="h-4 w-4 flex-shrink-0 text-gray-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-600">{desc}</p>
              </div>
              <span className="flex-shrink-0 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-400">
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Carteira da conta */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Carteira da conta</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-500">
            Aqui ficam as moedas da sua conta, ganhas em campeonatos. O dinheiro da liga de draft é outro: ele
            pertence à liga, paga salário e contratação lá dentro, e recomeça a cada draft.
          </p>
          <Link
            href="/dashboard/wallet"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/[0.12]"
          >
            <Coins className="h-3.5 w-3.5" />
            Abrir extrato da conta
          </Link>
        </div>
      </div>

      {/* Sobre o Timbas */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/10">
            <Info className="h-3.5 w-3.5 text-yellow-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Sobre o Timbas</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-500 leading-relaxed">
            O Timbas organiza partidas 5v5 competitivas com o nosso bot no Discord. Ranking, estatísticas detalhadas e histórico completo, tudo dentro do servidor.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#"
              className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Discord do servidor
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            <a
              href="#"
              className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Code2 className="h-3.5 w-3.5" />
              GitHub
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-700">
            <span>Timbas © 2025</span>
            <span>·</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Sair */}
      <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-red-500/10 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
            <LogOut className="h-3.5 w-3.5 text-red-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Encerrar Sessão</h2>
        </div>
        <div className="px-5 py-4">
          <p className="mb-4 text-sm text-gray-500">
            Você será desconectado e redirecionado para a página de login.
          </p>
          <button
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-600/80 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/20"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
