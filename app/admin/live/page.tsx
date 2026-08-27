"use client"

import { useEffect, useState } from "react"
import { Hash, MessageSquare, Radio, RadioTower, Save, Server, Users } from "lucide-react"
import { toast } from "@/lib/toast"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminEmpty, AdminHeader, AdminMetrics, SectionCard, adminTabClass, adminTabListClass } from "@/components/admin/shell"
import { getToken } from "@/lib/auth"
import { TIMBAS_SERVER_ID } from "@/lib/servers"
import {
  getAnnouncementGuilds,
  setAnnouncementChannel,
  type AnnouncementGuild,
  type LiveMonitor,
  type SfuStatus,
} from "@/lib/services/streaming"
import { LiveMonitorPanel } from "./live-monitor-panel"
import { SfuPanel } from "./sfu-panel"

/// O Radix não aceita item com valor vazio, então "não anunciar" precisa de um
/// valor próprio que é traduzido de volta para vazio ao salvar.
const NO_CHANNEL = "__none__"

export default function LiveAdminPage() {
  const [guilds, setGuilds] = useState<AnnouncementGuild[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [monitor, setMonitor] = useState<LiveMonitor | null>(null)
  const [sfu, setSfu] = useState<SfuStatus | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getAnnouncementGuilds(token)
      .then((items) => setGuilds(items.filter((guild) => guild.id === TIMBAS_SERVER_ID)))
      .catch((error: unknown) =>
        toast.error("Erro ao carregar o Timbas", { description: error instanceof Error ? error.message : undefined }),
      )
      .finally(() => setLoading(false))
  }, [])

  const changeChannel = (guildId: string, channelId: string) => {
    setGuilds((current) =>
      current.map((guild) => (guild.id === guildId ? { ...guild, channelId: channelId || null } : guild)),
    )
  }

  const save = async (guild: AnnouncementGuild) => {
    const token = getToken()
    if (!token) return
    setSaving(guild.id)
    try {
      await setAnnouncementChannel(token, guild.id, guild.channelId)
      toast.success(guild.channelId ? "Canal de anúncio salvo" : "Anúncios desativados no Timbas")
    } catch (error: unknown) {
      toast.error("Erro ao salvar", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSaving(null)
    }
  }

  const liveNow = monitor?.streams.filter((stream) => stream.live).length ?? 0
  const watching =
    monitor?.streams.reduce(
      (total, stream) => total + stream.peers.filter((peer) => !peer.isHost && peer.attached).length,
      0,
    ) ?? 0
  const announceChannel = guilds[0]?.channels.find((channel) => channel.id === guilds[0]?.channelId)

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Integrações"
        title="Transmissões"
        subtitle="Por onde o vídeo passa, quem está no ar agora e onde o bot avisa a galera."
        icon={Radio}
        accent="rose"
      />

      <AdminMetrics
        items={[
          { label: "No ar agora", value: liveNow, hint: "lives com imagem", icon: RadioTower, accent: "rose" },
          { label: "Assistindo", value: watching, hint: "pessoas em sala", icon: Users, accent: "blue" },
          {
            label: "Servidor",
            value: sfu ? (sfu.enabled ? "Ativo" : sfu.configured ? "Parado" : "Ausente") : "-",
            hint: sfu?.enabled ? "distribuindo o vídeo" : "lives ponto a ponto",
            icon: Server,
            accent: sfu?.enabled ? "emerald" : "slate",
          },
          {
            label: "Anúncio",
            value: announceChannel ? `#${announceChannel.name}` : "Desligado",
            hint: "canal no Discord",
            icon: MessageSquare,
            accent: announceChannel ? "violet" : "slate",
          },
        ]}
      />

      <Tabs defaultValue="monitor" className="gap-4">
        <TabsList className={adminTabListClass()}>
          <TabsTrigger value="monitor" className={adminTabClass("rose")}>
            <RadioTower className="h-3.5 w-3.5" />
            No ar agora
          </TabsTrigger>
          <TabsTrigger value="server" className={adminTabClass("rose")}>
            <Server className="h-3.5 w-3.5" />
            Servidor
          </TabsTrigger>
          <TabsTrigger value="announce" className={adminTabClass("rose")}>
            <MessageSquare className="h-3.5 w-3.5" />
            Anúncio no Discord
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <LiveMonitorPanel onData={setMonitor} />
        </TabsContent>

        {/* Montado desde o começo: o topo mostra o estado do servidor sem
            precisar que alguém abra esta aba. */}
        <TabsContent value="server" forceMount className="data-[state=inactive]:hidden">
          <SfuPanel onStatus={setSfu} />
        </TabsContent>

        <TabsContent value="announce">
          <SectionCard
            icon={MessageSquare}
            accent="rose"
            title="Aviso de live no Discord"
            description="Quando alguém abre uma transmissão, o bot manda a mensagem neste canal, marca quem começou e anexa o link para assistir."
            flush
          >
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner className="size-5 text-rose-400" />
              </div>
            ) : guilds.length === 0 ? (
              <div className="p-5">
                <AdminEmpty
                  icon={MessageSquare}
                  title="O bot não está no Timbas"
                  description="Convide o bot para o servidor do Discord para poder escolher o canal do anúncio."
                />
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {guilds.map((guild) => (
                  <div
                    key={guild.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-white">{guild.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Hash className="h-3 w-3" />
                        {guild.channelId
                          ? `anunciando em #${guild.channels.find((channel) => channel.id === guild.channelId)?.name ?? "canal removido"}`
                          : "nenhum anúncio sai deste servidor"}
                      </p>
                    </div>

                    <div className="flex gap-2 sm:w-[380px]">
                      <Select
                        value={guild.channelId ?? NO_CHANNEL}
                        onValueChange={(value) => changeChannel(guild.id, value === NO_CHANNEL ? "" : value)}
                      >
                        <SelectTrigger className="h-10 min-w-0 flex-1 rounded-xl border-white/[0.08] bg-black/25 text-sm text-white data-[placeholder]:text-gray-500">
                          <SelectValue placeholder="Escolher canal" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px] border-white/[0.08] bg-[#0d0d14] text-white">
                          <SelectItem value={NO_CHANNEL} className="text-gray-400 focus:bg-white/[0.06] focus:text-white">
                            Não anunciar
                          </SelectItem>
                          {guild.channels.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] uppercase tracking-wider text-gray-600">
                                Canais de texto
                              </SelectLabel>
                              {guild.channels.map((channel) => (
                                <SelectItem
                                  key={channel.id}
                                  value={channel.id}
                                  className="focus:bg-white/[0.06] focus:text-white"
                                >
                                  <span className="mr-1 text-gray-600">#</span>
                                  {channel.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => save(guild)}
                        disabled={saving === guild.id}
                        className="inline-flex h-10 flex-shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-3.5 text-xs font-bold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Salvar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
