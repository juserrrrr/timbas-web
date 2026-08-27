"use client"

import "@fontsource/anton"

import { useEffect, useState } from "react"
import { AlertCircle, ShieldAlert } from "lucide-react"
import { AuthScene } from "@/components/auth/auth-scene"
import { AuthPanel, DiscordButton } from "@/components/auth/auth-panel"

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Essa conta não tem nenhuma permissão de painel.",
  auth_failed: "A volta do Discord não completou. Tente entrar de novo.",
}

export default function AdminLoginPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const failure = new URLSearchParams(window.location.search).get("error")
    if (failure) setError(ERROR_MESSAGES[failure] ?? "Não deu para concluir a entrada. Tente de novo.")
  }, [])

  const enter = () => {
    setSubmitting(true)
    // A volta do Discord passa pelo mesmo callback do dashboard, então ele
    // precisa saber que a intenção era entrar no painel.
    sessionStorage.setItem("adminPending", "1")
    window.location.href = `${API_URL}/auth/discord`
  }

  return (
    <AuthScene>
      <AuthPanel
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/[0.08] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-orange-300">
            <ShieldAlert className="h-3 w-3" />
            Área restrita
          </span>
        }
        title="Painel de administração."
        description="Entre com o Discord e o painel confere o que o seu acesso abre. Cada área aparece só para quem tem a permissão dela."
        footnote={
          <p className="text-[11.5px] leading-relaxed text-gray-600">
            Quem não tem nenhuma permissão de painel volta para esta tela. Para pedir acesso, fale com quem administra o
            Timbas.
          </p>
        }
      >
        <div className="space-y-3">
          {error && (
            <p className="auth-rise flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-3.5 py-3 text-[12.5px] leading-relaxed text-red-200">
              <AlertCircle className="mt-px h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          )}

          <DiscordButton onClick={enter} submitting={submitting} label="Entrar como administrador" />
        </div>
      </AuthPanel>
    </AuthScene>
  )
}
