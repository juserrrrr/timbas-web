"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { FOOTER_ITEMS, visibleGroups } from "@/lib/navigation"
import { useEnabledFeatures } from "@/hooks/use-enabled-features"

export function DashboardSidebar() {
  const flags = useEnabledFeatures()

  return (
    <AppSidebar
      groups={visibleGroups(flags)}
      footerItems={FOOTER_ITEMS}
      homeHref="/dashboard"
      brand="Timbas"
    />
  )
}
