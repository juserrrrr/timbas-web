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
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden border-amber-400/25 bg-[#08080d] p-0 text-white shadow-[0_30px_100px_rgba(0,0,0,0.75)] sm:max-w-2xl">
      <div className="relative overflow-hidden border-b border-white/[0.07] bg-gradient-to-br from-amber-400/[0.16] via-orange-500/[0.05] to-transparent px-6 py-6 sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-amber-300/10 blur-3xl" />
        <DialogHeader className="relative text-left">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300"><Sparkles className="h-3.5 w-3.5" />Novidade no Timbas</div>
          <DialogTitle className="pr-8 text-2xl font-black leading-tight sm:text-3xl">{announcement?.title}</DialogTitle>
          {announcement?.summary && <DialogDescription className="max-w-xl text-sm leading-6 text-gray-300">{announcement.summary}</DialogDescription>}
          {announcement && <p className="flex items-center gap-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-gray-500"><CalendarDays className="h-3.5 w-3.5" />{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(announcement.publishedAt))}</p>}
        </DialogHeader>
      </div>
      <div className="max-h-[58dvh] overflow-y-auto px-6 py-2 sm:px-8">
        {announcement && <AnnouncementContent content={announcement.content} />}
      </div>
      <DialogFooter className="border-t border-white/[0.07] bg-black/20 px-6 py-4 sm:px-8">
        <Button type="button" onClick={dismiss} className="gap-2 bg-amber-400 font-black text-black hover:bg-amber-300"><Check className="h-4 w-4" />Entendi, continuar</Button>
      </DialogFooter>
      <Megaphone className="pointer-events-none absolute bottom-5 left-6 h-5 w-5 text-white/10 sm:left-8" />
    </DialogContent>
  </Dialog>
}
