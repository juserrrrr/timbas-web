"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { CalendarDays, Check, Megaphone, Sparkles } from "lucide-react"
import { AnnouncementContent } from "@/components/announcement-content"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getLatestAnnouncement, type PlatformAnnouncement } from "@/lib/services/announcements"
import { getToken } from "@/lib/auth"

const SEEN_KEY = "timbas.latestAnnouncementSeen"
const AUTHENTICATED_ROOTS = new Set([
  "matches", "match", "history", "stats", "teams", "versus", "ranking",
  "tournaments", "draft", "ea-clubs", "clash", "verify", "lol-profile",
  "streams", "profile", "settings",
])

export function AnnouncementModal() {
  const pathname = usePathname()
  const [announcement, setAnnouncement] = useState<PlatformAnnouncement | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const root = pathname.split("/")[1]
    const isAuthenticatedArea = pathname === "/dashboard"
      || AUTHENTICATED_ROOTS.has(root)
      || (pathname.startsWith("/admin") && pathname !== "/admin/login")
    if (!isAuthenticatedArea || !getToken()) {
      setOpen(false)
      return
    }

    let active = true
    void getLatestAnnouncement().then((latest) => {
      if (!active || !latest || window.localStorage.getItem(SEEN_KEY) === latest.id) return
      setAnnouncement(latest)
      setOpen(true)
    }).catch(() => undefined)
    return () => { active = false }
  }, [pathname])

  function dismiss() {
    if (announcement) window.localStorage.setItem(SEEN_KEY, announcement.id)
    setOpen(false)
  }

  return <Dialog open={open} onOpenChange={(next) => next ? setOpen(true) : dismiss()}>
    <DialogContent className="grid max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[1.5rem] border-blue-400/20 bg-zinc-950/98 p-0 text-white shadow-2xl shadow-black/80 backdrop-blur-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl sm:rounded-[1.75rem]">
      <div className="relative overflow-hidden border-b border-white/[0.07] bg-[radial-gradient(circle_at_85%_0%,rgb(37_99_235/0.22),transparent_38%),radial-gradient(circle_at_10%_100%,rgb(220_38_38/0.13),transparent_35%),linear-gradient(135deg,rgb(15_23_42/0.95),rgb(5_7_12/0.98))] px-5 py-5 sm:px-9 sm:py-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/50 via-blue-400/90 to-transparent" />
        <div className="pointer-events-none absolute -right-8 -top-12 select-none text-[150px] font-black leading-none text-white/[0.025]">NEW</div>
        <DialogHeader className="relative text-left">
          <div className="mb-3 flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-blue-200"><Sparkles className="h-3.5 w-3.5 text-red-400" />Novidade no Timbas</div>
          <DialogTitle className="max-w-2xl pr-8 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">{announcement?.title}</DialogTitle>
          {announcement?.summary && <DialogDescription className="mt-1 max-w-2xl text-sm leading-6 text-gray-300 sm:text-[15px]">{announcement.summary}</DialogDescription>}
          {announcement && <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500"><CalendarDays className="h-3.5 w-3.5 text-blue-400/70" />{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(announcement.publishedAt))}</p>}
        </DialogHeader>
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-9 [scrollbar-color:rgb(59_130_246/0.35)_transparent] [scrollbar-width:thin]">
        {announcement && <AnnouncementContent content={announcement.content} />}
      </div>
      <DialogFooter className="flex-shrink-0 flex-row items-center justify-between border-t border-white/[0.07] bg-white/[0.015] px-5 py-3 sm:px-9 sm:py-4">
        <span className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-600 sm:flex"><Megaphone className="h-3.5 w-3.5 text-blue-400/60" />Exibido uma vez por publicação</span>
        <Button type="button" onClick={dismiss} className="w-full gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 font-black text-white shadow-lg shadow-blue-500/10 hover:from-blue-500 hover:to-red-500 sm:w-auto"><Check className="h-4 w-4" />Explorar novidades</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
