"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { FOOTER_ITEMS, NAV_GROUPS } from "@/lib/navigation"

export function DashboardSidebar() {
  return (
    <AppSidebar
      groups={NAV_GROUPS}
      footerItems={FOOTER_ITEMS}
      homeHref="/dashboard"
      brand="Timbas"
    />
  )
}
