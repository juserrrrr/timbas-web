import { LoginForm } from "@/components/login-form"
import Image from "next/image"
import Link from "next/link"
import { Trophy, BarChart3, Swords, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-[#050508] text-white overflow-hidden">
      {/* Background — igual à landing */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff07_1px,_transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute -top-64 left-1/4 h-[700px] w-[700px] rounded-full bg-blue-700 opacity-[0.12] blur-[120px]" />
        <div className="absolute top-1/2 -right-48 h-[600px] w-[600px] rounded-full bg-red-700 opacity-[0.10] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-indigo-800 opacity-[0.07] blur-[100px]" />
      </div>

      {/* Back */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-20">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_420px] gap-8 items-center">

          {/* ── Left — brand panel ── */}
          <div className="hidden lg:flex flex-col h-full justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
                <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={40} height={40} className="object-cover" />
              </div>
              <span className="text-xl font-black tracking-tight">
                Timbas<span className="text-blue-400">Bot</span>
              </span>
            </div>

            {/* Headline */}
            <div className="flex-1">
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-black leading-[1.05] tracking-tight mb-5">
                Acompanhe cada<br />
                <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-red-400 bg-clip-text text-transparent">
                  partida, stat e rank
                </span>
              </h1>
              <p className="text-gray-500 mb-10 max-w-sm leading-relaxed">
                Dashboard completo para tudo que acontece nas suas partidas 5v5 — conectado direto ao seu Discord.
              </p>

              {/* Feature items */}
              <div className="space-y-3 mb-12">
                {[
                  {
                    icon: Trophy,
                    label: "Ranking em tempo real",
                    desc: "Veja quem lidera o servidor agora",
                    iconBg: "bg-yellow-500/10",
                    iconColor: "text-yellow-400",
                    border: "border-yellow-500/15",
                  },
                  {
                    icon: BarChart3,
                    label: "Estatísticas detalhadas",
                    desc: "Win rate, streaks, duplas e histórico completo",
                    iconBg: "bg-blue-500/10",
                    iconColor: "text-blue-400",
                    border: "border-blue-500/15",
                  },
                  {
                    icon: Swords,
                    label: "Histórico de partidas",
                    desc: "Reveja cada jogo — times, resultado, lado",
                    iconBg: "bg-red-500/10",
                    iconColor: "text-red-400",
                    border: "border-red-500/15",
                  },
                ].map(({ icon: Icon, label, desc, iconBg, iconColor, border }) => (
                  <div key={label} className={`flex items-center gap-4 rounded-xl border ${border} bg-white/[0.02] px-4 py-3`}>
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="text-xs text-gray-600">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini ranking preview */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
                  <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-gray-400">Top Ranking — Timbas</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[
                    { pos: "1º", name: "GabrielDev", pts: "1.240 pts", wr: "68%", color: "text-yellow-400" },
                    { pos: "2º", name: "KingstonFPS", pts: "1.080 pts", wr: "61%", color: "text-gray-400" },
                    { pos: "3º", name: "ZkaMaster", pts: "960 pts", wr: "57%", color: "text-amber-600" },
                  ].map((p) => (
                    <div key={p.pos} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-5 text-xs font-bold ${p.color}`}>{p.pos}</span>
                      <span className="flex-1 text-sm text-white">{p.name}</span>
                      <span className="text-xs text-gray-600">{p.wr}</span>
                      <span className="text-xs text-blue-400 font-medium">{p.pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right — login card ── */}
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
