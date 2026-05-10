"use client"

import Link from "next/link"
import { ScoutResult } from "@/lib/services/clash"
import ClashResultsView from "@/app/dashboard/clash/clash-results-view"
import { ShieldAlert, Clock, ExternalLink } from "lucide-react"

interface Props {
  result: { data: ScoutResult; teamName: string; createdAt: string }
}

export default function SharedScoutView({ result }: Props) {
  const date = new Date(result.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="min-h-screen bg-[#04040a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">
                Clash <span className="text-amber-400">Scout</span>
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <Clock className="h-3 w-3" />
                Salvo em {date}
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/clash"
            className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-400 transition-all hover:border-amber-500/35 hover:bg-amber-500/15"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Fazer nova análise
          </Link>
        </div>

        {/* Read-only scout results */}
        <ClashResultsView data={result.data} />
      </div>
    </div>
  )
}
