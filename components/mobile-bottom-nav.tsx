"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, Home, Lock, MoreHorizontal, Radio, Trophy, X } from "lucide-react"
import { useNavigation } from "@/lib/navigation-context"
import { BetaBadge } from "@/components/ui/beta-badge"
import { ACCENTS, FOOTER_ITEMS, isNavItemActive, navGroupsFor, type NavItem } from "@/lib/navigation"
import { useEnabledFeatures } from "@/hooks/use-enabled-features"

const QUICK_HREFS = ["/dashboard", "/dashboard/active", "/dashboard/tournaments", "/dashboard/draft"]

const QUICK_ICONS: Record<string, typeof Home> = {
  "/dashboard": Home,
  "/dashboard/active": Radio,
  "/dashboard/tournaments": Trophy,
  "/dashboard/draft": ClipboardList,
}

function BarItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { navigate } = useNavigation()
  const Icon = QUICK_ICONS[item.href] ?? item.icon
  const accent = ACCENTS[item.accent]

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={(event) => {
        event.preventDefault()
        if (!isActive) navigate(item.href)
      }}
      className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-1"
    >
      <Icon className={`h-5 w-5 transition-colors ${isActive ? accent.text : "text-gray-500"}`} />
      <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-white" : "text-gray-600"}`}>
        {item.label}
      </span>
    </Link>
  )
}

export function MobileBottomNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { navigate } = useNavigation()
  const flags = useEnabledFeatures()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const groups = navGroupsFor(flags)
  const allItems = [...groups.flatMap((group) => group.items), ...FOOTER_ITEMS]
  const quickItems = QUICK_HREFS.map((href) => allItems.find((item) => item.href === href)).filter(
    (item): item is NavItem => Boolean(item),
  )

  const drawerGroups = [
    ...groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !QUICK_HREFS.includes(item.href)),
    })).filter((group) => group.items.length > 0),
    { id: "conta", title: "Conta", items: FOOTER_ITEMS },
  ]

  return (
    <>
      {open && <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      <div
        className={`fixed bottom-[56px] left-0 right-0 z-50 transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="mx-3 mb-2 max-h-[65vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0d0d14]/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Todas as seções</span>
            <button onClick={() => setOpen(false)} className="cursor-pointer rounded-lg p-1 text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {drawerGroups.map((group) => (
            <div key={group.id} className="mb-2 last:mb-0">
              <span className="block px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
                {group.title}
              </span>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive = isNavItemActive(pathname, item.href)
                  const accent = ACCENTS[item.accent]
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={(event) => {
                        event.preventDefault()
                        if (!isActive) navigate(item.href)
                        setOpen(false)
                      }}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        isActive ? `${accent.bg} ${accent.text}` : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <item.icon className={`mt-0.5 h-[18px] w-[18px] flex-shrink-0 ${item.locked ? "opacity-50" : ""}`} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                          {item.label}
                          {item.beta && !item.locked && <BetaBadge />}
                          {item.locked && <Lock className="h-3 w-3 text-amber-300/80" />}
                        </span>
                        <span className={`block truncate text-[11px] leading-tight ${item.locked ? "text-amber-300/60" : "text-gray-600"}`}>
                          {item.locked ? "Recurso desativado pelo admin" : item.description}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-white/[0.06] bg-[#07070c]/95 backdrop-blur-xl">
        {quickItems.map((item) => (
          <BarItem key={item.href} item={item} isActive={isNavItemActive(pathname, item.href)} />
        ))}

        <button
          onClick={() => setOpen(!open)}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-1"
        >
          <MoreHorizontal className={`h-5 w-5 transition-colors ${open ? "text-white" : "text-gray-500"}`} />
          <span className={`text-[10px] font-medium transition-colors ${open ? "text-white" : "text-gray-600"}`}>Mais</span>
        </button>
      </nav>
    </>
  )
}
