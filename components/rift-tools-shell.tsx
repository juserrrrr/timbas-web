"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldAlert, ShieldCheck, UserSearch, type LucideIcon } from "lucide-react"
import { BetaBadge } from "@/components/ui/beta-badge"
import { normalizeDashboardPathname } from "@/lib/navigation"
import { NavigationLinkSignal } from "@/lib/navigation-context"

type Tone = {
  tile: string
  glow: string
  pill: string
  pillText: string
  highlight: string
  rail: string
}

const TONES = {
  amber: {
    tile: "border-amber-500/25 bg-amber-500/10 text-amber-300 shadow-amber-500/10",
    glow: "bg-amber-500/20",
    pill: "bg-amber-500/10 ring-amber-400/25",
    pillText: "text-amber-200",
    highlight: "text-amber-400",
    rail: "from-amber-400/70",
  },
  emerald: {
    tile: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/10",
    glow: "bg-emerald-500/20",
    pill: "bg-emerald-500/10 ring-emerald-400/25",
    pillText: "text-emerald-200",
    highlight: "text-emerald-400",
    rail: "from-emerald-400/70",
  },
  sky: {
    tile: "border-sky-500/25 bg-sky-500/10 text-sky-300 shadow-sky-500/10",
    glow: "bg-sky-500/20",
    pill: "bg-sky-500/10 ring-sky-400/25",
    pillText: "text-sky-200",
    highlight: "text-sky-400",
    rail: "from-sky-400/70",
  },
} satisfies Record<string, Tone>

type Tool = {
  href: string
  tab: string
  icon: LucideIcon
  tone: keyof typeof TONES
  title: string
  highlight?: string
  description: string
}

const TOOLS: Tool[] = [
  {
    href: "/clash",
    tab: "Clash Scout",
    icon: ShieldAlert,
    tone: "amber",
    title: "Clash",
    highlight: "Scout",
    description: "Digite o nick de qualquer jogador para ver o time, stats e análise de IA",
  },
  {
    href: "/verify",
    tab: "Verificar conta",
    icon: ShieldCheck,
    tone: "emerald",
    title: "Verificar Conta LoL",
    description: "Vincule sua conta do League of Legends ao Timbas para liberar os recursos da Riot",
  },
  {
    href: "/lol-profile",
    tab: "Perfil LoL",
    icon: UserSearch,
    tone: "sky",
    title: "Perfil LoL",
    description: "Busque estatísticas recentes de qualquer Riot ID",
  },
]

// useLayoutEffect avisa no servidor, e a casca é renderizada lá na carga direta
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

function toolFor(pathname: string): Tool {
  return TOOLS.find((tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`)) ?? TOOLS[0]
}

const TokenContext = createContext("")
const ActionsSlotContext = createContext<HTMLElement | null>(null)

/// O token vem da sessão lida uma vez no layout do grupo. As páginas de dentro
/// não tocam em cookie: assim trocar de aba não precisa de ida ao servidor só
/// para redescobrir quem está logado.
export function useRiftToken() {
  return useContext(TokenContext)
}

/// Botões que pertencem ao cabeçalho mas dependem do estado da página, como o
/// "Compartilhar" que só existe com um relatório aberto. Vão parar na mesma
/// linha do título sem que a página precise desenhar cabeçalho nenhum.
export function RiftHeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(ActionsSlotContext)
  if (!slot) return null
  return createPortal(children, slot)
}

/// Casca das três ferramentas de LoL. Ela vive no layout do grupo, então
/// continua montada quando a pessoa troca de aba: o cabeçalho e a trilha de
/// abas ficam parados e só o miolo é trocado.
export function RiftToolsShell({ token, children }: { token: string; children: ReactNode }) {
  const pathname = normalizeDashboardPathname(usePathname())
  const tool = toolFor(pathname)
  const tone = TONES[tool.tone]
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null)

  return (
    <TokenContext.Provider value={token}>
      <ActionsSlotContext.Provider value={actionsSlot}>
        <div className="space-y-5">
          <header className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#07070c]/70 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-5">
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full blur-[110px] transition-colors duration-500 ${tone.glow}`}
            />
            <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r via-white/10 to-transparent transition-colors duration-500 ${tone.rail}`} />

            <div className="relative flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 items-start gap-3.5">
                <span
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border shadow-lg transition-colors duration-300 ${tone.tile}`}
                >
                  <tool.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-[28px]">
                      {tool.title}
                      {tool.highlight && <span className={`transition-colors duration-300 ${tone.highlight}`}> {tool.highlight}</span>}
                    </h1>
                    <BetaBadge className="px-2 text-[10px]" />
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">{tool.description}</p>
                </div>
              </div>

              <div ref={setActionsSlot} className="flex flex-wrap items-center gap-2 empty:hidden" />
            </div>

            <RiftTabs activeHref={tool.href} tone={tone} />
          </header>

          {/* A chave troca junto com a aba para a entrada do miolo rodar de novo.
              O cabeçalho fica de fora e não pisca. */}
          <div key={tool.href} className="rift-panel min-h-[360px]">
            {children}
          </div>
        </div>
      </ActionsSlotContext.Provider>
    </TokenContext.Provider>
  )
}

/// A marca da aba ativa é um único elemento que desliza até ela, em vez de um
/// fundo que apaga aqui e acende ali. Sem borda no trilho, porque aí offsetLeft
/// e a posição absoluta falam a mesma língua.
function RiftTabs({ activeHref, tone }: { activeHref: string; tone: Tone }) {
  const listRef = useRef<HTMLElement>(null)
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      const active = list.querySelector<HTMLElement>("[data-active='true']")
      setPill(active ? { left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight } : null)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [activeHref])

  return (
    <nav
      ref={listRef}
      aria-label="Rift Tools"
      className="relative mt-5 flex gap-1 overflow-x-auto rounded-2xl bg-black/30 p-1.5 ring-1 ring-inset ring-white/[0.06] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {pill && (
        <span
          aria-hidden
          style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
          className={`pointer-events-none absolute rounded-xl ring-1 ring-inset transition-all duration-300 ease-out ${tone.pill}`}
        />
      )}

      {TOOLS.map((item) => {
        const active = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            data-active={active}
            aria-current={active ? "page" : undefined}
            className={`relative z-10 flex h-9 flex-shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors duration-200 ${
              active
                ? `${tone.pillText} ${pill ? "" : "bg-white/[0.05]"}`
                : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
            }`}
          >
            <NavigationLinkSignal />
            <item.icon className="h-3.5 w-3.5" />
            {item.tab}
          </Link>
        )
      })}
    </nav>
  )
}
