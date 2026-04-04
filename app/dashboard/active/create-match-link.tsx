"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useNavigation } from "@/lib/navigation-context"

export function CreateMatchLink() {
  const { navigate } = useNavigation()
  return (
    <Link
      href="/dashboard/match/create"
      prefetch={false}
      onClick={(e) => { e.preventDefault(); navigate("/dashboard/match/create") }}
      className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
    >
      <Plus className="h-4 w-4" />
      Nova partida
    </Link>
  )
}
