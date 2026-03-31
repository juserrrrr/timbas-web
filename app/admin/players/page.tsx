"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Search, Trash2, ShieldCheck, ChevronDown,
  RefreshCw, Users, UserCheck, Bot, Crown,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getToken, decodeToken } from "@/lib/auth"
import { adminGetUsers, adminUpdateRole, adminDeleteUser, AdminUser, Role } from "@/lib/services/admin"
import { toast } from "sonner"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_META: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  ADMIN:  { label: "Admin",  color: "text-orange-400 bg-orange-500/10 ring-orange-500/20",  icon: Crown },
  BOT:    { label: "Bot",    color: "text-purple-400 bg-purple-500/10 ring-purple-500/20",  icon: Bot },
  USER:   { label: "User",   color: "text-blue-400   bg-blue-500/10   ring-blue-500/20",    icon: UserCheck },
  PLAYER: { label: "Player", color: "text-gray-400   bg-gray-500/10   ring-gray-500/20",    icon: Users },
}

function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role] ?? ROLE_META.PLAYER
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${m.color}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/40 to-red-600/40 text-xs font-bold text-white ring-1 ring-white/10">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [filterRole, setFilterRole] = useState<Role | "ALL">("ALL")
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  // Current admin id (to prevent self-actions)
  const [selfId, setSelfId] = useState<number | null>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const token = getToken()
      if (!token) return
      const data = await adminGetUsers(token)
      setUsers(data)
    } catch (e: unknown) {
      toast.error("Erro ao carregar usuários", {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = getToken()
    if (token) {
      const payload = decodeToken(token)
      if (payload) setSelfId(Number(payload.sub))
    }
    load()
  }, [])

  // ── Filtered list ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.discordId.includes(search) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase())
      const matchRole = filterRole === "ALL" || u.role === filterRole
      return matchSearch && matchRole
    })
  }, [users, search, filterRole])

  // ── Role counts ────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = { ADMIN: 0, BOT: 0, USER: 0, PLAYER: 0 }
    users.forEach((u) => { c[u.role] = (c[u.role] ?? 0) + 1 })
    return c
  }, [users])

  // ── Actions ────────────────────────────────────────────────
  const handleRoleChange = async (user: AdminUser, role: Role) => {
    if (user.id === selfId) {
      toast.warning("Você não pode alterar seu próprio cargo.")
      return
    }
    setActionLoading(user.id)
    try {
      const token = getToken()!
      await adminUpdateRole(token, user.id, role)
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u))
      toast.success(`Cargo de ${user.name} alterado para ${ROLE_META[role].label}`)
    } catch (e: unknown) {
      toast.error("Erro ao alterar cargo", {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(deleteTarget.id)
    setDeleteTarget(null)
    try {
      const token = getToken()!
      await adminDeleteUser(token, deleteTarget.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      toast.success(`${deleteTarget.name} removido com sucesso.`)
    } catch (e: unknown) {
      toast.error("Erro ao remover usuário", {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setActionLoading(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-gray-800 bg-[#0d0d12] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Isso irá deletar permanentemente <span className="font-semibold text-white">{deleteTarget?.name}</span> e todos os dados associados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Jogadores</h1>
            <p className="mt-1 text-sm text-gray-500">{users.length} usuários cadastrados</p>
          </div>
          <button
            onClick={() => { toast("Atualizando..."); load(true).then(() => toast.success("Lista atualizada")) }}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>

        {/* Role stat pills */}
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PLAYER", "USER", "ADMIN", "BOT"] as const).map((r) => {
            const count = r === "ALL" ? users.length : (counts[r] ?? 0)
            const active = filterRole === r
            const m = r !== "ALL" ? ROLE_META[r] : null
            return (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-all ${
                  active
                    ? r === "ALL"
                      ? "bg-white/10 text-white ring-white/20"
                      : `${m!.color}`
                    : "bg-transparent text-gray-500 ring-white/[0.06] hover:text-gray-300"
                }`}
              >
                {r === "ALL" ? "Todos" : m!.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-white/[0.06]"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, Discord ID ou e-mail..."
            className="w-full rounded-xl border border-gray-800 bg-gray-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20"
          />
        </div>

        {/* Table */}
        <Card className="overflow-hidden border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="size-7 text-orange-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Users className="mx-auto mb-3 h-8 w-8 text-gray-700" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="px-5 py-3.5">Usuário</th>
                    <th className="px-5 py-3.5">Discord ID</th>
                    <th className="px-5 py-3.5">E-mail</th>
                    <th className="px-5 py-3.5">Cargo</th>
                    <th className="px-5 py-3.5">Contas LoL</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} />
                          <div>
                            <p className="font-semibold text-white leading-tight">
                              {user.name}
                              {user.id === selfId && (
                                <span className="ml-2 rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-400">Você</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-600">#{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-gray-500">{user.discordId}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">
                        {user.email ?? <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-bold tabular-nums ${user.leagueAccounts.length > 0 ? "text-blue-400" : "text-gray-700"}`}>
                          {user.leagueAccounts.length}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {actionLoading === user.id ? (
                          <Spinner className="ml-auto size-4 text-orange-400" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                disabled={user.id === selfId}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                Ações <ChevronDown className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl border border-white/[0.08] bg-[#0d0d12] p-1 shadow-2xl"
                            >
                              {/* Change role section */}
                              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-gray-600">
                                Alterar cargo
                              </div>
                              {(["PLAYER", "USER", "BOT", "ADMIN"] as Role[])
                                .filter((r) => r !== user.role)
                                .map((r) => {
                                  const m = ROLE_META[r]
                                  const Icon = m.icon
                                  return (
                                    <DropdownMenuItem
                                      key={r}
                                      onClick={() => handleRoleChange(user, r)}
                                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-300 focus:bg-white/[0.05] focus:text-white"
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                      {m.label}
                                    </DropdownMenuItem>
                                  )
                                })}

                              <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />

                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(user)}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-gray-700">
            Exibindo {filtered.length} de {users.length} usuários
          </p>
        )}
      </div>
    </>
  )
}
