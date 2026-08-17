"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, Plus, ShieldCheck, Trash2, UserCog, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  CompetitionHeader,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import {
  createPermissionGroup,
  getPermissionCatalog,
  getPlatformSettings,
  listAccessUsers,
  listPermissionGroups,
  removePermissionGroup,
  reviewAccessUser,
  setUserGroups,
  updatePermissionGroup,
  updatePlatformSettings,
  USER_STATUS_LABELS,
  type AccessUser,
  type PermissionCategory,
  type PermissionGroup,
  type PlatformSettings,
  type UserStatus,
} from "@/lib/services/access"

const STATUS_TONES: Record<UserStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  PENDING: "warn",
  APPROVED: "done",
  BLOCKED: "danger",
}

function GroupCard({
  group,
  catalog,
  busy,
  onSave,
  onRemove,
}: {
  group: PermissionGroup
  catalog: PermissionCategory[]
  busy: string
  onSave: (permissions: string[]) => void
  onRemove: () => void
}) {
  const [selected, setSelected] = useState<string[]>(group.permissions)
  const dirty =
    selected.length !== group.permissions.length || selected.some((key) => !group.permissions.includes(key))

  const toggle = (key: string) =>
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))

  return (
    <Card className="border-white/[0.07] bg-white/[0.025] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-white">{group.name}</h3>
          <p className="text-[11px] text-gray-500">
            {group.description || "Sem descrição"} · {group._count.members} pessoa(s)
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {dirty && (
            <Button
              size="sm"
              disabled={busy !== ""}
              onClick={() => onSave(selected)}
              className="h-7 bg-violet-500 px-2 text-[11px] text-white hover:bg-violet-400"
            >
              Salvar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== ""}
            onClick={onRemove}
            className="h-7 border-red-500/25 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {catalog.map((category) => (
          <div key={category.id}>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">{category.title}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {category.permissions.map((permission) => {
                const active = selected.includes(permission.key)
                return (
                  <button
                    key={permission.key}
                    onClick={() => toggle(permission.key)}
                    className={`cursor-pointer rounded-lg border px-2.5 py-2 text-left transition ${
                      active
                        ? "border-violet-500/40 bg-violet-500/[0.08]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    <span
                      className={`flex items-center gap-1.5 text-[12px] font-bold ${
                        active ? "text-violet-300" : "text-gray-300"
                      }`}
                    >
                      {active && <Check className="h-3 w-3 flex-shrink-0" />}
                      {permission.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-gray-600">{permission.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function AdminAccessPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [catalog, setCatalog] = useState<PermissionCategory[]>([])
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [users, setUsers] = useState<AccessUser[]>([])
  const [newGroup, setNewGroup] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      const [settingsData, catalogData, groupsData, usersData] = await Promise.all([
        getPlatformSettings(),
        getPermissionCatalog().catch(() => []),
        listPermissionGroups().catch(() => []),
        listAccessUsers(),
      ])
      setSettings(settingsData)
      setCatalog(catalogData)
      setGroups(groupsData)
      setUsers(usersData)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os acessos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error && !settings) return <ErrorState message={error} retry={() => void load()} />

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key)
    setError("")
    try {
      await action()
      setNotice(message)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  const pending = users.filter((user) => user.status === "PENDING")

  return (
    <div className="space-y-6">
      <CompetitionHeader
        eyebrow="Plataforma"
        title="Acessos"
        subtitle="Quem entra no Timbas, e o que cada um pode fazer no painel."
        icon={ShieldCheck}
        accent="text-violet-400"
        accentBg="bg-violet-500/10 border-violet-500/20"
      />

      {notice && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-bold text-white">Exigir aprovação para entrar</span>
            <span className="block text-[11px] leading-snug text-gray-500">
              Ligado, quem entra pelo Discord fica na fila e não recebe acesso até alguém liberar. Quem já entrou
              continua entrando.
            </span>
          </span>
          <Switch
            checked={settings?.requireApproval ?? false}
            onCheckedChange={(checked) =>
              void run(
                "settings",
                () => updatePlatformSettings({ requireApproval: checked }),
                checked ? "Agora a entrada precisa de aprovação." : "Entrada liberada para qualquer login do Discord.",
              )
            }
          />
        </label>
      </Card>

      {pending.length > 0 && (
        <Card className="border-amber-500/25 bg-amber-500/[0.05] p-4">
          <h3 className="mb-3 text-sm font-black text-white">Esperando liberação ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{user.name}</p>
                  <p className="truncate font-mono text-[10px] text-gray-600">
                    {user.discordId} · entrou em {formatDateTime(user.dateCreated)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={busy !== ""}
                  onClick={() =>
                    void run(
                      `user-${user.id}`,
                      () => reviewAccessUser(user.id, { status: "APPROVED" }),
                      `${user.name} liberado.`,
                    )
                  }
                  className="h-7 bg-emerald-500 px-2 text-[11px] text-black hover:bg-emerald-400"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Liberar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== ""}
                  onClick={() =>
                    void run(
                      `user-${user.id}`,
                      () => reviewAccessUser(user.id, { status: "BLOCKED" }),
                      `${user.name} bloqueado.`,
                    )
                  }
                  className="h-7 border-red-500/25 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                >
                  <X className="mr-1 h-3 w-3" />
                  Recusar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Grupos e permissões</h2>
            <p className="text-[11px] text-gray-500">
              O admin da plataforma é fixo e tem tudo. Todo outro cargo é um grupo que você monta aqui.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newGroup}
              onChange={(event) => setNewGroup(event.target.value)}
              placeholder="Moderador do Timbas"
              className="h-9 w-56 border-white/10 bg-white/[0.03]"
            />
            <Button
              disabled={busy !== "" || newGroup.trim().length < 2}
              onClick={() =>
                void run("new-group", () => createPermissionGroup({ name: newGroup.trim() }), `Grupo criado.`).then(() =>
                  setNewGroup(""),
                )
              }
              className="bg-violet-500 text-white hover:bg-violet-400"
            >
              {busy === "new-group" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Criar grupo
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[12px] text-gray-500">
            Nenhum grupo ainda. Crie um para dar acesso de painel a alguém sem torná-lo admin.
          </p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                catalog={catalog}
                busy={busy}
                onSave={(permissions) =>
                  void run(
                    `group-${group.id}`,
                    () => updatePermissionGroup(group.id, { permissions }),
                    `Permissões de ${group.name} salvas.`,
                  )
                }
                onRemove={() =>
                  void run(`group-${group.id}`, () => removePermissionGroup(group.id), `${group.name} removido.`)
                }
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-white">Quem tem acesso</h2>
        </div>

        <div className="space-y-1.5">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {user.name}
                  {user.role === "ADMIN" && <span className="ml-2 text-[10px] text-orange-400">super admin</span>}
                </p>
                <p className="truncate text-[10px] text-gray-600">
                  {user.groups.length > 0
                    ? user.groups.map((membership) => membership.group.name).join(", ")
                    : "sem grupo"}
                  {user.lastLoginAt ? ` · último acesso ${formatDateTime(user.lastLoginAt)}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {groups.map((group) => {
                  const active = user.groups.some((membership) => membership.group.id === group.id)
                  return (
                    <button
                      key={group.id}
                      disabled={busy !== "" || user.role === "ADMIN"}
                      onClick={() => {
                        const next = active
                          ? user.groups
                              .filter((membership) => membership.group.id !== group.id)
                              .map((membership) => membership.group.id)
                          : [...user.groups.map((membership) => membership.group.id), group.id]
                        void run(
                          `groups-${user.id}`,
                          () => setUserGroups(user.id, next),
                          `Grupos de ${user.name} atualizados.`,
                        )
                      }}
                      className={`cursor-pointer rounded-md border px-2 py-1 text-[10px] font-bold transition disabled:cursor-default disabled:opacity-40 ${
                        active
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                          : "border-white/[0.07] bg-white/[0.02] text-gray-600 hover:text-white"
                      }`}
                    >
                      {group.name}
                    </button>
                  )
                })}

                <StatusPill tone={STATUS_TONES[user.status]}>{USER_STATUS_LABELS[user.status]}</StatusPill>

                {user.status !== "BLOCKED" && user.role !== "ADMIN" && (
                  <button
                    disabled={busy !== ""}
                    onClick={() =>
                      void run(
                        `user-${user.id}`,
                        () => reviewAccessUser(user.id, { status: "BLOCKED" }),
                        `${user.name} bloqueado.`,
                      )
                    }
                    className="cursor-pointer text-[10px] font-bold text-gray-600 transition hover:text-red-400"
                  >
                    bloquear
                  </button>
                )}
                {user.status === "BLOCKED" && (
                  <button
                    disabled={busy !== ""}
                    onClick={() =>
                      void run(
                        `user-${user.id}`,
                        () => reviewAccessUser(user.id, { status: "APPROVED" }),
                        `${user.name} liberado.`,
                      )
                    }
                    className="cursor-pointer text-[10px] font-bold text-gray-600 transition hover:text-emerald-400"
                  >
                    liberar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
