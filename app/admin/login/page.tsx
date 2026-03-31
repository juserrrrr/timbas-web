"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { ShieldAlert, Lock } from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

const DISCORD_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 flex-shrink-0">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")
    if (error === "unauthorized") {
      toast.error("Acesso negado", {
        description: "Seu cargo no Discord não tem permissão de admin.",
        duration: 6000,
      })
    } else if (error === "auth_failed") {
      toast.error("Falha na autenticação", {
        description: "Tente novamente.",
        duration: 5000,
      })
    }
  }, [searchParams])

  const handleLogin = () => {
    setIsLoading(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adminPending", "1")
    }
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/discord`
  }

  return (
    <div className="relative min-h-screen bg-[#050508] text-white overflow-hidden flex items-center justify-center px-4">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#0d0d12",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff05_1px,_transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute -top-64 left-1/3 h-[600px] w-[600px] rounded-full bg-orange-700 opacity-[0.08] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-red-800 opacity-[0.08] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-br from-orange-500/30 via-white/[0.05] to-red-500/20 shadow-2xl shadow-black/60">
          <div className="rounded-[15px] bg-[#0a0a0f] px-8 py-10 space-y-8">

            {/* Header */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl overflow-hidden ring-1 ring-white/10">
                  <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={64} height={64} className="object-cover" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 ring-2 ring-[#0a0a0f]">
                  <ShieldAlert className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black text-white">
                  Timbas<span className="text-orange-400">Admin</span>
                </h1>
                <p className="mt-1 text-xs text-gray-600">Acesso restrito a administradores</p>
              </div>
            </div>

            {/* Info banner */}
            <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 px-4 py-3 text-xs text-orange-300/70 leading-relaxed">
              Seu cargo no Discord será verificado automaticamente após o login. Apenas membros com permissão de admin terão acesso.
            </div>

            {/* Discord button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="group relative w-full cursor-pointer overflow-hidden rounded-xl bg-[#5865F2] px-6 py-4 text-base font-bold text-white transition-all duration-300 hover:bg-[#4752C4] hover:shadow-xl hover:shadow-[#5865F2]/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              <span className="relative flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verificando cargo...
                  </>
                ) : (
                  <>
                    {DISCORD_SVG}
                    Entrar com Discord
                  </>
                )}
              </span>
            </button>

            {/* Footer */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.05]" />
              <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                <Lock className="h-3 w-3" />
                OAuth2 seguro
              </div>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
