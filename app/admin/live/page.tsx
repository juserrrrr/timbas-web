"use client"

import { useEffect, useState } from "react"
import { Radio, Save } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
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
import { getToken } from "@/lib/auth"
import { TIMBAS_SERVER_ID } from "@/lib/servers"
import { getAnnouncementGuilds, setAnnouncementChannel, type AnnouncementGuild } from "@/lib/services/streaming"
import { LiveMonitorPanel } from "./live-monitor-panel"
import { SfuPanel } from "./sfu-panel"

/// O Radix não aceita item com valor vazio, então "não anunciar" precisa de um
/// valor próprio que é traduzido de volta para vazio ao salvar.
const NO_CHANNEL = "__none__"

export default function LiveAdminPage() {
  const [guilds, setGuilds] = useState<AnnouncementGuild[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getAnnouncementGuilds(token)
      .then((items) => setGuilds(items.filter((guild) => guild.id === TIMBAS_SERVER_ID)))
      .catch((error: unknown) => toast.error("Erro ao carregar o Timbas", { description: error instanceof Error ? error.message : undefined }))
      .finally(() => setLoading(false))
  }, [])

  const changeChannel = (guildId: string, channelId: string) => {
    setGuilds((current) => current.map((guild) => guild.id === guildId ? { ...guild, channelId: channelId || null } : guild))
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

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
          <Radio className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Transmissões</h1>
          <p className="mt-1 text-sm text-gray-500">Configure o servidor de transmissão e o canal de anúncio das lives.</p>
        </div>
      </div>

      <SfuPanel />

      <LiveMonitorPanel />

      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">Anúncio no Discord</h2>
        <p className="mt-1 text-xs text-gray-600">Canal em que o bot avisa quando alguém inicia uma live.</p>
      </div>

      <Card className="border-white/[0.06] bg-white/[0.02] p-0">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="size-5 text-red-400" /></div>
        ) : guilds.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500">O bot ainda não está conectado ao Timbas.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {guilds.map((guild) => (
              <div key={guild.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{guild.name}</p>
                  <p className="mt-1 text-xs text-gray-500">O criador será mencionado e a mensagem terá um embed com o link para assistir.</p>
                </div>
                <div className="flex gap-2 sm:w-[360px]">
                  <Select
                    value={guild.channelId ?? NO_CHANNEL}
                    onValueChange={(value) => changeChannel(guild.id, value === NO_CHANNEL ? "" : value)}
                  >
                    <SelectTrigger className="h-10 min-w-0 flex-1 rounded-xl border-white/[0.08] bg-white/[0.03] text-sm text-white data-[placeholder]:text-gray-500">
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
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Salvar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
