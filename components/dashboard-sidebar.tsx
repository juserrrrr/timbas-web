"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { FOOTER_ITEMS, navGroupsFor } from "@/lib/navigation"
import { useEnabledFeatures } from "@/hooks/use-enabled-features"

export function DashboardSidebar() {
  const flags = useEnabledFeatures()

  return (
    <AppSidebar
      groups={navGroupsFor(flags)}
      footerItems={FOOTER_ITEMS}
      homeHref="/dashboard"
      brand="Timbas"
    />
  )
}
