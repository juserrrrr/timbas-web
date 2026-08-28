"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { Radio, Slash } from "lucide-react"

import { UserMenu } from "@/components/user-menu"
import { DashboardAccessGate } from "@/components/dashboard-access-gate"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { ALL_NAV_ITEMS, isNavItemActive } from "@/lib/navigation"

const ROUTE_NAMES: Record<string, string> = {
  "/profile": "Meu perfil",
  "/match/create": "Nova partida",
}

function currentPage(pathname: string) {
  const direct = ROUTE_NAMES[pathname]
  if (direct) return direct
  return ALL_NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href, item.activeHrefs, item.exact))?.label ?? "Timbas"
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const page = currentPage(pathname)

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-white/[0.07] bg-zinc-950/75 px-3 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:px-6 md:left-[65px]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-white/10 md:hidden">
          <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="Timbas" fill className="object-cover" />
        </span>
        <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600 sm:inline">Timbas</span>
        <Slash className="hidden h-3.5 w-3.5 text-zinc-800 sm:block" />
        <span className="truncate text-[13px] font-bold text-zinc-200">{page}</span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-2.5 py-1.5 lg:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-300/70">Sistema online</span>
        </div>
        <ImpersonationBanner />
        <UserMenu />
      </div>
    </header>
  )
}

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const keepRankingUntouched = pathname === "/ranking"

  return (
    <div key={pathname} className={keepRankingUntouched ? "" : "modern-app-surface"}>
      <DashboardAccessGate>{children}</DashboardAccessGate>
      {!keepRankingUntouched && (
        <div aria-hidden className="pointer-events-none mx-auto mt-12 flex items-center justify-center gap-2 pb-2 text-zinc-800">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-current" />
          <Radio className="h-3 w-3" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-current" />
        </div>
      )}
    </div>
  )
}
