"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/// O palco das telas de entrada: preto, uma luz azul de um lado, uma vermelha
/// do outro e a costura no meio, que é o escudo do Timbas em tamanho de tela.
/// As luzes seguem o ponteiro de leve, só o suficiente para a tela não parecer
/// uma imagem parada.
export function AuthScene({ children, backHref = "/", backLabel = "Voltar ao site" }: {
  children: ReactNode
  backHref?: string
  backLabel?: string
}) {
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = stage.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!window.matchMedia("(pointer: fine)").matches) return

    let frame = 0
    let targetX = 0
    let targetY = 0

    const onMove = (event: PointerEvent) => {
      // De -1 a 1 em cada eixo, contado a partir do centro da tela.
      targetX = (event.clientX / window.innerWidth) * 2 - 1
      targetY = (event.clientY / window.innerHeight) * 2 - 1
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        node.style.setProperty("--pointer-x", targetX.toFixed(3))
        node.style.setProperty("--pointer-y", targetY.toFixed(3))
      })
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={stage} className="auth-stage relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#050508] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-[15%] top-[-20%] h-[720px] w-[720px] rounded-full bg-blue-600/20 blur-[150px] transition-transform duration-700 ease-out"
          style={{ transform: "translate3d(calc(var(--pointer-x, 0) * 42px), calc(var(--pointer-y, 0) * 30px), 0)" }}
        />
        <div
          className="absolute -right-[15%] bottom-[-25%] h-[680px] w-[680px] rounded-full bg-red-600/[0.17] blur-[150px] transition-transform duration-700 ease-out"
          style={{ transform: "translate3d(calc(var(--pointer-x, 0) * -34px), calc(var(--pointer-y, 0) * -24px), 0)" }}
        />

        {/* Malha fina que some nas bordas, para o fundo ter textura sem virar
            papel de parede. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />

        {/* A costura. Nasce do meio e abre para cima e para baixo. */}
        <div className="auth-seam absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/[0.14] to-transparent" />
        <div
          className="auth-seam absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-gradient-to-b from-blue-500/0 via-blue-400/25 to-red-500/0 blur-[3px]"
          style={{ animationDelay: "120ms" }}
        />
      </div>

      <header className="relative z-10 px-5 pt-6 sm:px-8">
        <Link
          href={backHref}
          className="auth-rise inline-flex items-center gap-2 text-[13px] text-gray-500 transition-colors hover:text-white"
          style={{ "--rise-delay": "560ms" } as React.CSSProperties}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-12 sm:py-16">{children}</main>
    </div>
  )
}
