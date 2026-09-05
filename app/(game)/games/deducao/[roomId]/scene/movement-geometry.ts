import type { OfficeMap } from "@/lib/services/games"

export const FLOOR_HEIGHT = 4.2
const STAIR_LANDING_SIZE = 2.42

interface StairSample {
  y: number
  progress: number
  level: number
  targetLevel: number
}

function prepareStair(stair: OfficeMap["stairs"][number]) {
  const points = [{ x: stair.x, z: stair.z }]
  if (stair.turnX !== undefined && stair.turnZ !== undefined) points.push({ x: stair.turnX, z: stair.turnZ })
  points.push({ x: stair.targetX, z: stair.targetZ })
  const segments = points.slice(0, -1).map((from, index) => {
    const to = points[index + 1]
    const dx = to.x - from.x
    const dz = to.z - from.z
    return { from, dx, dz, length: Math.hypot(dx, dz) }
  })
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  const landingHalf = segments.length === 2
    ? Math.min(STAIR_LANDING_SIZE / 2, segments[0].length * 0.4, segments[1].length * 0.4)
    : 0
  return {
    stair,
    segments,
    turn: points[1],
    landingHalf,
    climbLength: totalLength - landingHalf * 2,
    landingStart: segments[0].length - landingHalf,
    landingEnd: segments[0].length + landingHalf,
  }
}

interface FloorGeometry {
  walls: OfficeMap["walls"]
  obstacles: OfficeMap["obstacles"]
  feetHeight?: number
  colliders?: OfficeMap["walls"]
}

const preparedMaps = new WeakMap<OfficeMap, {
  floors: Map<number, FloorGeometry>
  stairs: ReturnType<typeof prepareStair>[]
}>()

function preparedMap(map: OfficeMap) {
  let prepared = preparedMaps.get(map)
  if (!prepared) {
    const floors = new Map<number, FloorGeometry>()
    for (const kind of ["walls", "obstacles"] as const) for (const box of map[kind]) {
      const level = box.level ?? 0
      let floor = floors.get(level)
      if (!floor) {
        floor = { walls: [], obstacles: [] }
        floors.set(level, floor)
      }
      floor[kind].push(box)
    }
    prepared = { floors, stairs: map.stairs.filter((stair) => stair.targetLevel > stair.level).map(prepareStair) }
    preparedMaps.set(map, prepared)
  }
  return prepared
}

function floorGeometry(map: OfficeMap, level: number) {
  const { floors } = preparedMap(map)
  let floor = floors.get(level)
  if (!floor) {
    floor = { walls: [], obstacles: [] }
    floors.set(level, floor)
  }
  return floor
}

export function stairSampleAt(map: OfficeMap, x: number, z: number): StairSample | null {
  let closest: (StairSample & { distance: number }) | null = null
  for (const route of preparedMap(map).stairs) {
    const { stair, segments, turn, landingHalf, climbLength, landingStart, landingEnd } = route
    if (landingHalf > 0 && Math.abs(x - turn.x) <= landingHalf && Math.abs(z - turn.z) <= landingHalf) {
      const progress = landingStart / climbLength
      return { y: stair.level * FLOOR_HEIGHT + progress * FLOOR_HEIGHT, progress, level: stair.level, targetLevel: stair.targetLevel }
    }
    let traversed = 0
    for (const { from, dx, dz, length } of segments) {
      const rawSegmentProgress = ((x - from.x) * dx + (z - from.z) * dz) / (length * length)
      if (rawSegmentProgress < -0.08 || rawSegmentProgress > 1.08) {
        traversed += length
        continue
      }
      const segmentProgress = Math.max(0, Math.min(1, rawSegmentProgress))
      const projectedX = from.x + dx * segmentProgress
      const projectedZ = from.z + dz * segmentProgress
      const perpendicularDistance = Math.hypot(x - projectedX, z - projectedZ)
      if (perpendicularDistance <= 1.16) {
        const pathDistance = traversed + length * segmentProgress
        const climbDistance = landingHalf === 0
          ? pathDistance
          : pathDistance <= landingStart ? pathDistance : pathDistance <= landingEnd ? landingStart : pathDistance - landingHalf * 2
        const progress = Math.max(0, Math.min(1, climbDistance / climbLength))
        if (!closest || perpendicularDistance < closest.distance) {
          closest = { y: stair.level * FLOOR_HEIGHT + progress * FLOOR_HEIGHT, progress, distance: perpendicularDistance, level: stair.level, targetLevel: stair.targetLevel }
        }
      }
      traversed += length
    }
  }
  return closest ? { y: closest.y, progress: closest.progress, level: closest.level, targetLevel: closest.targetLevel } : null
}

export function collidersAtHeight(map: OfficeMap, level: number, feetHeight: number) {
  const floor = floorGeometry(map, level)
  // A planta é imutável durante a partida; só o salto muda a seleção de móveis.
  if (floor.colliders && floor.feetHeight === feetHeight) return floor.colliders
  floor.feetHeight = feetHeight
  floor.colliders = [...floor.walls]
  for (const box of floor.obstacles) {
    if (box.height === undefined || box.height > feetHeight + 0.06) floor.colliders.push(box)
  }
  return floor.colliders
}

export function surfaceHeightAt(map: OfficeMap, level: number, x: number, z: number, maxHeight: number) {
  let height = 0
  for (const box of floorGeometry(map, level).obstacles) {
    if (box.height === undefined || box.height > maxHeight || x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue
    height = Math.max(height, box.height)
  }
  return height
}
