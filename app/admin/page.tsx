"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  Bot,
  Crown,
  Gauge,
  LayoutDashboard,
  Power,
  RefreshCw,
  Server,
  Signal,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AdminHeader, AdminMetrics, AdminShortcut, SectionCard } from "@/components/admin/shell"
import { visibleAdminGroups } from "@/lib/admin-navigation"
import { getRanking } from "@/lib/services/ranking"
import { getMatchHistory } from "@/lib/services/matches"
import { getMyPermissions } from "@/lib/services/access"
import { getFeatureFlags, type FeatureFlag } from "@/lib/services/feature-flags"
import { adminGetUsers, type AdminUser } from "@/lib/services/admin"
import { getToken, decodeToken } from "@/lib/auth"
import { TIMBAS_SERVER_ID, TIMBAS_SERVER_NAME } from "@/lib/servers"
import { toast } from "@/lib/toast"

const ROLE_META = {
  ADMIN: { label: "Admins", text: "text-orange-400", bar: "bg-orange-400", icon: Crown },
  BOT: { label: "Bots", text: "text-violet-400", bar: "bg-violet-400", icon: Bot },
  USER: { label: "Usuários", text: "text-blue-400", bar: "bg-blue-400", icon: UserCheck },
  PLAYER: { label: "Jogadores", text: "text-gray-400", bar: "bg-gray-500", icon: Users },
} as const

type ServerSnapshot = {
  players: number
  totalGames: number
  topPlayer: string | null
  error: boolean
}

export default function AdminPage() {
  const [snapshot, setSnapshot] = useState<ServerSnapshot | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminName, setAdminName] = useState("")

  useEffect(() => {
    const token = getToken()
    const payload = token ? decodeToken(token) : null
    if (payload) setAdminName(payload.name)
  }, [])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return

    const [ranking, matches] = await Promise.all([
      getRanking(token, TIMBAS_SERVER_ID).catch(() => null),
      getMatchHistory(token, TIMBAS_SERVER_ID).catch(() => null),
    ])
    setSnapshot(
      ranking && matches
        ? { players: ranking.length, totalGames: matches.length, topPlayer: ranking[0]?.name ?? null, error: false }
        : { players: 0, totalGames: 0, topPlayer: null, error: true },
    )

    // Cada uma dessas respostas depende de permissão. Quem não tem simplesmente
    // vê a visão geral sem aquele pedaço, em vez de uma tela de erro.
    const [access, flagList, userList] = await Promise.all([
      getMyPermissions().catch(() => null),
      getFeatureFlags(token).catch(() => []),
      adminGetUsers(token).catch(() => []),
    ])
    setPermissions(access?.permissions ?? [])
    setFlags(flagList)
    setUsers(userList)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast.success("Dados atualizados")
  }

  const roleCounts = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] ?? 0) + 1
    return acc
  }, {})
  const flagsOn = flags.filter((flag) => flag.enabled).length
  const shortcuts = visibleAdminGroups(permissions)
    .flatMap((group) => group.items)
    .filter((item) => item.href !== "/admin" && !item.href.startsWith("/admin/features/"))

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Painel"
        title="Visão geral"
        subtitle={adminName ? `Boas-vindas de volta, ${adminName}. Está tudo aqui.` : "O estado do Timbas de relance."}
        icon={LayoutDashboard}
        accent="orange"
        actions={
          <Button variant="outline" onClick={() => void refresh()} disabled={refreshing} className="border-white/10">
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      <AdminMetrics
        items={[
          {
            label: "Contas",
            value: loading ? "-" : users.length || "-",
            hint: users.length === 0 && !loading ? "sem acesso à lista" : "cadastradas no Timbas",
            icon: Users,
            accent: "blue",
          },
          {
            label: "Partidas",
            value: loading ? "-" : (snapshot?.totalGames ?? 0),
            hint: "registradas no servidor",
            icon: Activity,
            accent: "emerald",
          },
          {
            label: "No ranking",
            value: loading ? "-" : (snapshot?.players ?? 0),
            hint: "jogadores com partida",
            icon: Trophy,
            accent: "amber",
          },
          {
            label: "Recursos no ar",
            value: loading ? "-" : `${flagsOn}/${flags.length}`,
            hint: "funcionalidades ligadas",
            icon: Power,
            accent: "sky",
          },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[1.15fr_1fr]">
        <SectionCard
          icon={Gauge}
          accent="orange"
          title="Servidor Timbas"
          description="O que a comunidade produziu até agora nas partidas customizadas."
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5 text-orange-400" />
            </div>
          ) : snapshot?.error ? (
            <p className="py-6 text-center text-[12px] text-red-400/80">
              Não deu para falar com o servidor agora. Tente atualizar.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="flex-1 truncate text-[13px] font-bold text-white">{TIMBAS_SERVER_NAME}</span>
                <Server className="h-4 w-4 text-gray-600" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <p className="text-xl font-black tabular-nums text-blue-400">{snapshot?.players ?? 0}</p>
                  <p className="text-[11px] text-gray-500">jogadores no ranking</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <p className="text-xl font-black tabular-nums text-emerald-400">{snapshot?.totalGames ?? 0}</p>
                  <p className="text-[11px] text-gray-500">partidas disputadas</p>
                </div>
              </div>

              {snapshot?.topPlayer && (
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
                  <Trophy className="h-4 w-4 flex-shrink-0 text-amber-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-black text-white">{snapshot.topPlayer}</span>
                    <span className="text-[11px] text-amber-300/70">lidera o ranking geral</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={Signal}
          accent="blue"
          title="Contas por cargo"
          description="Como as contas do Timbas estão distribuídas hoje."
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5 text-blue-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-gray-500">
              A lista de contas é exclusiva do cargo Admin. Peça a quem administra o Timbas.
            </p>
          ) : (
            <div className="space-y-3.5">
              {(["PLAYER", "USER", "BOT", "ADMIN"] as const).map((role) => {
                const count = roleCounts[role] ?? 0
                const percent = users.length > 0 ? (count / users.length) * 100 : 0
                const meta = ROLE_META[role]
                return (
                  <div key={role} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className={`flex items-center gap-2 font-bold ${meta.text}`}>
                        <meta.icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <span className="tabular-nums text-gray-300">
                        {count}
                        <span className="ml-2 text-gray-600">{Math.round(percent)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {shortcuts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-black text-white">Onde ir agora</h2>
            <p className="text-[11px] text-gray-600">Só o que o seu acesso abre</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {shortcuts.map((item) => (
              <AdminShortcut
                key={item.href}
                icon={item.icon}
                label={item.label}
                description={item.description}
                href={item.href}
                accent={item.accent}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
