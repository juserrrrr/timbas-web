import type { Role, Snapshot } from "./use-deducao-room"

export interface SabotageStatus {
  readyAt: number
  serverNow: number
  cooldownMs: number
  receivedAt: number
}

export function calibrateSabotageStatus(payload: unknown, receivedAt = performance.now()): SabotageStatus | null {
  if (!payload || typeof payload !== "object") return null
  const { readyAt, serverNow, cooldownMs } = payload as Record<string, unknown>
  if (typeof readyAt !== "number" || !Number.isFinite(readyAt) || readyAt < 0
    || typeof serverNow !== "number" || !Number.isFinite(serverNow) || serverNow < 0
    || typeof cooldownMs !== "number" || !Number.isFinite(cooldownMs) || cooldownMs <= 0
    || !Number.isFinite(receivedAt)) return null
  return { readyAt, serverNow, cooldownMs, receivedAt }
}

export function sabotageRemainingMs(status: SabotageStatus | null, now = performance.now()) {
  if (!status) return Infinity
  // O relógio monotônico local mede só o tempo desde a resposta do servidor.
  return Math.max(0, status.readyAt - status.serverNow - Math.max(0, now - status.receivedAt))
}

export function canSabotage(snapshot: Pick<Snapshot, "phase" | "blackout" | "players">, me: string, role: Role | null,
  status: SabotageStatus | null, now = performance.now()) {
  const mine = snapshot.players.find((player) => player.id === me)
  return role === "assassino" && snapshot.phase === "jogando" && Boolean(mine?.alive) && mine?.connected !== false
    && !snapshot.blackout && sabotageRemainingMs(status, now) === 0
}
