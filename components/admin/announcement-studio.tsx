"use client"

import { useEffect, useState } from "react"
import { Eye, Loader2, Megaphone, Send, Sparkles } from "lucide-react"
import { AnnouncementContent } from "@/components/announcement-content"
import { Button } from "@/components/ui/button"
import { getAdminAnnouncement, publishAnnouncement, type PlatformAnnouncement } from "@/lib/services/announcements"

const EXAMPLE = `## O que chegou

- **Carta especial do campeão** com time, elenco completo e QR Code.
- Premiações individuais exportadas em alta resolução.
- Editor visual disponível no painel administrativo.

### Como usar

1. Abra um campeonato encerrado.
2. Entre em **Premiações e estatísticas**.
3. Use **Baixar PNG** na carta desejada.

> Esta janela aparece somente uma vez para cada nova publicação.`

export function AnnouncementStudio() {
  const [title, setTitle] = useState("Novidades da plataforma")
  const [summary, setSummary] = useState("Confira o que mudou nesta atualização.")
  const [content, setContent] = useState(EXAMPLE)
  const [latest, setLatest] = useState<PlatformAnnouncement | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    void getAdminAnnouncement().then((announcement) => {
      setLatest(announcement)
      if (!announcement) return
      setTitle(announcement.title)
      setSummary(announcement.summary)
      setContent(announcement.content)
    }).catch(() => setNotice("Não foi possível carregar a última publicação."))
  }, [])

  async function publish() {
    setPublishing(true)
    setNotice("")
    try {
      const announcement = await publishAnnouncement({ title, summary, content })
      setLatest(announcement)
      setNotice("Novidade publicada. Ela substituiu a anterior e aparecerá uma vez para cada visitante.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível publicar a novidade.")
    } finally {
      setPublishing(false)
    }
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(420px,1.2fr)]">
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">Título<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-400" /></label>
        <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">Resumo<input value={summary} maxLength={240} onChange={(event) => setSummary(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-400" /></label>
      </div>
      <label className="block space-y-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">Conteúdo em Markdown<textarea value={content} maxLength={20000} onChange={(event) => setContent(event.target.value)} rows={16} spellCheck className="w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 font-mono text-xs font-normal normal-case leading-6 tracking-normal text-gray-200 outline-none focus:border-amber-400" /></label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] leading-5 text-gray-600">Aceita títulos, subtítulos, listas, links, citações, tabelas, negrito e código no padrão GitHub.</p>
        <Button type="button" disabled={publishing || !title.trim() || !content.trim()} onClick={() => void publish()} className="gap-2 bg-amber-400 font-black text-black hover:bg-amber-300">{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publicar atualização</Button>
      </div>
      {latest && <p className="text-[10px] text-gray-600">Última publicação: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(latest.publishedAt))}. Publicar novamente substitui esta versão.</p>}
      {notice && <p className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[11px] text-gray-300">{notice}</p>}
    </div>
    <div className="min-w-0 overflow-hidden rounded-2xl border border-amber-400/20 bg-[#08080d] shadow-2xl">
      <div className="border-b border-white/[0.07] bg-gradient-to-br from-amber-400/[0.15] via-orange-500/[0.04] to-transparent px-6 py-5">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300"><Eye className="h-3.5 w-3.5" />Pré-visualização do modal</p>
        <h5 className="text-2xl font-black text-white">{title || "Título da novidade"}</h5>
        {summary && <p className="mt-2 text-sm leading-6 text-gray-300">{summary}</p>}
      </div>
      <div className="max-h-[560px] overflow-y-auto px-6 py-3"><AnnouncementContent content={content || "Escreva a atualização em Markdown."} /></div>
      <div className="flex items-center gap-2 border-t border-white/[0.07] px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-600"><Sparkles className="h-3.5 w-3.5 text-amber-400" />Aparece uma vez por publicação</div>
    </div>
  </div>
}
