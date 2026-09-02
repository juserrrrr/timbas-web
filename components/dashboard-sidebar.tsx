"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { footerItemsFor, navGroupsFor } from "@/lib/navigation"
import { useEnabledFeatures } from "@/hooks/use-enabled-features"
import { useMyPermissions } from "@/hooks/use-my-permissions"
import { useMyRole } from "@/hooks/use-my-role"

export function DashboardSidebar() {
  const flags = useEnabledFeatures()
  const permissions = useMyPermissions()
  const role = useMyRole()

  return (
    <AppSidebar
      groups={navGroupsFor(flags, permissions, role)}
      footerItems={footerItemsFor(flags, permissions, role)}
      homeHref="/dashboard"
      brand="Timbas"
    />
  )
}
