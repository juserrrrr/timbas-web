"use client"

import { useEffect, useState } from "react"
import { Radio, Save } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import { TIMBAS_SERVER_ID } from "@/lib/servers"
import { getAnnouncementGuilds, setAnnouncementChannel, type AnnouncementGuild } from "@/lib/services/streaming"

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
          <p className="mt-1 text-sm text-gray-500">Escolha o canal em que o bot vai avisar quando alguém iniciar uma live.</p>
        </div>
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
                  <select
                    value={guild.channelId ?? ""}
                    onChange={(event) => changeChannel(guild.id, event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white focus:border-red-500/40 focus:outline-none"
                  >
                    <option value="">Não anunciar</option>
                    {guild.channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
                  </select>
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
