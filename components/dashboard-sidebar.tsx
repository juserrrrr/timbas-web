"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { footerItemsFor, navGroupsFor } from "@/lib/navigation"
import { useEnabledFeatures } from "@/hooks/use-enabled-features"
import { useMyPermissions } from "@/hooks/use-my-permissions"

export function DashboardSidebar() {
  const flags = useEnabledFeatures()
  const permissions = useMyPermissions()

  return (
    <AppSidebar
      groups={navGroupsFor(flags, permissions)}
      footerItems={footerItemsFor(flags, permissions)}
      homeHref="/dashboard"
      brand="Timbas"
    />
  )
}
