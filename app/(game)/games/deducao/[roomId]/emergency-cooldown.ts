import type { Snapshot } from "./use-deducao-room"

export interface EmergencyStatus {
  readyAt: number
  serverNow: number
  cooldownMs: number
  receivedAt: number
}

export function calibrateEmergencyStatus(payload: unknown, receivedAt = performance.now()): EmergencyStatus | null {
  if (!payload || typeof payload !== "object") return null
  const { readyAt, serverNow, cooldownMs } = payload as Record<string, unknown>
  if (typeof readyAt !== "number" || !Number.isFinite(readyAt) || readyAt < 0
    || typeof serverNow !== "number" || !Number.isFinite(serverNow) || serverNow < 0
    || typeof cooldownMs !== "number" || !Number.isFinite(cooldownMs) || cooldownMs <= 0
    || !Number.isFinite(receivedAt)) return null
  return { readyAt, serverNow, cooldownMs, receivedAt }
}

export function emergencyRemainingMs(status: EmergencyStatus | null, now = performance.now()) {
  if (!status) return Infinity
  return Math.max(0, status.readyAt - status.serverNow - Math.max(0, now - status.receivedAt))
}

export function canCallEmergency(snapshot: Pick<Snapshot, "phase" | "players" | "emergencyReadyAt">, me: string,
  status: EmergencyStatus | null, now = performance.now()) {
  const mine = snapshot.players.find((player) => player.id === me)
  return snapshot.phase === "jogando" && Boolean(mine?.alive) && mine?.connected === true && !mine?.inVent
    && (mine?.emergenciesLeft ?? 0) > 0 && status?.readyAt === snapshot.emergencyReadyAt
    && emergencyRemainingMs(status, now) === 0
}
