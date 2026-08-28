"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, LockKeyhole, ShieldCheck } from "lucide-react"

import { setSessionHint, type TokenPayload } from "@/lib/auth"

const ADMIN_ROLES = ["ADMIN", "admin", "Admin"]
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")

const STEPS = [
  "Validando sua identidade",
  "Sincronizando seu acesso",
  "Preparando seu painel",
] as const

const DISCORD_MARK = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-6 w-6">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeStep, setActiveStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, STEPS.length - 1))
    }, 850)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let redirectTimer = 0
    const controller = new AbortController()
    const error = searchParams.get("error")
    const isAdminPending = sessionStorage.getItem("adminPending") === "1"

    fetch(`${API_URL}/auth/validate-token`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("invalid session")
        const result = await response.json() as { data: TokenPayload }
        setSessionHint(result.data)
        setActiveStep(STEPS.length - 1)
        setCompleted(true)

        redirectTimer = window.setTimeout(() => {
          if (isAdminPending) {
            sessionStorage.removeItem("adminPending")
            const isAdmin = result.data.role && ADMIN_ROLES.includes(result.data.role)
            router.replace(isAdmin ? "/admin?welcome=1" : "/admin/login?error=unauthorized")
            return
          }

          const redirectPath = searchParams.get("redirect")
          router.replace(redirectPath?.startsWith("/") ? redirectPath : "/dashboard")
        }, 420)
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        if (isAdminPending) {
          sessionStorage.removeItem("adminPending")
          router.replace(`/admin/login?error=${error ?? "auth_failed"}`)
          return
        }
        router.replace(`/login?error=${error ?? "auth_failed"}`)
      })

    return () => {
      controller.abort()
      window.clearTimeout(redirectTimer)
    }
  }, [router, searchParams])

  return (
    <main className="auth-callback-stage relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-zinc-950 px-5 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-callback-orb absolute -left-48 -top-52 h-[34rem] w-[34rem] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="auth-callback-orb absolute -bottom-56 -right-48 h-[34rem] w-[34rem] rounded-full bg-red-600/15 blur-[120px] [animation-delay:-3s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:58px_58px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        <div className="auth-callback-scan absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent shadow-[0_0_32px_8px_rgb(59_130_246/0.18)]" />
      </div>

      <section className="auth-callback-card relative w-full max-w-[500px] overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950/80 px-6 py-8 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:px-10 sm:py-10">
        <div aria-hidden className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-blue-400/0 via-blue-400/80 to-red-400/0" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-white/15">
              <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="Timbas" fill priority className="object-cover" />
            </span>
            <div>
              <p className="font-display text-xl leading-none">Timbas</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Acesso seguro</p>
            </div>
          </div>
          <LockKeyhole className="h-4 w-4 text-zinc-600" aria-label="Conexão segura" />
        </div>

        <div className="mt-10 flex items-center justify-center gap-3 sm:gap-7">
          <div className="auth-callback-service flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-950/40 sm:h-16 sm:w-16">
            {DISCORD_MARK}
          </div>
          <div className="relative h-px w-16 overflow-visible bg-white/10 sm:w-28">
            <span className="auth-callback-packet absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-300 shadow-[0_0_14px_3px_rgb(147_197_253/0.7)]" />
          </div>
          <div className={`auth-callback-service flex h-14 w-14 items-center justify-center rounded-2xl border bg-white/[0.04] transition-colors duration-500 sm:h-16 sm:w-16 ${completed ? "border-emerald-400/40" : "border-white/10"}`}>
            {completed ? (
              <Check className="auth-callback-check h-7 w-7 text-emerald-400" />
            ) : (
              <ShieldCheck className="h-7 w-7 text-blue-300" />
            )}
          </div>
        </div>

        <div className="mt-9 text-center" aria-live="polite">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-400">Discord conectado</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-[28px]">
            {completed ? "Tudo pronto!" : "Entrando no seu painel"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {completed ? "Acesso confirmado. Abrindo o Timbas..." : STEPS[activeStep]}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2" aria-hidden>
          {STEPS.map((step, index) => (
            <span key={step} className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className={`block h-full origin-left rounded-full bg-gradient-to-r from-blue-500 to-blue-300 transition-transform duration-500 ${index <= activeStep ? "scale-x-100" : "scale-x-0"}`}
              />
            </span>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-600">
          Você será redirecionado automaticamente. Pode deixar com a gente.
        </p>
      </section>
    </main>
  )
}
