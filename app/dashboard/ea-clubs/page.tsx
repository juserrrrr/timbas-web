"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Gamepad2, Plus, Search, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createEaClub, getEaClubs, searchEaClubs, validateEaClub } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubPreview } from "@/lib/services/ea-clubs.types"
import { ErrorState, PageLoading } from "@/components/ea-clubs/shared"

export default function EaClubsPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<EaClub[]>([])
  const [results, setResults] = useState<EaClubPreview[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [connectingId, setConnectingId] = useState("")
  const [error, setError] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [clubName, setClubName] = useState("")
  const [externalClubId, setExternalClubId] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try { setClubs(await getEaClubs()) } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function search(event: FormEvent) {
    event.preventDefault(); setSearching(true); setError(""); setResults(null)
    try { setResults(await searchEaClubs(clubName.trim())) } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível buscar clubes") } finally { setSearching(false) }
  }

  async function connect(found: EaClubPreview) {
    setConnectingId(found.externalClubId); setError("")
    try {
      const club = await createEaClub({ externalClubId: found.externalClubId, name: found.name, platform: "common-gen5" })
      router.push(`/dashboard/ea-clubs/${club.id}`)
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível conectar o clube") } finally { setConnectingId("") }
  }

  async function connectById(event: FormEvent) {
    event.preventDefault(); setConnectingId(externalClubId); setError("")
    try {
      const found = await validateEaClub({ externalClubId, platform: "common-gen5" })
      await connect(found)
    } catch (err) { setError(err instanceof Error ? err.message : "Não encontramos nenhum clube com esse Club ID."); setConnectingId("") }
  }

  if (loading) return <PageLoading />
  if (error && !formOpen && clubs.length === 0) return <ErrorState message={error} retry={() => void load()} />

  return <div className="dashboard-view space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Integração esportiva</p><h1 className="text-3xl font-black text-white">EA FC Clubs</h1><p className="text-sm text-gray-500">Encontre seu clube e acompanhe partidas e jogadores.</p></div>{clubs.length > 0 && !formOpen && <Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar clube</Button>}</div>

    {clubs.length > 0 && !formOpen ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clubs.map(club => <button key={club.id} onClick={() => router.push(`/dashboard/ea-clubs/${club.id}`)} className="text-left"><Card className="h-full border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-blue-500/30 hover:bg-blue-500/5"><div className="flex items-start gap-4"><div className="rounded-xl bg-blue-500/10 p-3"><Shield className="h-6 w-6 text-blue-400" /></div><div className="min-w-0"><h2 className="truncate text-lg font-black text-white">{club.nickname || club.name}</h2>{club.nickname && <p className="truncate text-sm text-gray-400">{club.name}</p>}<p className="mt-2 text-xs text-gray-500">Club ID: {club.externalClubId}</p></div></div></Card></button>)}</div> :
      <Card className="mx-auto w-full max-w-2xl border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="mb-6 text-center"><Gamepad2 className="mx-auto mb-3 h-10 w-10 text-blue-400" /><h2 className="text-xl font-black text-white">{clubs.length ? "Adicionar outro clube" : "Você ainda não conectou um clube do EA Sports FC."}</h2><p className="mt-1 text-sm text-gray-400">Busque pelo nome usado no EA FC Clubs.</p></div>
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row"><div className="flex-1"><Label htmlFor="club-name" className="sr-only">Nome do clube</Label><Input id="club-name" value={clubName} onChange={event => setClubName(event.target.value)} placeholder="Nome do clube" minLength={2} required autoFocus /></div><Button type="submit" disabled={searching}><Search className="mr-2 h-4 w-4" />{searching ? "Buscando..." : "Buscar clube"}</Button></form>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        {results && <div className="mt-6 space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{results.length ? `${results.length} clube${results.length === 1 ? "" : "s"} encontrado${results.length === 1 ? "" : "s"}` : "Nenhum clube encontrado"}</p>{results.map(found => <div key={found.externalClubId} className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/30 p-4 sm:flex-row sm:items-center"><div className="min-w-0"><p className="truncate font-black text-white">{found.name}</p><p className="text-xs text-gray-500">Club ID: {found.externalClubId}</p></div><Button size="sm" disabled={Boolean(connectingId)} onClick={() => void connect(found)}>{connectingId === found.externalClubId ? "Conectando..." : "Conectar clube"}</Button></div>)}</div>}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-6 border-t border-white/[0.07] pt-4"><CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-gray-500 transition hover:text-white"><span>Opção avançada: conectar pelo Club ID</span><ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} /></CollapsibleTrigger><CollapsibleContent><form onSubmit={connectById} className="mt-4 flex flex-col gap-3 sm:flex-row"><div className="flex-1"><Label htmlFor="club-id" className="sr-only">Club ID</Label><Input id="club-id" value={externalClubId} onChange={event => setExternalClubId(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Club ID" required /></div><Button variant="outline" type="submit" disabled={Boolean(connectingId)}>{connectingId ? "Validando..." : "Conectar pelo ID"}</Button></form></CollapsibleContent></Collapsible>
        {clubs.length > 0 && <Button variant="ghost" className="mt-5 w-full" onClick={() => { setFormOpen(false); setResults(null); setError("") }}>Cancelar</Button>}
      </Card>}
  </div>
}
