"use client"

import { useEffect, useState } from "react"
import { Eye, LogOut } from "lucide-react"
import { decodeToken, endImpersonation, getToken, type TokenPayload } from "@/lib/auth"

export function ImpersonationBanner() {
  const [session, setSession] = useState<TokenPayload | null>(null)

  useEffect(() => {
    const token = getToken()
    const payload = token ? decodeToken(token) : null
    if (payload?.impersonatedBy) setSession(payload)
  }, [])

  if (!session) return null
  return (
    <div className="mr-auto flex min-w-0 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-100">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">Visualizando como <b>@{session.name}</b></span>
      <button onClick={() => { if (endImpersonation()) window.location.assign('/admin/players') }} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-400 px-2 py-1 font-bold text-black hover:bg-amber-300">
        <LogOut className="h-3 w-3" />Voltar
      </button>
    </div>
  )
}
