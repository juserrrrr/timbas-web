"use client"

import { usePathname } from "next/navigation"
import { ServerSelector } from "@/components/server-selector"

const SERVER_SCOPED_ROUTES = [
  "/dashboard",
  "/dashboard/active",
  "/dashboard/ranking",
  "/dashboard/history",
  "/dashboard/teams",
  "/dashboard/stats",
  "/dashboard/versus",
  "/dashboard/match",
]

export function ServerSelectorSlot() {
  const pathname = usePathname()
  const isScoped = SERVER_SCOPED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (!isScoped) return null

  return (
    <>
      <ServerSelector />
      <div className="h-6 w-px bg-white/[0.08]" />
    </>
  )
}
