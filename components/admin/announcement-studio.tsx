"use client"

import { useEffect, useState } from "react"
import { Eye, Loader2, Megaphone, Send, Sparkles } from "lucide-react"
import { AnnouncementContent } from "@/components/announcement-content"
import { Button } from "@/components/ui/button"
import { getAdminAnnouncement, publishAnnouncement, type PlatformAnnouncement } from "@/lib/services/announcements"

const EXAMPLE = `## Uma experiência melhor em cada partida

- **Transmissões mais completas:** compartilhe sua tela, acompanhe partidas ao vivo e convide a galera por um link simples, com uma experiência mais estável e organizada para quem transmite e para quem assiste.
- **Campeonatos mais fáceis de acompanhar:** inscrições, equipes, chaves, horários, check-in e resultados agora ficam reunidos em um fluxo mais claro do início até a final.
- **Resultados conectados ao EA FC:** partidas dos campeonatos podem ser conferidas com dados do EA FC Clubs, trazendo mais agilidade e confiança para a competição.
- **Liga Draft evoluída:** elencos, escolhas, mercado, escalações, rodadas e disputas ficam centralizados para jogadores e organizadores.
- **EA FC Clubs em destaque:** consulte clubes, jogadores, histórico, rankings e estatísticas sincronizadas em páginas próprias.
- **Premiações especiais:** campeão, craque e destaques individuais ganharam cartas em alta resolução, com QR Code e visual exclusivo para compartilhar.
- **Navegação renovada:** menus mais organizados, telas mais modernas e uma experiência melhor tanto no computador quanto no celular.

> O Timbas está sendo preparado para deixar cada competição mais simples de organizar, acompanhar e compartilhar.`

export function AnnouncementStudio() {
  const [title, setTitle] = useState("O Timbas evoluiu")
  const [summary, setSummary] = useState("Transmissões, competições e estatísticas ganharam uma experiência mais completa e moderna.")
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
        <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">Título<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-blue-400" /></label>
        <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">Resumo<input value={summary} maxLength={240} onChange={(event) => setSummary(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-blue-400" /></label>
      </div>
      <label className="block space-y-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">Conteúdo em Markdown<textarea value={content} maxLength={20000} onChange={(event) => setContent(event.target.value)} rows={16} spellCheck className="w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 font-mono text-xs font-normal normal-case leading-6 tracking-normal text-gray-200 outline-none focus:border-blue-400" /></label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] leading-5 text-gray-600">Aceita títulos, subtítulos, listas, links, citações, tabelas, negrito e código no padrão GitHub.</p>
        <Button type="button" disabled={publishing || !title.trim() || !content.trim()} onClick={() => void publish()} className="gap-2 bg-gradient-to-r from-blue-600 to-red-600 font-black text-white hover:from-blue-500 hover:to-red-500">{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publicar atualização</Button>
      </div>
      {latest && <p className="text-[10px] text-gray-600">Última publicação: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(latest.publishedAt))}. Publicar novamente substitui esta versão.</p>}
      {notice && <p className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[11px] text-gray-300">{notice}</p>}
    </div>
    <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-blue-400/20 bg-[#06070b] shadow-[0_28px_90px_rgba(0,0,0,0.55),-12px_0_45px_rgba(37,99,235,0.06),12px_0_45px_rgba(220,38,38,0.05)]">
      <div className="relative overflow-hidden border-b border-white/[0.07] bg-[radial-gradient(circle_at_85%_0%,rgba(37,99,235,0.22),transparent_40%),radial-gradient(circle_at_10%_100%,rgba(220,38,38,0.12),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(5,7,12,0.98))] px-6 py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/50 via-blue-400/90 to-transparent" />
        <p className="mb-3 flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-200"><Eye className="h-3.5 w-3.5 text-red-400" />Pré-visualização do modal</p>
        <h5 className="text-3xl font-black tracking-tight text-white">{title || "Título da novidade"}</h5>
        {summary && <p className="mt-2 text-sm leading-6 text-gray-300">{summary}</p>}
      </div>
      <div className="max-h-[560px] overflow-y-auto px-6 [scrollbar-color:rgba(59,130,246,0.35)_transparent] [scrollbar-width:thin]"><AnnouncementContent content={content || "Escreva a atualização em Markdown."} /></div>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-6 py-4"><span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-gray-600"><Sparkles className="h-3.5 w-3.5 text-blue-400" />Aparece uma vez por publicação</span><span className="rounded-lg bg-gradient-to-r from-blue-600 to-red-600 px-3 py-2 text-[10px] font-black text-white">Explorar novidades</span></div>
    </div>
  </div>
}
