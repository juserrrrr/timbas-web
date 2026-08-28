"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, Home, Lock, MoreHorizontal, Radio, Trophy, X } from "lucide-react"
import { useNavigation } from "@/lib/navigation-context"
import { BetaBadge } from "@/components/ui/beta-badge"
import { ACCENTS, footerItemsFor, isNavItemActive, navGroupsFor, type NavItem } from "@/lib/navigation"
import { useEnabledFeatures } from "@/hooks/use-enabled-features"
import { useMyPermissions } from "@/hooks/use-my-permissions"

const QUICK_HREFS = ["/dashboard", "/matches", "/tournaments", "/draft"]

const QUICK_ICONS: Record<string, typeof Home> = {
  "/dashboard": Home,
  "/matches": Radio,
  "/tournaments": Trophy,
  "/draft": ClipboardList,
}

function BarItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { navigate } = useNavigation()
  const Icon = QUICK_ICONS[item.href] ?? item.icon
  const accent = ACCENTS[item.accent]

  return (
    <Link
      href={item.href}
      onClick={(event) => {
        event.preventDefault()
        if (!isActive) navigate(item.href)
      }}
      className={`relative mx-0.5 flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors ${isActive ? "bg-white/[0.04]" : ""}`}
    >
      {isActive && <span className={`absolute top-0 h-0.5 w-5 rounded-full ${accent.bar}`} />}
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
  const permissions = useMyPermissions()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const groups = navGroupsFor(flags, permissions)
  const footerItems = footerItemsFor(flags, permissions)
  const allItems = [...groups.flatMap((group) => group.items), ...footerItems]
  const quickItems = QUICK_HREFS.map((href) => allItems.find((item) => item.href === href)).filter(
    (item): item is NavItem => Boolean(item),
  )

  const drawerGroups = [
    ...groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !QUICK_HREFS.includes(item.href)),
    })).filter((group) => group.items.length > 0),
    { id: "conta", title: "Conta", items: footerItems },
  ]

  return (
    <>
      {open && <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      <div
        className={`fixed bottom-16 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="mx-3 mb-2 max-h-[65vh] overflow-y-auto rounded-[22px] border border-white/[0.09] bg-zinc-950/95 p-3 shadow-2xl shadow-black/70 backdrop-blur-2xl">
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
                  const isActive = isNavItemActive(pathname, item.href, item.activeHrefs)
                  const accent = ACCENTS[item.accent]
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
                          {item.locked ? (item.lockedReason === "permission" ? "Sem acesso nesta conta" : "Recurso desativado pelo admin") : item.description}
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-white/[0.07] bg-zinc-950/90 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_50px_-35px_rgb(59_130_246/0.55)] backdrop-blur-2xl">
        {quickItems.map((item) => (
          <BarItem key={item.href} item={item} isActive={isNavItemActive(pathname, item.href, item.activeHrefs)} />
        ))}

        <button
          onClick={() => setOpen(!open)}
          className={`relative mx-0.5 flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors ${open ? "bg-white/[0.04]" : ""}`}
        >
          <MoreHorizontal className={`h-5 w-5 transition-colors ${open ? "text-white" : "text-gray-500"}`} />
          <span className={`text-[10px] font-medium transition-colors ${open ? "text-white" : "text-gray-600"}`}>Mais</span>
        </button>
      </nav>
    </>
  )
}
