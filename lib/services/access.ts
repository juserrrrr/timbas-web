import { patch, post, remove, request } from "./http"

export type UserStatus = "PENDING" | "APPROVED" | "BLOCKED"

export interface PermissionCategory {
  id: string
  title: string
  permissions: Array<{ key: string; label: string; hint: string }>
}

export interface PermissionGroup {
  id: string
  name: string
  description: string | null
  permissions: string[]
  _count: { members: number }
}

export interface AccessUser {
  id: number
  name: string
  discordId: string
  avatar: string | null
  role: string
  status: UserStatus
  statusNote: string | null
  lastLoginAt: string | null
  dateCreated: string
  groups: Array<{ group: { id: string; name: string } }>
}

export interface PlatformSettings {
  requireApproval: boolean
  approvalMessage: string | null
  defaultPermissions: string[]
  updatedAt: string
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: "Aguardando aprovação",
  APPROVED: "Liberado",
  BLOCKED: "Bloqueado",
}

let myPermissionsCache: { expiresAt: number; request: Promise<{ role: string; permissions: string[] }> } | null = null

export function getMyPermissions(): Promise<{ role: string; permissions: string[] }> {
  if (myPermissionsCache && myPermissionsCache.expiresAt > Date.now()) return myPermissionsCache.request
  const next = request<{ role: string; permissions: string[] }>("/admin/access/me").catch((error) => {
    myPermissionsCache = null
    throw error
  })
  myPermissionsCache = { expiresAt: Date.now() + 30_000, request: next }
  return next
}

export function getPermissionCatalog(): Promise<PermissionCategory[]> {
  return request("/admin/access/catalog")
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  return request("/admin/access/settings")
}

export function updatePlatformSettings(input: { requireApproval?: boolean; approvalMessage?: string; defaultPermissions?: string[] }) {
  return patch<PlatformSettings>("/admin/access/settings", input)
}

export function listPermissionGroups(): Promise<PermissionGroup[]> {
  return request("/admin/access/groups")
}

export function createPermissionGroup(input: { name: string; description?: string; permissions?: string[] }) {
  return post<PermissionGroup>("/admin/access/groups", input)
}

export function updatePermissionGroup(
  id: string,
  input: { name?: string; description?: string; permissions?: string[] },
) {
  return patch<PermissionGroup>(`/admin/access/groups/${id}`, input)
}

export function removePermissionGroup(id: string) {
  return remove<{ deleted: boolean }>(`/admin/access/groups/${id}`)
}

export function listAccessUsers(params: { status?: UserStatus; search?: string } = {}): Promise<AccessUser[]> {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][],
  )
  return request(`/admin/access/users${search.size ? `?${search}` : ""}`)
}

export function reviewAccessUser(userId: number, input: { status: UserStatus; note?: string }) {
  return post(`/admin/access/users/${userId}/review`, input)
}

export function setUserGroups(userId: number, groupIds: string[]) {
  return post(`/admin/access/users/${userId}/groups`, { groupIds })
}
