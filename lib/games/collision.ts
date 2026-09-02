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

export function moveTowards(from: Vec2, to: Vec2, walls: WallBox[], radius = PLAYER_RADIUS): Vec2 {
  const steps = Math.max(1, Math.ceil(distance(from, to) / (radius * 0.8)))
  const stepX = (to.x - from.x) / steps
  const stepZ = (to.z - from.z) / steps

  let current = { x: from.x, z: from.z }
  for (let step = 0; step < steps; step += 1) {
    current = resolveCollisions({ x: current.x + stepX, z: current.z + stepZ }, walls, radius)
  }
  return current
}
