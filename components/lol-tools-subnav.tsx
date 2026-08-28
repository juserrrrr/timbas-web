"use client"

import Link from "next/link"
import { ShieldAlert, ShieldCheck, UserSearch } from "lucide-react"
import { usePathname } from "next/navigation"
import { NavigationLinkSignal } from "@/lib/navigation-context"

const TOOLS = [
  { label: "Clash Scout", href: "/clash", icon: ShieldAlert },
  { label: "Verificar conta", href: "/verify", icon: ShieldCheck },
  { label: "Perfil LoL", href: "/lol-profile", icon: UserSearch },
] as const

export function LolToolsSubnav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Rift Tools" className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/20 p-1.5 shadow-inner shadow-black/30 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TOOLS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 flex-shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors ${active ? "bg-amber-500/10 text-amber-200 shadow-sm ring-1 ring-inset ring-amber-400/15" : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"}`}
          >
            <NavigationLinkSignal />
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
