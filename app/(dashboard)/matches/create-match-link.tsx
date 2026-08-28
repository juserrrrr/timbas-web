"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { NavigationLinkSignal } from "@/lib/navigation-context"

export function CreateMatchLink() {
  return (
    <Link
      href="/match/create"
      prefetch={true}
      className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
    >
      <NavigationLinkSignal />
      <Plus className="h-4 w-4" />
      Nova partida
    </Link>
  )
}
