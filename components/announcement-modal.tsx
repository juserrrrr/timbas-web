"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Check, Megaphone, Sparkles } from "lucide-react"
import { AnnouncementContent } from "@/components/announcement-content"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getLatestAnnouncement, type PlatformAnnouncement } from "@/lib/services/announcements"

const SEEN_KEY = "timbas.latestAnnouncementSeen"

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<PlatformAnnouncement | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    void getLatestAnnouncement().then((latest) => {
      if (!active || !latest || window.localStorage.getItem(SEEN_KEY) === latest.id) return
      setAnnouncement(latest)
      setOpen(true)
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  function dismiss() {
    if (announcement) window.localStorage.setItem(SEEN_KEY, announcement.id)
    setOpen(false)
  }

  return <Dialog open={open} onOpenChange={(next) => next ? setOpen(true) : dismiss()}>
    <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[1.75rem] border-blue-400/20 bg-[#06070b]/98 p-0 text-white shadow-[0_35px_120px_rgba(0,0,0,0.85),-20px_0_70px_rgba(37,99,235,0.08),20px_0_70px_rgba(220,38,38,0.07)] backdrop-blur-2xl sm:max-w-3xl">
      <div className="relative overflow-hidden border-b border-white/[0.07] bg-[radial-gradient(circle_at_85%_0%,rgba(37,99,235,0.22),transparent_38%),radial-gradient(circle_at_10%_100%,rgba(220,38,38,0.13),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(5,7,12,0.98))] px-6 py-7 sm:px-9 sm:py-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/50 via-blue-400/90 to-transparent" />
        <div className="pointer-events-none absolute -right-8 -top-12 select-none text-[150px] font-black leading-none text-white/[0.025]">NEW</div>
        <DialogHeader className="relative text-left">
          <div className="mb-3 flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-blue-200"><Sparkles className="h-3.5 w-3.5 text-red-400" />Novidade no Timbas</div>
          <DialogTitle className="max-w-2xl pr-8 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">{announcement?.title}</DialogTitle>
          {announcement?.summary && <DialogDescription className="mt-1 max-w-2xl text-sm leading-6 text-gray-300 sm:text-[15px]">{announcement.summary}</DialogDescription>}
          {announcement && <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500"><CalendarDays className="h-3.5 w-3.5 text-blue-400/70" />{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(announcement.publishedAt))}</p>}
        </DialogHeader>
      </div>
      <div className="max-h-[56dvh] overflow-y-auto px-6 sm:px-9 [scrollbar-color:rgba(59,130,246,0.35)_transparent] [scrollbar-width:thin]">
        {announcement && <AnnouncementContent content={announcement.content} />}
      </div>
      <DialogFooter className="flex-row items-center justify-between border-t border-white/[0.07] bg-white/[0.015] px-6 py-4 sm:px-9">
        <span className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-600 sm:flex"><Megaphone className="h-3.5 w-3.5 text-blue-400/60" />Exibido uma vez por publicação</span>
        <Button type="button" onClick={dismiss} className="w-full gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 font-black text-white shadow-lg shadow-blue-500/10 hover:from-blue-500 hover:to-red-500 sm:w-auto"><Check className="h-4 w-4" />Explorar novidades</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
