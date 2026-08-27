"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CornerDownLeft, ShieldCheck } from "lucide-react"
import { AuthPanel, DiscordButton } from "@/components/auth/auth-panel"

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")

/// O que pode voltar da tentativa anterior. Sem isso a pessoa é devolvida para
/// cá sem entender o que aconteceu.
const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "A volta do Discord não completou. Tente entrar de novo.",
  access_denied: "A autorização foi cancelada no Discord.",
  unauthorized: "Essa conta ainda não tem acesso liberado no Timbas.",
}

export function LoginPanel() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [redirect, setRedirect] = useState("")

  // Os parâmetros são lidos do próprio navegador, então a página continua
  // estática e não precisa de fronteira de suspense só para isso.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const failure = params.get("error")
    if (failure) setError(ERROR_MESSAGES[failure] ?? "Não deu para concluir a entrada. Tente de novo.")

    const target = params.get("redirect")
    if (target && target.startsWith("/") && !target.startsWith("//")) setRedirect(target)
  }, [])

  const enter = () => {
    setSubmitting(true)
    const url = redirect ? `${API_URL}/auth/discord?redirect=${encodeURIComponent(redirect)}` : `${API_URL}/auth/discord`
    window.location.href = url
  }

  return (
    <AuthPanel
      title="O painel do Timbas fica aqui."
      description="Entre com a conta do Discord que você já usa no servidor. Partidas, campeonatos, liga draft, transmissões e ranking, tudo do outro lado."
      footnote={
        <p className="flex items-start gap-2.5 text-[11.5px] leading-relaxed text-gray-600">
          <ShieldCheck className="mt-px h-3.5 w-3.5 flex-shrink-0 text-gray-700" />
          Você autoriza no site do Discord. O Timbas nunca vê a sua senha e pode ser desconectado por lá quando quiser.
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

        <DiscordButton onClick={enter} submitting={submitting} />

        {redirect && (
          <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-gray-600">
            <CornerDownLeft className="h-3.5 w-3.5" />
            Depois de entrar você volta para <span className="font-mono text-gray-400">{redirect}</span>
          </p>
        )}
      </div>
    </AuthPanel>
  )
}
