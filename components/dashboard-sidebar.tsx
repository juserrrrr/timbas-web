"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronRight, PanelLeftClose, Search, X } from "lucide-react"
import { useNavigation } from "@/lib/navigation-context"
import { BetaBadge } from "@/components/ui/beta-badge"
import { decodeToken, getToken } from "@/lib/auth"
import {
  ACCENTS,
  FOOTER_ITEMS,
  NAV_GROUPS,
  isNavItemActive,
  type NavGroup,
  type NavItem,
} from "@/lib/navigation"

const STORAGE_KEY = "timbas.sidebar.expanded"

function NavLink({ item, isActive, expanded }: { item: NavItem; isActive: boolean; expanded: boolean }) {
  const { navigate } = useNavigation()
  const accent = ACCENTS[item.accent]

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={(event) => {
        event.preventDefault()
        if (!isActive) navigate(item.href)
      }}
      className={`group relative flex w-full items-center rounded-xl ring-1 ring-inset transition-all duration-200 ${
        isActive
          ? `${accent.bg} ${accent.ring} ${accent.text}`
          : "ring-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-200 ${
          isActive ? `${accent.bar} opacity-100` : "opacity-0"
        }`}
      />

      <div className="relative flex h-11 w-[52px] flex-shrink-0 items-center justify-center">
        <item.icon className="h-[18px] w-[18px]" />
        {item.beta && !expanded && (
          <span className="absolute right-2 top-2.5 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
        )}
      </div>

      <div
        className={`flex min-w-0 flex-col overflow-hidden py-1.5 text-left transition-all duration-200 ${
          expanded ? "max-w-[200px] opacity-100 pr-3" : "max-w-0 opacity-0"
        }`}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold leading-tight">
          {item.label}
          {item.beta && <BetaBadge />}
        </span>
        <span
          className={`truncate text-[11px] leading-tight transition-colors ${
            isActive ? "text-white/50" : "text-gray-600 group-hover:text-gray-500"
          }`}
        >
          {item.description}
        </span>
      </div>

      {!expanded && (
        <div className="pointer-events-none absolute left-full z-[60] ml-3 w-max max-w-[240px] origin-left -translate-x-2 scale-95 opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100">
          <div className="relative rounded-xl border border-white/[0.08] bg-[#0d0d14]/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-md">
            <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-white/[0.08] bg-[#0d0d14]" />
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>{item.label}</span>
              {item.beta && <BetaBadge />}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{item.description}</p>
          </div>
        </div>
      )}
    </Link>
  )
}

function GroupLabel({ title, expanded }: { title: string; expanded: boolean }) {
  return (
    <div className={`overflow-hidden transition-all duration-200 ${expanded ? "h-7 opacity-100" : "h-3 opacity-0"}`}>
      <span className="block px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
        {title}
      </span>
    </div>
  )
}

export function DashboardSidebar() {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setExpanded(window.localStorage.getItem(STORAGE_KEY) === "true")
    const token = getToken()
    setIsAdmin(token ? decodeToken(token)?.role === "ADMIN" : false)
  }, [])

  useEffect(() => {
    if (!expanded) setQuery("")
  }, [expanded])

  const toggle = () => {
    setExpanded((current) => {
      window.localStorage.setItem(STORAGE_KEY, String(!current))
      return !current
    })
  }

  const groups = useMemo<NavGroup[]>(() => {
    const term = query.trim().toLowerCase()
    if (!term) return NAV_GROUPS
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          group.title.toLowerCase().includes(term),
      ),
    })).filter((group) => group.items.length > 0)
  }, [query])

  const footerItems = FOOTER_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-40 cursor-pointer bg-black/50 backdrop-blur-sm lg:hidden" onClick={toggle} />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-[#07070c] transition-[width] duration-300 ease-out ${
          expanded ? "w-[268px] shadow-2xl shadow-black/60" : "w-[65px]"
        }`}
      >
        <div className="flex h-14 flex-shrink-0 items-center overflow-hidden border-b border-white/[0.06]">
          <Link href="/dashboard" prefetch={false} className="flex items-center">
            <div className="flex h-14 w-[65px] flex-shrink-0 items-center justify-center">
              <div className="h-8 w-8 overflow-hidden rounded-lg ring-1 ring-white/10">
                <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={32} height={32} className="object-cover" />
              </div>
            </div>
            <span
              className={`overflow-hidden whitespace-nowrap text-sm font-black tracking-tight text-white transition-all duration-200 ${
                expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              Timbas<span className="text-blue-400">Bot</span>
            </span>
          </Link>

          {expanded && (
            <button
              onClick={toggle}
              aria-label="Recolher menu"
              className="ml-auto mr-3 cursor-pointer rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className={`overflow-hidden px-3 transition-all duration-200 ${expanded ? "h-14 pt-3 opacity-100" : "h-0 opacity-0"}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar no menu"
              className="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] pl-9 pr-8 text-[13px] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-white/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-gray-600 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 [scrollbar-width:thin]">
          {groups.map((group, index) => (
            <div key={group.id} className={index > 0 ? "mt-1" : ""}>
              <GroupLabel title={group.title} expanded={expanded} />
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isNavItemActive(pathname, item.href)}
                    expanded={expanded}
                  />
                ))}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-gray-600">Nada encontrado para "{query}".</p>
          )}
        </nav>

        <div className="flex-shrink-0 space-y-0.5 border-t border-white/[0.06] px-3 py-2">
          {footerItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isNavItemActive(pathname, item.href)} expanded={expanded} />
          ))}

          {!expanded && (
            <button
              onClick={toggle}
              aria-label="Expandir menu"
              className="flex w-full cursor-pointer items-center rounded-xl text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
            >
              <div className="flex h-10 w-[52px] flex-shrink-0 items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
