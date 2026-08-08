"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ExternalLink, RefreshCw, Search, Shield } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createEaClub, getEaClubs, searchEaClubs, syncEaClub, validateEaClub } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubPreview } from "@/lib/services/ea-clubs.types"

export default function AdminEaClubsPage() {
  const [clubs, setClubs] = useState<EaClub[]>([])
  const [results, setResults] = useState<EaClubPreview[] | null>(null)
  const [clubName, setClubName] = useState("")
  const [externalClubId, setExternalClubId] = useState("")
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setClubs(await getEaClubs())
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os clubes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function search(event: FormEvent) {
    event.preventDefault()
    setSearching(true)
    setResults(null)
    setError("")
    try {
      setResults(await searchEaClubs(clubName.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível buscar clubes")
    } finally {
      setSearching(false)
    }
  }

  async function connect(found: EaClubPreview) {
    setBusyId(found.externalClubId)
    setError("")
    try {
      const club = await createEaClub({
        externalClubId: found.externalClubId,
        name: found.name,
        platform: "common-gen5",
      })
      toast.success(`${club.name} conectado`)
      setResults(null)
      setClubName("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível conectar o clube")
    } finally {
      setBusyId("")
    }
  }

  async function connectById(event: FormEvent) {
    event.preventDefault()
    setBusyId(externalClubId)
    try {
      const found = await validateEaClub({ externalClubId, platform: "common-gen5" })
      await connect(found)
      setExternalClubId("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clube não encontrado")
      setBusyId("")
    }
  }

  async function synchronize(club: EaClub) {
    setBusyId(club.id)
    try {
      const result = await syncEaClub(club.id)
      toast.success(result.imported ? `${result.imported} partidas importadas` : "Nenhuma partida nova")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sincronizar")
    } finally {
      setBusyId("")
    }
  }

  return <div className="space-y-8">
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Administração</p><h1 className="text-3xl font-black text-white">EA FC Clubs</h1><p className="mt-1 text-sm text-gray-500">Conecte e sincronize os clubes disponíveis no dashboard.</p></div>

    <Card className="border-white/[0.07] bg-white/[0.025] p-6">
      <h2 className="mb-4 text-lg font-black text-white">Adicionar clube</h2>
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row"><div className="flex-1"><Label htmlFor="club-name" className="sr-only">Nome do clube</Label><Input id="club-name" value={clubName} onChange={event => setClubName(event.target.value)} placeholder="Nome do clube" minLength={2} required /></div><Button type="submit" disabled={searching}><Search className="mr-2 h-4 w-4" />{searching ? "Buscando..." : "Buscar clube"}</Button></form>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      {results && <div className="mt-5 space-y-2">{results.length ? results.map(found => <div key={found.externalClubId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/30 p-4"><div><p className="font-bold text-white">{found.name}</p><p className="text-xs text-gray-500">Club ID: {found.externalClubId}</p></div><Button size="sm" disabled={Boolean(busyId)} onClick={() => void connect(found)}>{busyId === found.externalClubId ? "Conectando..." : "Conectar clube"}</Button></div>) : <p className="py-4 text-center text-sm text-gray-500">Nenhum clube encontrado.</p>}</div>}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-5 border-t border-white/[0.07] pt-4"><CollapsibleTrigger className="flex w-full items-center justify-between text-sm text-gray-500 hover:text-white"><span>Opção avançada: conectar pelo Club ID</span><ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} /></CollapsibleTrigger><CollapsibleContent><form onSubmit={connectById} className="mt-4 flex gap-3"><Input value={externalClubId} onChange={event => setExternalClubId(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Club ID" required /><Button variant="outline" disabled={Boolean(busyId)}>Conectar pelo ID</Button></form></CollapsibleContent></Collapsible>
    </Card>

    <section><h2 className="mb-4 text-lg font-black text-white">Clubes conectados</h2>{loading ? <Card className="border-white/[0.07] bg-white/[0.025] p-8 text-center text-gray-500">Carregando...</Card> : clubs.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clubs.map(club => <Card key={club.id} className="border-white/[0.07] bg-white/[0.025] p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-500/10 p-3"><Shield className="h-5 w-5 text-blue-400" /></div><div className="min-w-0 flex-1"><p className="truncate font-black text-white">{club.nickname || club.name}</p><p className="text-xs text-gray-500">Club ID: {club.externalClubId}</p><p className="mt-2 text-xs text-gray-600">Último sync: {club.lastSyncAt ? new Date(club.lastSyncAt).toLocaleString("pt-BR") : "Nunca"}</p></div></div><div className="mt-4 flex gap-2"><Button size="sm" disabled={Boolean(busyId)} onClick={() => void synchronize(club)}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${busyId === club.id ? "animate-spin" : ""}`} />Sincronizar</Button><Button asChild size="sm" variant="outline"><Link href={`/dashboard/ea-clubs/${club.id}`}><ExternalLink className="mr-2 h-3.5 w-3.5" />Ver dashboard</Link></Button></div></Card>)}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-gray-500">Nenhum clube conectado.</Card>}</section>
  </div>
}
