"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LockKeyhole, ToggleRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useEnabledFeatures } from "@/hooks/use-enabled-features"
import { useMyPermissions } from "@/hooks/use-my-permissions"
import { ALL_NAV_ITEMS, isNavItemActive, normalizeDashboardPathname } from "@/lib/navigation"

export function DashboardAccessGate({ children }: { children: ReactNode }) {
  const pathname = normalizeDashboardPathname(usePathname())
  const flags = useEnabledFeatures()
  const permissions = useMyPermissions()
  const candidates = [...ALL_NAV_ITEMS].sort((left, right) => right.href.length - left.href.length)
  const item = candidates.find((candidate) => (
    candidate.href === "/dashboard"
      ? pathname === candidate.href
      : pathname === candidate.href || pathname.startsWith(`${candidate.href}/`)
  )) ?? candidates.find((candidate) => isNavItemActive(pathname, candidate.href, candidate.activeHrefs))

  if (!item) return children
  if (flags === null || permissions === null) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Spinner className="size-6 text-blue-400" /></div>
  }

  const featureLocked = Boolean(item.flag) && !flags.includes(item.flag!)
  const permissionLocked = Boolean(item.permission) && !permissions.includes(item.permission!)
  if (!featureLocked && !permissionLocked) return children

  const Icon = featureLocked ? ToggleRight : LockKeyhole
  return (
    <div className="mx-auto flex min-h-[62vh] max-w-xl items-center">
      <Card className="w-full border-amber-400/15 bg-amber-400/[0.025] p-8 text-center shadow-2xl shadow-black/20">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><Icon className="h-6 w-6" /></span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/70">Acesso limitado</p>
        <h1 className="mt-2 text-2xl font-black text-white">{item.label} não está disponível</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
          {featureLocked
            ? "Este recurso foi desligado globalmente pelo administrador da plataforma."
            : "Seu acesso inicial e seus grupos atuais não incluem esta área."}
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black transition hover:bg-gray-200">Voltar ao início</Link>
      </Card>
    </div>
  )
}
