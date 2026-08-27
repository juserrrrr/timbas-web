"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  Clock,
  ExternalLink,
  Gamepad2,
  Hash,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldPlus,
} from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageLoading } from "@/components/competitions/shared"
import {
  AdminEmpty,
  AdminHeader,
  AdminMetrics,
  InlineNotice,
  SectionCard,
  TabCount,
  adminTabClass,
  adminTabListClass,
} from "@/components/admin/shell"
import { createEaClub, getEaClubs, searchEaClubs, syncEaClub, validateEaClub } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubPreview } from "@/lib/services/ea-clubs.types"

function formatSync(value: string | null | undefined) {
  if (!value) return "nunca sincronizado"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "nunca sincronizado"
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

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

  useEffect(() => {
    void load()
  }, [load])

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

  if (loading && clubs.length === 0) return <PageLoading />

  const synced = clubs.filter((club) => club.lastSyncAt)
  const lastSync = synced
    .map((club) => new Date(club.lastSyncAt!).getTime())
    .sort((a, b) => b - a)
    .at(0)

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Integrações"
        title="EA FC Clubs"
        subtitle="Conecte um clube da EA e traga as partidas dele para dentro do Timbas."
        icon={Gamepad2}
        accent="blue"
      />

      <AdminMetrics
        columns={3}
        items={[
          { label: "Clubes", value: clubs.length, hint: "conectados ao Timbas", icon: Shield, accent: "blue" },
          {
            label: "Já sincronizados",
            value: synced.length,
            hint: `${clubs.length - synced.length} nunca importaram`,
            icon: RefreshCw,
            accent: "emerald",
          },
          {
            label: "Último sync",
            value: lastSync ? new Date(lastSync).toLocaleDateString("pt-BR") : "-",
            hint: lastSync ? new Date(lastSync).toLocaleTimeString("pt-BR", { timeStyle: "short" }) : "nenhum ainda",
            icon: Clock,
            accent: "amber",
          },
        ]}
      />

      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      <Tabs defaultValue="clubs" className="gap-4">
        <TabsList className={adminTabListClass()}>
          <TabsTrigger value="clubs" className={adminTabClass("blue")}>
            <Shield className="h-3.5 w-3.5" />
            Clubes conectados
            <TabCount value={clubs.length} />
          </TabsTrigger>
          <TabsTrigger value="add" className={adminTabClass("blue")}>
            <ShieldPlus className="h-3.5 w-3.5" />
            Conectar clube
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clubs">
          {clubs.length === 0 ? (
            <AdminEmpty
              icon={Shield}
              title="Nenhum clube conectado"
              description="Busque o clube pelo nome na aba ao lado. Depois de conectado, cada sincronização traz as partidas novas."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-blue-400 opacity-30 transition-opacity group-hover:opacity-70"
                  />
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">{club.nickname || club.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-gray-600">
                        <Hash className="h-3 w-3" />
                        {club.externalClubId}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    {formatSync(club.lastSyncAt)}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      disabled={Boolean(busyId)}
                      onClick={() => void synchronize(club)}
                      className="bg-blue-500 text-white hover:bg-blue-400"
                    >
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busyId === club.id ? "animate-spin" : ""}`} />
                      Sincronizar
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-white/10">
                      <Link href={`/dashboard/ea-clubs/${club.id}`}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Ver no dashboard
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-3">
          <SectionCard
            icon={Search}
            accent="blue"
            title="Procurar pelo nome"
            description="O nome precisa bater com o do clube na EA. A busca devolve os que combinam para você escolher o certo."
          >
            <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <Label htmlFor="club-name" className="sr-only">
                  Nome do clube
                </Label>
                <Input
                  id="club-name"
                  value={clubName}
                  onChange={(event) => setClubName(event.target.value)}
                  placeholder="Nome do clube na EA"
                  minLength={2}
                  required
                  className="h-10 border-white/10 bg-black/25"
                />
              </div>
              <Button type="submit" disabled={searching} className="bg-blue-500 text-white hover:bg-blue-400">
                <Search className="mr-1.5 h-4 w-4" />
                {searching ? "Buscando..." : "Buscar clube"}
              </Button>
            </form>

            {results && (
              <div className="mt-4 space-y-2">
                {results.length ? (
                  results.map((found) => (
                    <div
                      key={found.externalClubId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-black text-white">{found.name}</p>
                        <p className="font-mono text-[11px] text-gray-600">Club ID {found.externalClubId}</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={Boolean(busyId)}
                        onClick={() => void connect(found)}
                        className="bg-blue-500 text-white hover:bg-blue-400"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        {busyId === found.externalClubId ? "Conectando..." : "Conectar"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-[12px] text-gray-500">
                    Nenhum clube com esse nome. Confira a grafia exata usada na EA.
                  </p>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={Hash}
            accent="slate"
            title="Já sabe o Club ID?"
            description="O número que aparece na URL do clube no site da EA conecta direto, sem passar pela busca."
          >
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between text-[12px] font-bold text-gray-400 transition-colors hover:text-white">
                <span>Conectar pelo Club ID</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <form onSubmit={connectById} className="mt-4 flex gap-2">
                  <Input
                    value={externalClubId}
                    onChange={(event) => setExternalClubId(event.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="Somente números"
                    required
                    className="h-10 border-white/10 bg-black/25 font-mono"
                  />
                  <Button variant="outline" disabled={Boolean(busyId)} className="border-white/10">
                    Conectar pelo ID
                  </Button>
                </form>
              </CollapsibleContent>
            </Collapsible>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
