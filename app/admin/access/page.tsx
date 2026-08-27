"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bot, Check, ChevronLeft, ChevronRight, Clock, Crown, KeyRound, LogIn, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, Users, Wifi } from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CompetitionHeader, ErrorState, PageLoading, formatDateTime } from "@/components/competitions/shared"
import { PlayerAvatar } from "@/components/player-avatar"
import { beginImpersonation, decodeToken, getToken } from "@/lib/auth"
import { adminDeleteUser, adminGetUsers, adminImpersonateUser, adminUpdateRole, type AdminUser, type Role } from "@/lib/services/admin"
import {
  createPermissionGroup,
  getMyPermissions,
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
import { clearDashboardAccess } from "@/lib/dashboard-access-store"

const PAGE_SIZE = 12
const ROLE_META: Record<Role, { label: string; className: string; icon: typeof Users }> = {
  ADMIN: { label: "Admin", className: "border-orange-400/25 bg-orange-400/10 text-orange-300", icon: Crown },
  BOT: { label: "Bot", className: "border-purple-400/25 bg-purple-400/10 text-purple-300", icon: Bot },
  USER: { label: "Usuário", className: "border-blue-400/25 bg-blue-400/10 text-blue-300", icon: UserCheck },
  PLAYER: { label: "Jogador", className: "border-white/10 bg-white/[0.04] text-gray-400", icon: Users },
}

function Avatar({ user }: { user: AccessUser }) {
  return <PlayerAvatar name={user.name} discordId={user.discordId} avatar={user.avatar} size={64} className="h-10 w-10 rounded-xl ring-1 ring-white/10" />
}

function RolePill({ role }: { role: string }) {
  const meta = ROLE_META[(role in ROLE_META ? role : "PLAYER") as Role]
  const Icon = meta.icon
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${meta.className}`}><Icon className="h-3 w-3" />{meta.label}</span>
}

function StatusPill({ status }: { status: UserStatus }) {
  const tone = status === "APPROVED" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : status === "PENDING" ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : "border-red-400/25 bg-red-400/10 text-red-300"
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${tone}`}>{USER_STATUS_LABELS[status]}</span>
}

function GroupEditor({ group, catalog, busy, onSave, onRemove }: { group: PermissionGroup; catalog: PermissionCategory[]; busy: boolean; onSave: (permissions: string[]) => void; onRemove: () => void }) {
  const [selected, setSelected] = useState(group.permissions)
  useEffect(() => setSelected(group.permissions), [group.permissions])
  const dirty = selected.length !== group.permissions.length || selected.some((key) => !group.permissions.includes(key))
  const toggle = (key: string) => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  return <details className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] open:border-violet-400/20">
    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><KeyRound className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{group.name}</span><span className="block text-[11px] text-gray-600">{group._count.members} pessoa(s) · {group.permissions.length} permissões</span></span>
      <span className="text-[10px] font-bold text-gray-600 group-open:hidden">Editar</span>
    </summary>
    <div className="border-t border-white/[0.06] p-4">
      <div className="space-y-4">{catalog.map((category) => <div key={category.id}><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">{category.title}</p><div className="grid gap-2 sm:grid-cols-2">{category.permissions.map((permission) => { const active = selected.includes(permission.key); return <button type="button" key={permission.key} onClick={() => toggle(permission.key)} className={`rounded-xl border p-3 text-left transition ${active ? "border-violet-400/30 bg-violet-400/[0.08]" : "border-white/[0.06] bg-black/15 hover:border-white/15"}`}><span className={`flex items-center gap-1.5 text-xs font-bold ${active ? "text-violet-200" : "text-gray-300"}`}>{active && <Check className="h-3 w-3" />}{permission.label}</span><span className="mt-1 block text-[10px] leading-snug text-gray-600">{permission.hint}</span></button>})}</div></div>)}</div>
      <div className="mt-4 flex justify-between gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onRemove} className="border-red-500/20 text-red-400 hover:bg-red-500/10"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button><Button type="button" disabled={!dirty || busy} onClick={() => onSave(selected)} className="bg-violet-600 text-white hover:bg-violet-500">Salvar permissões</Button></div>
    </div>
  </details>
}

function InitialAccessEditor({ permissions, catalog, busy, onSave }: { permissions: string[]; catalog: PermissionCategory[]; busy: boolean; onSave: (permissions: string[]) => void }) {
  const [selected, setSelected] = useState(permissions)
  useEffect(() => setSelected(permissions), [permissions])
  const options = catalog.find((category) => category.id === "dashboard")?.permissions ?? []
  const dirty = selected.length !== permissions.length || selected.some((key) => !permissions.includes(key))
  const toggle = (key: string) => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])

  return <Card className="border-blue-400/15 bg-blue-400/[0.025] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-black text-white">Acesso inicial</p><p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-gray-500">É o conjunto de áreas que toda conta aprovada recebe de fábrica. Os grupos adicionam outras permissões por cima desta base.</p></div><span className="rounded-full border border-blue-400/15 bg-blue-400/10 px-2.5 py-1 text-[10px] font-black text-blue-300">{selected.length} de {options.length}</span></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{options.map((permission) => { const active = selected.includes(permission.key); return <button type="button" key={permission.key} disabled={busy} onClick={() => toggle(permission.key)} className={`rounded-xl border p-3 text-left transition ${active ? "border-blue-400/30 bg-blue-400/[0.08]" : "border-white/[0.06] bg-black/15"}`}><span className={`flex items-center gap-1.5 text-xs font-bold ${active ? "text-blue-200" : "text-gray-400"}`}>{active && <Check className="h-3 w-3" />}{permission.label}</span><span className="mt-1 block text-[10px] leading-snug text-gray-600">{permission.hint}</span></button> })}</div>
    <div className="mt-4 flex justify-end"><Button type="button" disabled={!dirty || busy} onClick={() => onSave(selected)} className="bg-blue-600 text-white hover:bg-blue-500">Salvar acesso inicial</Button></div>
  </Card>
}

export default function AdminAccessPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [catalog, setCatalog] = useState<PermissionCategory[]>([])
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [users, setUsers] = useState<AccessUser[]>([])
  const [details, setDetails] = useState<AdminUser[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [selfId, setSelfId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<UserStatus | "ALL">("ALL")
  const [groupFilter, setGroupFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [newGroup, setNewGroup] = useState("")
  const [groupSearch, setGroupSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")

  const canApprove = permissions.includes("users.approve")
  const canManageUsers = permissions.includes("users.manage")
  const canManageGroups = permissions.includes("groups.manage")
  const isAdmin = details.length > 0

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const access = await getMyPermissions()
      setPermissions(access.permissions)
      const [usersData, settingsData, groupsData, catalogData, adminData] = await Promise.all([
        listAccessUsers(),
        access.permissions.includes("users.approve") ? getPlatformSettings() : Promise.resolve(null),
        access.permissions.includes("groups.manage") || access.permissions.includes("users.manage") ? listPermissionGroups().catch(() => []) : Promise.resolve([]),
        access.permissions.includes("groups.manage") || access.permissions.includes("users.approve") ? getPermissionCatalog().catch(() => []) : Promise.resolve([]),
        access.role === "ADMIN" && getToken() ? adminGetUsers(getToken()!).catch(() => []) : Promise.resolve([]),
      ])
      setUsers(usersData)
      setSettings(settingsData)
      setGroups(groupsData)
      setCatalog(catalogData)
      setDetails(adminData)
      const payload = getToken() ? decodeToken(getToken()!) : null
      setSelfId(payload ? Number(payload.sub) : null)
      setError("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar pessoas e acessos.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => setPage(1), [search, status, groupFilter])

  const detailById = useMemo(() => new Map(details.map((user) => [user.id, user])), [details])
  const people = useMemo(() => {
    const accessIds = new Set(users.map((user) => user.id))
    const technicalAccounts: AccessUser[] = details
      .filter((user) => !accessIds.has(user.id))
      .map((user) => ({
        id: user.id,
        name: user.name,
        discordId: user.discordId,
        avatar: null,
        role: user.role,
        status: "APPROVED",
        statusNote: null,
        lastLoginAt: user.lastLoginAt,
        dateCreated: "",
        groups: [],
      }))
    return [...users, ...technicalAccounts]
  }, [details, users])
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    return people.filter((user) => {
      const detail = detailById.get(user.id)
      const matchesTerm = !term || [user.name, user.discordId, detail?.email ?? "", detail?.lastLoginIp ?? ""].some((value) => value.toLocaleLowerCase("pt-BR").includes(term))
      const matchesStatus = status === "ALL" || user.status === status
      const matchesGroup = groupFilter === "ALL" || (groupFilter === "NONE" ? user.groups.length === 0 : user.groups.some((membership) => membership.group.id === groupFilter))
      return matchesTerm && matchesStatus && matchesGroup
    })
  }, [detailById, groupFilter, people, search, status])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages])
  const visibleUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selected = people.find((user) => user.id === selectedId) ?? null
  const selectedDetail = selected ? detailById.get(selected.id) : undefined
  const pending = people.filter((user) => user.status === "PENDING").length
  const approved = people.filter((user) => user.status === "APPROVED").length
  const filteredGroups = groups.filter((group) => group.name.toLocaleLowerCase("pt-BR").includes(groupSearch.toLocaleLowerCase("pt-BR")))

  async function run(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key)
    // Qualquer coisa aqui mexe em permissão de alguém, então a resposta que a
    // tela tem guardada envelheceu na hora.
    try { await action(); clearDashboardAccess(); toast.success(message); await load(true) }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Não foi possível concluir a ação.") }
    finally { setBusy("") }
  }

  async function changeRole(user: AdminUser, role: Role) {
    if (user.id === selfId) return toast.warning("Você não pode alterar seu próprio cargo.")
    await run(`role-${user.id}`, () => adminUpdateRole(getToken()!, user.id, role), `Cargo de ${user.name} atualizado.`)
  }

  async function impersonate(user: AdminUser) {
    setBusy(`impersonate-${user.id}`)
    try { const result = await adminImpersonateUser(getToken()!, user.id); beginImpersonation(result.token); window.location.assign("/dashboard") }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Não foi possível entrar como usuário."); setBusy("") }
  }

  if (loading) return <PageLoading />
  if (error && users.length === 0) return <ErrorState message={error} retry={() => void load()} />

  return <div className="space-y-6">
    <CompetitionHeader eyebrow="Plataforma" title="Pessoas e acessos" subtitle="Contas, entrada, grupos e permissões em uma única central." icon={Users} accent="text-violet-400" accentBg="bg-violet-500/10 border-violet-500/20" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: "Pessoas", value: people.length, icon: Users, tone: "text-blue-300 bg-blue-500/10" },
      { label: "Liberadas", value: approved, icon: UserCheck, tone: "text-emerald-300 bg-emerald-500/10" },
      { label: "Aguardando", value: pending, icon: Clock, tone: "text-amber-300 bg-amber-500/10" },
      { label: "Grupos", value: groups.length, icon: KeyRound, tone: "text-violet-300 bg-violet-500/10" },
    ].map((item) => <Card key={item.label} className="flex items-center gap-3 border-white/[0.07] bg-white/[0.025] p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}><item.icon className="h-4 w-4" /></span><span><span className="block text-2xl font-black text-white">{item.value}</span><span className="text-[11px] text-gray-500">{item.label}</span></span></Card>)}</div>

    <Tabs defaultValue="people" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><TabsList className="h-11 border border-white/[0.07] bg-white/[0.025] p-1"><TabsTrigger value="people" className="px-4 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200"><Users />Pessoas</TabsTrigger>{canManageGroups && <TabsTrigger value="groups" className="px-4 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200"><KeyRound />Grupos</TabsTrigger>}{canApprove && <TabsTrigger value="entry" className="px-4 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200"><ShieldCheck />Entrada</TabsTrigger>}</TabsList><Button type="button" variant="outline" onClick={() => void load(true)} disabled={busy !== ""} className="border-white/10 text-gray-300"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Atualizar</Button></div>

      <TabsContent value="people" className="space-y-4">
        <Card className="border-white/[0.07] bg-white/[0.025] p-3"><div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, Discord, e-mail ou IP" className="h-10 border-white/10 bg-black/25 pl-9" /></div><div className="flex flex-wrap gap-1.5">{(["ALL", "APPROVED", "PENDING", "BLOCKED"] as const).map((value) => <button type="button" key={value} onClick={() => setStatus(value)} className={`rounded-lg border px-3 py-2 text-[10px] font-black ${status === value ? "border-violet-400/30 bg-violet-400/10 text-violet-200" : "border-white/[0.07] text-gray-500"}`}>{value === "ALL" ? "Todos" : USER_STATUS_LABELS[value]}</button>)}</div><select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-[#0b0b10] px-3 text-xs text-gray-300"><option value="ALL">Todos os grupos</option><option value="NONE">Sem grupo</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div></Card>
        {visibleUsers.length === 0 ? <Card className="border-dashed border-white/10 bg-white/[0.02] p-12 text-center"><Users className="mx-auto mb-3 h-8 w-8 text-gray-700" /><p className="font-bold text-white">Nenhuma pessoa encontrada</p><p className="text-xs text-gray-600">Ajuste a busca ou os filtros.</p></Card> : <div className="grid gap-2 xl:grid-cols-2">{visibleUsers.map((user) => <button type="button" key={user.id} onClick={() => setSelectedId(user.id)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/[0.04]"><Avatar user={user} /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-black text-white">{user.name}</span>{user.id === selfId && <span className="text-[9px] font-black text-orange-300">VOCÊ</span>}</span><span className="mt-1 flex flex-wrap items-center gap-1.5"><RolePill role={user.role} /><StatusPill status={user.status} />{user.groups.slice(0, 2).map((membership) => <span key={membership.group.id} className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-bold text-violet-300">{membership.group.name}</span>)}{user.groups.length > 2 && <span className="text-[9px] text-gray-600">+{user.groups.length - 2}</span>}</span></span><span className="hidden text-right text-[10px] text-gray-600 sm:block">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca entrou"}</span></button>)}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-600"><span>Exibindo {visibleUsers.length} de {filtered.length} resultado(s)</span><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="h-8 border-white/10"><ChevronLeft className="h-3.5 w-3.5" /></Button><span className="min-w-20 text-center">{page} de {totalPages}</span><Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="h-8 border-white/10"><ChevronRight className="h-3.5 w-3.5" /></Button></div></div>
      </TabsContent>

      {canManageGroups && <TabsContent value="groups" className="space-y-4"><Card className="border-white/[0.07] bg-white/[0.025] p-4"><div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><Input value={groupSearch} onChange={(event) => setGroupSearch(event.target.value)} placeholder="Buscar grupo" className="border-white/10 bg-black/25 pl-9" /></div><Input value={newGroup} onChange={(event) => setNewGroup(event.target.value)} placeholder="Nome do novo grupo" className="border-white/10 bg-black/25" /><Button type="button" disabled={newGroup.trim().length < 2 || busy !== ""} onClick={() => void run("new-group", () => createPermissionGroup({ name: newGroup.trim() }), "Grupo criado.").then(() => setNewGroup(""))} className="bg-violet-600 text-white hover:bg-violet-500"><Plus className="mr-1.5 h-4 w-4" />Criar</Button></div></Card><div className="grid gap-3 xl:grid-cols-2">{filteredGroups.map((group) => <GroupEditor key={group.id} group={group} catalog={catalog} busy={busy !== ""} onSave={(next) => void run(`group-${group.id}`, () => updatePermissionGroup(group.id, { permissions: next }), `Permissões de ${group.name} salvas.`)} onRemove={() => void run(`group-${group.id}`, () => removePermissionGroup(group.id), `${group.name} removido.`)} />)}</div></TabsContent>}

      {canApprove && <TabsContent value="entry" className="space-y-4"><Card className="border-white/[0.07] bg-white/[0.025] p-5"><label className="flex cursor-pointer items-center justify-between gap-5"><span><span className="block text-sm font-black text-white">Exigir aprovação para entrar</span><span className="mt-1 block max-w-2xl text-[11px] leading-relaxed text-gray-500">Novas contas do Discord ficam aguardando liberação. Quem já foi aprovado continua entrando normalmente.</span></span><Switch checked={settings?.requireApproval ?? false} onCheckedChange={(checked) => void run("settings", () => updatePlatformSettings({ requireApproval: checked }), checked ? "Aprovação ativada." : "Entrada automática ativada.")} /></label></Card>{settings && <InitialAccessEditor permissions={settings.defaultPermissions} catalog={catalog} busy={busy !== ""} onSave={(next) => void run("default-permissions", () => updatePlatformSettings({ defaultPermissions: next }), "Acesso inicial atualizado.")} />}</TabsContent>}
    </Tabs>

    <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null) }}><SheetContent className="w-full overflow-y-auto border-white/10 bg-[#09090d] p-0 sm:max-w-lg"><SheetHeader className="border-b border-white/[0.07] p-5"><SheetTitle className="flex items-center gap-3 text-white">{selected && <Avatar user={selected} />}<span>{selected?.name}</span></SheetTitle><SheetDescription>Conta, acesso e permissões desta pessoa.</SheetDescription></SheetHeader>{selected && <div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><span className="text-gray-600">Discord</span><span className="mt-1 block break-all font-mono text-gray-300">{selected.discordId}</span></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><span className="text-gray-600">Último acesso</span><span className="mt-1 block text-gray-300">{selected.lastLoginAt ? formatDateTime(selected.lastLoginAt) : "Nunca"}</span></div>{selectedDetail?.email && <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><span className="text-gray-600">E-mail</span><span className="mt-1 block truncate text-gray-300">{selectedDetail.email}</span></div>}{selectedDetail?.lastLoginIp && <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><span className="flex items-center gap-1 text-gray-600"><Wifi className="h-3 w-3" />IP recente</span><span className="mt-1 block font-mono text-gray-300">{selectedDetail.lastLoginIp}</span></div>}</div>
      {canApprove && selected.role !== "ADMIN" && selected.role !== "BOT" && <div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Situação de acesso</p><div className="grid grid-cols-3 gap-2">{(["APPROVED", "PENDING", "BLOCKED"] as UserStatus[]).map((next) => <button type="button" key={next} disabled={busy !== "" || selected.status === next} onClick={() => void run(`status-${selected.id}`, () => reviewAccessUser(selected.id, { status: next }), `${selected.name}: ${USER_STATUS_LABELS[next]}.`)} className={`rounded-xl border px-2 py-2.5 text-[10px] font-black ${selected.status === next ? "border-violet-400/30 bg-violet-400/10 text-violet-200" : "border-white/[0.07] text-gray-500"}`}>{USER_STATUS_LABELS[next]}</button>)}</div></div>}
      {canManageUsers && selected.role !== "ADMIN" && selected.role !== "BOT" && <div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Grupos</p><div className="grid grid-cols-2 gap-2">{groups.map((group) => { const active = selected.groups.some((membership) => membership.group.id === group.id); return <button type="button" key={group.id} disabled={busy !== ""} onClick={() => { const next = active ? selected.groups.filter((membership) => membership.group.id !== group.id).map((membership) => membership.group.id) : [...selected.groups.map((membership) => membership.group.id), group.id]; void run(`groups-${selected.id}`, () => setUserGroups(selected.id, next), `Grupos de ${selected.name} atualizados.`) }} className={`rounded-xl border px-3 py-2 text-left text-[11px] font-bold ${active ? "border-violet-400/30 bg-violet-400/10 text-violet-200" : "border-white/[0.07] text-gray-500"}`}>{active && <Check className="mr-1 inline h-3 w-3" />}{group.name}</button>})}</div></div>}
      {isAdmin && selectedDetail && selected.id !== selfId && <div className="space-y-3 border-t border-white/[0.07] pt-5"><div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Cargo da conta</p><div className="grid grid-cols-4 gap-1.5">{(["PLAYER", "USER", "BOT", "ADMIN"] as Role[]).map((role) => <button type="button" key={role} disabled={busy !== "" || selectedDetail.role === role} onClick={() => void changeRole(selectedDetail, role)} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${selectedDetail.role === role ? "border-orange-400/30 bg-orange-400/10 text-orange-300" : "border-white/[0.07] text-gray-600"}`}>{ROLE_META[role].label}</button>)}</div></div><div className="grid grid-cols-2 gap-2">{selectedDetail.role !== "BOT" && <Button type="button" variant="outline" disabled={busy !== ""} onClick={() => void impersonate(selectedDetail)} className="border-blue-500/20 text-blue-300"><LogIn className="mr-1.5 h-4 w-4" />Entrar como</Button>}<Button type="button" variant="outline" disabled={busy !== ""} onClick={() => setDeleteTarget(selectedDetail)} className="border-red-500/20 text-red-400"><Trash2 className="mr-1.5 h-4 w-4" />Remover conta</Button></div></div>}
    </div>}</SheetContent></Sheet>

    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}><AlertDialogContent className="border-white/10 bg-[#0d0d12] text-white"><AlertDialogHeader><AlertDialogTitle>Remover conta?</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Isso apaga permanentemente {deleteTarget?.name} e os dados associados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="border-white/10 bg-transparent text-gray-300">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-500" onClick={() => { if (!deleteTarget) return; const target = deleteTarget; setDeleteTarget(null); setSelectedId(null); void run(`delete-${target.id}`, () => adminDeleteUser(getToken()!, target.id), `${target.name} removido.`) }}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
