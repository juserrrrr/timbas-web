"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Server, Info, Code2, MessageSquare, Zap, Shield, Clock, ExternalLink } from "lucide-react"
import { LoadingState } from "@/components/ui/loading-state"
import { getToken, decodeToken, clearToken, TokenPayload } from "@/lib/auth"
import { useServer, SERVERS } from "@/lib/server-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const router = useRouter()
  const { selectedServer, setSelectedServer } = useServer()
  const [user, setUser] = useState<TokenPayload | null>(null)

  useEffect(() => {
    const token = getToken()
    if (token) setUser(decodeToken(token))
  }, [])

  const handleLogout = () => {
    clearToken()
    router.push("/login")
  }

  if (!user) return <LoadingState />

  return (
    <div className="content-enter max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Preferências do dashboard</p>
      </div>

      {/* Servidor padrão */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <Server className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Servidor Padrão</h2>
            <p className="text-xs text-gray-600">Usado em todas as telas do dashboard</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <Select value={selectedServer} onValueChange={setSelectedServer}>
            <SelectTrigger className="h-9 w-full gap-1.5 rounded-lg border-white/[0.08] bg-white/[0.04] text-sm text-white focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/[0.08] bg-[#0d0d12] text-white shadow-xl backdrop-blur-xl">
              {SERVERS.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-sm focus:bg-white/[0.06] focus:text-white">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-gray-700">Esta preferência é salva por sessão.</p>
        </div>
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
            { icon: Shield,  label: "Ranking",         desc: "Classificação em tempo real por servidor",         status: "Ativo" },
            { icon: Clock,   label: "Histórico",        desc: "Registro completo de todas as partidas",           status: "Ativo" },
            { icon: Zap,     label: "Estatísticas",     desc: "Win rate, streaks, duplas e desempenho semanal",   status: "Ativo" },
            { icon: Server,  label: "Multi-servidor",   desc: "Dados isolados por servidor Discord",              status: "Ativo" },
          ].map(({ icon: Icon, label, desc, status }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3.5">
              <Icon className="h-4 w-4 flex-shrink-0 text-gray-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-600">{desc}</p>
              </div>
              <span className="rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-400">
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sobre o TimbasBot */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/10">
            <Info className="h-3.5 w-3.5 text-yellow-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Sobre o TimbasBot</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-500 leading-relaxed">
            TimbasBot é um bot de Discord para organizar partidas 5v5 competitivas. Ranking, estatísticas detalhadas e histórico completo — tudo dentro do servidor.
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
            <span>TimbasBot © 2025</span>
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
