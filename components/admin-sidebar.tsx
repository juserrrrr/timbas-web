"use client"

import { LogOut, ShieldAlert } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { ADMIN_FOOTER_ITEMS, visibleAdminGroups } from "@/lib/admin-navigation"

export function AdminSidebar({
  permissions,
  userName,
  onLogout,
}: {
  permissions: string[]
  userName: string
  onLogout: () => void
}) {
  return (
    <AppSidebar
      groups={visibleAdminGroups(permissions)}
      footerItems={ADMIN_FOOTER_ITEMS}
      homeHref="/admin"
      brand="Timbas"
      brandAccent="Admin"
      logoBadge={
        <span className="absolute bottom-3 right-3 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 ring-2 ring-[#07070c]">
          <ShieldAlert className="h-2 w-2 text-white" />
        </span>
      }
      footer={(expanded) => (
        <button
          onClick={onLogout}
          className="flex h-11 w-full cursor-pointer items-center overflow-hidden rounded-xl text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <span className="flex h-11 w-[41px] flex-shrink-0 items-center justify-center">
            <LogOut className="h-[18px] w-[18px]" />
          </span>
          <span
            aria-hidden={!expanded}
            style={{ width: 186 }}
            className={`flex flex-shrink-0 flex-col pr-3 text-left transition-opacity duration-200 ${
              expanded ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            <span className="whitespace-nowrap text-[13px] font-semibold leading-tight">Sair</span>
            <span className="truncate text-[11px] leading-tight text-gray-600">{userName}</span>
          </span>
        </button>
      )}
    />
  )
}
