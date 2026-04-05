"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  page: number
  pages: number
  total: number
}

export function HistoryPagination({ page, pages, total }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (pages <= 1) return null

  const navigate = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
      <p className="text-sm text-gray-500">{total} partidas no total</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(page - 1)}
          disabled={page === 1}
          className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-white px-2">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(page + 1)}
          disabled={page === pages}
          className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
