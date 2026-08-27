"use client"

import Image from "next/image"
import type { CSSProperties, ReactNode } from "react"

const DISCORD_MARK = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5 flex-shrink-0">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

const rise = (delay: number) => ({ "--rise-delay": `${delay}ms` }) as CSSProperties

/// O cartão de entrada. Uma coisa por linha, na ordem em que a pessoa lê: quem
/// está falando, para onde ela vai e o botão que leva.
export function AuthPanel({
  badge,
  title,
  description,
  children,
  footnote,
}: {
  badge?: ReactNode
  title: string
  description: string
  children: ReactNode
  footnote: ReactNode
}) {
  return (
    <div className="w-full max-w-[430px]">
      {/* O cartão é sólido de propósito: a costura do fundo bate nele, some
          atrás e volta a aparecer embaixo, como se atravessasse a tela. */}
      <div className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0a0a11] shadow-[0_50px_130px_-45px_rgba(0,0,0,0.95)]">
        {/* A mesma divisão do escudo, agora na borda de cima do cartão. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/70 via-white/45 to-red-400/70"
        />

        {/* A luz que vaza por onde a costura entra e sai. */}
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/25 blur-2xl"
        />
        <span
          aria-hidden
          className="absolute bottom-0 left-1/2 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-red-400/20 blur-2xl"
        />

        <div className="relative px-7 py-10 sm:px-9 sm:py-12">
          <div className="flex flex-col items-center text-center">
            <div className="auth-mark relative" style={rise(220)}>
              <span
                aria-hidden
                className="absolute -inset-6 rounded-full bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.35),transparent_60%),radial-gradient(circle_at_70%_50%,rgba(239,68,68,0.3),transparent_60%)] blur-xl"
              />
              <span className="relative block h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-white/15">
                <Image
                  src="/OIG.kjxVRTfiWRNi.jpg"
                  alt="Timbas"
                  width={64}
                  height={64}
                  priority
                  className="h-full w-full object-cover"
                />
              </span>
            </div>

            <p className="auth-rise font-display mt-5 text-[30px] tracking-tight text-white" style={rise(300)}>
              Timbas
            </p>

            {badge && (
              <div className="auth-rise mt-3" style={rise(340)}>
                {badge}
              </div>
            )}

            <h1 className="auth-rise mt-6 text-[19px] font-black leading-tight text-white" style={rise(380)}>
              {title}
            </h1>
            <p className="auth-rise mt-2.5 max-w-[34ch] text-[13.5px] leading-relaxed text-gray-500" style={rise(430)}>
              {description}
            </p>
          </div>

          <div className="auth-rise mt-8" style={rise(490)}>
            {children}
          </div>

          <div className="auth-rise mt-7 border-t border-white/[0.06] pt-5" style={rise(560)}>
            {footnote}
          </div>
        </div>
      </div>
    </div>
  )
}

/// O único botão da tela. Enquanto o navegador sai para o Discord, uma barra
/// atravessa a base: a pessoa vê que a saída começou.
export function DiscordButton({
  onClick,
  submitting,
  label = "Entrar com Discord",
  pendingLabel = "Abrindo o Discord",
}: {
  onClick: () => void
  submitting: boolean
  label?: string
  pendingLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="auth-action relative flex h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[#5865F2] text-[15px] font-bold text-white outline-none transition-all duration-300 hover:-translate-y-px hover:bg-[#4a57e0] hover:shadow-[0_18px_40px_-16px_rgba(88,101,242,0.9)] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a11] disabled:cursor-progress disabled:hover:translate-y-0"
    >
      <span className="flex items-center gap-2.5">
        {DISCORD_MARK}
        {submitting ? pendingLabel : label}
      </span>

      {submitting && <span aria-hidden className="auth-progress absolute inset-x-0 bottom-0 h-[3px] bg-white/80" />}
    </button>
  )
}
