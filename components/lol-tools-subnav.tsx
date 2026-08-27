"use client"

import Link from "next/link"
import { ShieldAlert, ShieldCheck, UserSearch } from "lucide-react"
import { usePathname } from "next/navigation"
import { useNavigation } from "@/lib/navigation-context"

const TOOLS = [
  { label: "Clash Scout", href: "/dashboard/clash", icon: ShieldAlert },
  { label: "Verificar conta", href: "/dashboard/verify", icon: ShieldCheck },
  { label: "Perfil LoL", href: "/dashboard/lol-profile", icon: UserSearch },
] as const

export function LolToolsSubnav() {
  const pathname = usePathname()
  const { navigate } = useNavigation()

  return (
    <nav aria-label="Rift Tools" className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TOOLS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault()
              if (!active) navigate(item.href)
            }}
            className={`flex h-9 flex-shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors ${active ? "bg-amber-500/10 text-amber-200 shadow-sm ring-1 ring-inset ring-amber-400/15" : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"}`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
