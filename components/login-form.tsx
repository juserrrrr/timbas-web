"use client"

import { useState } from "react"
import Image from "next/image"
import { Lock } from "lucide-react"

const DISCORD_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 flex-shrink-0">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)

  const handleDiscordLogin = () => {
    setIsLoading(true)
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/discord`
  }

  return (
    <div className="w-full rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/30 via-white/[0.06] to-red-500/20 shadow-2xl shadow-black/50">
      <div className="rounded-[15px] bg-[#0a0a0f] px-8 py-10">

        {/* Logo — mobile */}
        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
          <div className="mb-4 h-14 w-14 rounded-xl overflow-hidden ring-1 ring-white/10">
            <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={56} height={56} className="object-cover" />
          </div>
          <span className="text-xl font-black tracking-tight">
            Timbas<span className="text-blue-400">Bot</span>
          </span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white leading-tight">Bem-vindo ao dashboard</h2>
          <p className="mt-2 text-sm text-gray-500">
            Entre com sua conta Discord para acessar ranking, stats e histórico completo.
          </p>
        </div>

        {/* Discord button */}
        <button
          type="button"
          onClick={handleDiscordLogin}
          disabled={isLoading}
          className="group relative w-full cursor-pointer overflow-hidden rounded-xl bg-[#5865F2] px-6 py-4 text-base font-bold text-white transition-all duration-300 hover:bg-[#4752C4] hover:shadow-xl hover:shadow-[#5865F2]/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Button shine effect */}
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

          <span className="relative flex items-center justify-center gap-3">
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Conectando...
              </>
            ) : (
              <>
                {DISCORD_SVG}
                Entrar com Discord
              </>
            )}
          </span>
        </button>

        {/* Divider */}
        <div className="my-7 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <Lock className="h-3 w-3" />
            OAuth2 seguro
          </div>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: "Sem senha", sub: "só Discord" },
            { label: "Gratuito", sub: "sem planos" },
            { label: "Privado", sub: "seus dados" },
          ].map(({ label, sub }) => (
            <div key={label} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-2.5 text-center">
              <div className="text-xs font-semibold text-white">{label}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-gray-700 leading-relaxed">
          Ao entrar você concorda com nossos termos. Não armazenamos senhas.
        </p>
      </div>
    </div>
  )
}
