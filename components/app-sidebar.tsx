"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Lock, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react"
import { BetaBadge, BetaMark } from "@/components/ui/beta-badge"
import { NavigationLinkSignal } from "@/lib/navigation-context"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ACCENTS, isNavItemActive, type NavGroup, type NavItem } from "@/lib/navigation"

const RAIL = 65
const PANEL = 268
// Largura fixa do bloco de texto: ele nunca muda de tamanho, só aparece e
// desaparece. É o que evita a linha quebrar e os itens pularem na animação.
const TEXT_WIDTH = PANEL - RAIL - 17

function NavLink({
  item,
  isActive,
  expanded,
  onNavigate,
}: {
  item: NavItem
  isActive: boolean
  expanded: boolean
  onNavigate: () => void
}) {
  const accent = ACCENTS[item.accent]

  const link = (
    <Link
      href={item.href}
      prefetch={true}
      aria-label={item.label}
      onClick={onNavigate}
      className={`group relative flex w-full items-center overflow-hidden rounded-xl transition-colors duration-200 ${
        expanded ? "h-11" : "h-[41px]"
      } ${
        isActive
          ? `${accent.bg} ${accent.text} ${expanded ? `ring-1 ring-inset ${accent.ring}` : ""}`
          : "text-gray-500 hover:bg-white/[0.055] hover:text-white"
      }`}
    >
      <NavigationLinkSignal />
      {isActive && expanded && (
        <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full ${accent.bar}`} />
      )}

      <span className="flex h-11 w-[41px] flex-shrink-0 items-center justify-center">
        <span className="relative flex items-center justify-center">
          <item.icon className={`h-[18px] w-[18px] ${item.locked ? "opacity-50" : ""}`} />
          {item.locked && (
            <Lock className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-amber-300/80" strokeWidth={3} />
          )}
          {item.beta && !item.locked && !expanded && (
            <BetaMark className="absolute -right-1.5 -top-1" />
          )}
        </span>
      </span>

      <span
        aria-hidden={!expanded}
        style={{ width: TEXT_WIDTH }}
        className={`flex flex-shrink-0 flex-col pr-3 text-left transition-opacity duration-200 ${
          expanded ? "opacity-100 delay-100" : "opacity-0"
        }`}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold leading-tight">
          <span className={item.locked ? "text-gray-500" : ""}>{item.label}</span>
          {item.beta && !item.locked && <BetaBadge />}
        </span>
        <span className={`truncate text-[11px] leading-tight ${item.locked ? "text-amber-300/60" : isActive ? "text-white/45" : "text-gray-600"}`}>
          {item.locked ? (item.lockedReason === "permission" ? "Sem acesso nesta conta" : "Recurso desativado pelo admin") : item.description}
        </span>
      </span>
    </Link>
  )

  if (expanded) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={10}
        className="max-w-[240px] border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-left shadow-2xl shadow-black/50 [&>span]:bg-[#0d0d14] [&>span]:fill-[#0d0d14]"
      >
        <span className="flex items-center gap-1.5">
          <span className={`text-xs font-bold uppercase tracking-wider ${item.locked ? "text-gray-400" : accent.text}`}>{item.label}</span>
          {item.beta && !item.locked && <BetaBadge />}
          {item.locked && <Lock className="h-3 w-3 text-amber-300/80" />}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">{item.description}</span>
        {item.locked && <span className="mt-1 block text-[11px] font-semibold text-amber-300/80">{item.lockedReason === "permission" ? "Não incluído no seu acesso" : "Desativado pelo admin"}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

/// Cabeçalho de grupo com altura fixa nos dois estados: recolhido mostra o
/// tracinho, expandido mostra o título, e nada muda de lugar no meio da
/// animação.
function GroupHeader({ title, expanded, divided }: { title: string; expanded: boolean; divided: boolean }) {
  return (
    <div className="relative flex h-7 items-center">
      <span
        className={`absolute left-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600 transition-opacity duration-200 ${
          expanded ? "opacity-100 delay-100" : "opacity-0"
        }`}
      >
        {title}
      </span>
      {divided && (
        <span
          className={`absolute left-1/2 h-px w-7 -translate-x-1/2 bg-white/[0.08] transition-opacity duration-200 ${
            expanded ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
    </div>
  )
}

/// Um sidebar para o dashboard e para o admin: muda a navegação, a marca e o
/// rodapé, e o comportamento de gaveta é o mesmo nos dois.
export function AppSidebar({
  groups: navGroups,
  footerItems,
  homeHref,
  brand,
  brandAccent,
  logoBadge,
  footer,
}: {
  groups: NavGroup[]
  footerItems: NavItem[]
  homeHref: string
  brand: string
  brandAccent?: string
  logoBadge?: React.ReactNode
  footer?: (expanded: boolean) => React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const pathname = usePathname()

  const close = () => setExpanded(false)

  // O painel cobre o conteúdo, então ele se comporta como gaveta: sai de cena ao
  // trocar de página, ao apertar Esc e ao clicar fora.
  useEffect(() => {
    setExpanded(false)
  }, [pathname])

  useEffect(() => {
    if (!expanded) {
      setQuery("")
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [expanded])

  const groups = useMemo<NavGroup[]>(() => {
    const term = query.trim().toLowerCase()
    if (!term) return navGroups
    return navGroups.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          group.title.toLowerCase().includes(term),
      ),
    })).filter((group) => group.items.length > 0)
  }, [query, navGroups])

  return (
    <>
      <div
        onClick={close}
        aria-hidden={!expanded}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
          expanded ? "cursor-pointer opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        style={{ width: expanded ? PANEL : RAIL }}
        className={`group/sidebar fixed left-0 top-0 z-50 flex h-[100dvh] flex-col overflow-hidden border-r border-white/[0.07] bg-zinc-950/95 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-[width,box-shadow] duration-300 ease-out ${
          expanded ? "shadow-black/70" : ""
        }`}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/60 via-white/30 to-red-400/60" />
        <span aria-hidden className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-blue-500/[0.07] blur-3xl" />
        <div className="flex h-14 flex-shrink-0 items-center border-b border-white/[0.06]">
          <Link href={homeHref} prefetch={true} onClick={close} className="flex items-center">
            <NavigationLinkSignal />
            <span className="relative flex h-14 w-[65px] flex-shrink-0 items-center justify-center">
              <span className="block h-8 w-8 overflow-hidden rounded-[10px] ring-1 ring-white/15 shadow-lg shadow-blue-950/40 transition-transform duration-300 group-hover/sidebar:scale-105">
                <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="Timbas" width={32} height={32} className="object-cover" />
              </span>
              {logoBadge}
            </span>
            <span
              aria-hidden={!expanded}
              className={`w-[140px] flex-shrink-0 whitespace-nowrap text-sm font-black tracking-tight text-white transition-opacity duration-200 ${
                expanded ? "opacity-100 delay-100" : "opacity-0"
              }`}
            >
              {brand}
              {brandAccent && <span className="text-orange-400">{brandAccent}</span>}
            </span>
          </Link>

          <button
            onClick={close}
            tabIndex={expanded ? 0 : -1}
            aria-label="Recolher menu"
            className={`ml-auto mr-3 flex-shrink-0 rounded-lg p-1.5 text-gray-600 transition-opacity duration-200 hover:bg-white/[0.05] hover:text-white ${
              expanded ? "cursor-pointer opacity-100 delay-100" : "pointer-events-none opacity-0"
            }`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`flex-shrink-0 overflow-hidden px-3 transition-[height,opacity] duration-300 ease-out ${
            expanded ? "h-12 opacity-100" : "h-0 opacity-0"
          }`}
        >
          <div className="relative pt-3">
            <Search className="pointer-events-none absolute left-3 top-[calc(50%+6px)] h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              tabIndex={expanded ? 0 : -1}
              placeholder="Buscar no menu"
              className="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] pl-9 pr-8 text-[13px] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-white/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-[calc(50%+6px)] -translate-y-1/2 cursor-pointer rounded p-1 text-gray-600 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group, index) => (
            <div key={group.id}>
              <GroupHeader title={group.title} expanded={expanded} divided={index > 0} />
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isNavItemActive(pathname, item.href, item.activeHrefs, item.exact)}
                    expanded={expanded}
                    onNavigate={close}
                  />
                ))}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-gray-600">Nada encontrado para &quot;{query}&quot;.</p>
          )}
        </nav>

        <div className="flex-shrink-0 space-y-1 border-t border-white/[0.06] px-3 py-2">
          {footer?.(expanded)}

          {footerItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isNavItemActive(pathname, item.href, item.activeHrefs, item.exact)}
              expanded={expanded}
              onNavigate={close}
            />
          ))}

          {!expanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setExpanded(true)}
                  aria-label="Expandir menu"
                  className="flex h-11 w-full cursor-pointer items-center rounded-xl text-gray-600 transition-colors hover:bg-white/[0.05] hover:text-gray-300"
                >
                  <span className="flex h-11 w-[41px] flex-shrink-0 items-center justify-center">
                    <PanelLeftOpen className="h-[18px] w-[18px]" />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={10}
                className="border border-white/[0.08] bg-[#0d0d14] px-3 py-1.5 text-[11px] font-bold text-gray-300 shadow-2xl shadow-black/50 [&>span]:bg-[#0d0d14] [&>span]:fill-[#0d0d14]"
              >
                Expandir menu
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </>
  )
}
