"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, ShieldCheck, Slash } from "lucide-react"

import { ADMIN_NAV_GROUPS } from "@/lib/admin-navigation"

function currentAdminPage(pathname: string) {
  const items = ADMIN_NAV_GROUPS.flatMap((group) => group.items)
  return items.find((item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.label ?? "Administração"
}

export function AdminTopbar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <header className="fixed left-[65px] right-0 top-0 z-40 flex h-14 items-center border-b border-white/[0.07] bg-zinc-950/75 px-4 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/[0.07] text-orange-400">
          <ShieldCheck className="h-3.5 w-3.5" />
        </span>
        <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-orange-400/70 sm:inline">Central de controle</span>
        <Slash className="hidden h-3.5 w-3.5 text-zinc-800 sm:block" />
        <span className="truncate text-[13px] font-bold text-zinc-200">{currentAdminPage(pathname)}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right md:block">
          <p className="max-w-[18ch] truncate text-xs font-bold text-zinc-300">{userName || "Administrador"}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">Sessão protegida</p>
        </div>
        <Link
          href="/dashboard"
          className="flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] font-bold text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
        >
          Ver dashboard
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  )
}
