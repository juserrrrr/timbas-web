import type { WallBox } from "@/lib/services/games"

/**
 * Cópia da colisão do servidor, só para o movimento responder na hora.
 *
 * Quem manda continua sendo a API: ela recebe para onde o jogador quer ir,
 * refaz esta mesma conta e devolve a posição válida. Isto aqui existe porque
 * esperar a resposta para dar o primeiro passo faz o boneco parecer preso na
 * lama. Se as duas contas discordarem, a do servidor vence e a tela corrige.
 */

export const PLAYER_RADIUS = 0.45

export interface Vec2 {
  x: number
  z: number
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function overlaps(point: Vec2, box: WallBox, radius: number): boolean {
  return (
    point.x > box.minX - radius &&
    point.x < box.maxX + radius &&
    point.z > box.minZ - radius &&
    point.z < box.maxZ + radius
  )
}

function pushOut(point: Vec2, box: WallBox, radius: number): Vec2 {
  const left = point.x - (box.minX - radius)
  const right = box.maxX + radius - point.x
  const up = point.z - (box.minZ - radius)
  const down = box.maxZ + radius - point.z
  const smallest = Math.min(left, right, up, down)

  if (smallest === left) return { x: box.minX - radius, z: point.z }
  if (smallest === right) return { x: box.maxX + radius, z: point.z }
  if (smallest === up) return { x: point.x, z: box.minZ - radius }
  return { x: point.x, z: box.maxZ + radius }
}

export function resolveCollisions(point: Vec2, walls: WallBox[], radius = PLAYER_RADIUS): Vec2 {
  let resolved = { x: point.x, z: point.z }
  for (let pass = 0; pass < 2; pass += 1) {
    let touched = false
    for (const wall of walls) {
      if (!overlaps(resolved, wall, radius)) continue
      resolved = pushOut(resolved, wall, radius)
      touched = true
    }
    if (!touched) break
  }
  return resolved
}

function moveAxis(point: Vec2, delta: number, axis: "x" | "z", walls: WallBox[], radius: number): Vec2 {
  if (delta === 0) return point
  const next = { x: point.x, z: point.z }
  next[axis] += delta

  for (const wall of walls) {
    if (!overlaps(next, wall, radius)) continue
    if (axis === "x") next.x = delta > 0 ? wall.minX - radius : wall.maxX + radius
    else next.z = delta > 0 ? wall.minZ - radius : wall.maxZ + radius
  }
  return next
}

export function moveTowards(from: Vec2, to: Vec2, walls: WallBox[], radius = PLAYER_RADIUS): Vec2 {
  const steps = Math.max(1, Math.ceil(distance(from, to) / (radius * 0.8)))
  const stepX = (to.x - from.x) / steps
  const stepZ = (to.z - from.z) / steps

  let current = resolveCollisions(from, walls, radius)
  for (let step = 0; step < steps; step += 1) {
    current = moveAxis(current, stepX, "x", walls, radius)
    current = moveAxis(current, stepZ, "z", walls, radius)
  }
  return current
}

function segmentHitsBox(from: Vec2, to: Vec2, box: WallBox): boolean {
  const dx = to.x - from.x
  const dz = to.z - from.z
  let entry = 0
  let exit = 1

  for (const axis of ["x", "z"] as const) {
    const origin = axis === "x" ? from.x : from.z
    const delta = axis === "x" ? dx : dz
    const min = axis === "x" ? box.minX : box.minZ
    const max = axis === "x" ? box.maxX : box.maxZ

    if (Math.abs(delta) < 1e-8) {
      if (origin < min || origin > max) return false
      continue
    }

    const first = (min - origin) / delta
    const second = (max - origin) / delta
    entry = Math.max(entry, Math.min(first, second))
    exit = Math.min(exit, Math.max(first, second))
    if (entry > exit) return false
  }
  return true
}

export function hasLineOfSight(from: Vec2, to: Vec2, walls: WallBox[]): boolean {
  return !walls.some((wall) => segmentHitsBox(from, to, wall))
}
