"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality } from "../match-types"
import { patchVision } from "./vision-material"
import { FIXTURE_INTENSITY } from "./lighting-profile"
import { FLOOR_HEIGHT } from "./movement-geometry"
import type { OfficeLightSource } from "./light-grid"

export { FLOOR_HEIGHT } from "./movement-geometry"
const WALL_HEIGHT = 4.02
const BUILDING_MODEL = "/models/games/deducao/timbas-office-building.glb"
const STAIR_OPENING_HALF_WIDTH = 1.35
const STAIR_OPENING_END_PADDING = 0.12

interface Placement {
  x: number
  z: number
  rot: number
  y?: number
  sx?: number
  sy?: number
  sz?: number
}

interface RoomLightSource {
  x: number
  y: number
  z: number
  color: string
  intensity: number
  distance: number
  halfLength: number
  axis: "x" | "y" | "z"
}

interface CeilingFixturePlacement extends Placement {
  roomArea: number
}

interface DetailedModelConfig {
  path: string
  fit?: { width: number; depth: number }
  skipNodes?: readonly string[]
}

const EMERGENCY_LIGHT_MODEL = { path: "/models/games/deducao/emergency-light.glb" } as const

useGLTF.preload(BUILDING_MODEL, true, false)
useGLTF.preload(EMERGENCY_LIGHT_MODEL.path, true, false)

function cloneMaterial(source: THREE.Material, blackout = false) {
  const material = source.clone()
  if (material instanceof THREE.MeshStandardMaterial) {
    material.envMapIntensity = 1.1
    material.emissiveIntensity *= blackout && !source.name.startsWith("Exterior") ? 0.035 : 1
  }
  return patchVision(material)
}

export function OfficeBuilding({ blackout, quality }: { blackout: boolean; quality: Quality }) {
  const { scene } = useGLTF(BUILDING_MODEL, true, false)
  const { building, materials, meshes } = useMemo(() => {
    const clone = scene.clone(true)
    const copies = new Map<THREE.Material, THREE.Material>()
    const meshes: THREE.Mesh[] = []
    const copy = (source: THREE.Material) => {
      if (!copies.has(source)) copies.set(source, cloneMaterial(source))
      return copies.get(source)!
    }
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = Array.isArray(child.material)
        ? child.material.map(copy)
        : copy(child.material)
      child.receiveShadow = true
      child.frustumCulled = true
      meshes.push(child)
    })
    return { building: clone, materials: copies, meshes }
  }, [scene])

  useLayoutEffect(() => {
    materials.forEach((material, source) => {
      if (material instanceof THREE.MeshStandardMaterial && source instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity = source.emissiveIntensity * (blackout && !source.name.startsWith("Exterior") ? 0.035 : 1)
      }
    })
    meshes.forEach((mesh) => {
      mesh.castShadow = quality === "alto" && (mesh.name.startsWith("Wall") || mesh.name.startsWith("Structure"))
    })
  }, [blackout, quality, materials, meshes])

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])

  return <primitive object={building} dispose={null} />
}

function isInsideStairOpening(map: OfficeMap, level: number, x: number, z: number) {
  if (level !== 0) return false
  return map.stairs
    .filter((stair) => stair.targetLevel > stair.level)
    .some((stair) => {
      const points = [{ x: stair.x, z: stair.z }]
      if (stair.turnX !== undefined && stair.turnZ !== undefined) {
        points.push({ x: stair.turnX, z: stair.turnZ })
      }
      points.push({ x: stair.targetX, z: stair.targetZ })
      if (points.slice(1, -1).some((turn) =>
        Math.abs(x - turn.x) <= STAIR_OPENING_HALF_WIDTH && Math.abs(z - turn.z) <= STAIR_OPENING_HALF_WIDTH,
      )) return true
      return points.slice(0, -1).some((from, index) => {
        const to = points[index + 1]
        const vertical = Math.abs(to.z - from.z) >= Math.abs(to.x - from.x)
        const minX = Math.min(from.x, to.x) - (vertical ? STAIR_OPENING_HALF_WIDTH : STAIR_OPENING_END_PADDING)
        const maxX = Math.max(from.x, to.x) + (vertical ? STAIR_OPENING_HALF_WIDTH : STAIR_OPENING_END_PADDING)
        const minZ = Math.min(from.z, to.z) - (vertical ? STAIR_OPENING_END_PADDING : STAIR_OPENING_HALF_WIDTH)
        const maxZ = Math.max(from.z, to.z) + (vertical ? STAIR_OPENING_END_PADDING : STAIR_OPENING_HALF_WIDTH)
        return x >= minX && x <= maxX && z >= minZ && z <= maxZ
      })
    })
}

function ceilingFixturePlacements(map: OfficeMap, level: number): CeilingFixturePlacement[] {
  return map.rooms
    .filter((room) => (room.level ?? 0) === level && room.kind !== "terraco")
    .flatMap((room) => {
      const columns = Math.max(1, Math.min(3, Math.floor((room.rect.w - 2) / 6)))
      const rows = Math.max(1, Math.min(3, Math.floor((room.rect.d - 2) / 7)))
      return Array.from({ length: columns * rows }, (_, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)
        return {
          x: room.rect.x + ((column + 1) * room.rect.w) / (columns + 1),
          y: WALL_HEIGHT - 0.0625,
          z: room.rect.z + ((row + 1) * room.rect.d) / (rows + 1),
          rot: Math.PI / 2,
          roomArea: room.rect.w * room.rect.d,
        }
      })
    })
    .filter((fixture) => !isInsideStairOpening(map, level, fixture.x, fixture.z))
}

function emergencyPlacements(map: OfficeMap, level: number): Placement[] {
  const corridors = map.rooms.filter(
    (room) => (room.level ?? 0) === level && room.kind === "corredor",
  )
  return corridors
    .flatMap((room) => {
      const count = Math.max(2, Math.floor(Math.max(room.rect.w, room.rect.d) / 9))
      const alongX = room.rect.w > room.rect.d
      return Array.from({ length: count }, (_, index) => ({
        x: alongX
          ? room.rect.x + ((index + 1) * room.rect.w) / (count + 1)
          : room.rect.x + 1.3,
        y: WALL_HEIGHT - 0.0755,
        z: alongX
          ? room.rect.z + 1.3
          : room.rect.z + ((index + 1) * room.rect.d) / (count + 1),
        rot: alongX ? 0 : Math.PI / 2,
      }))
    })
    .filter((fixture) => !isInsideStairOpening(map, level, fixture.x, fixture.z))
}

function normalLightSources(fixtures: CeilingFixturePlacement[]): RoomLightSource[] {
  return fixtures.map((fixture) => ({
    x: fixture.x,
    y: (fixture.y ?? WALL_HEIGHT) - 0.2,
    z: fixture.z,
    color: "#fff1dc",
    intensity: FIXTURE_INTENSITY.ceiling,
    distance: Math.min(9.6, Math.max(7.2, Math.sqrt(fixture.roomArea) * 0.64)),
    halfLength: 0.795,
    axis: "z",
  }))
}

function terraceLightSources(map: OfficeMap, level: number): RoomLightSource[] {
  return map.rooms
    .filter((room) => room.kind === "terraco" && (room.level ?? 0) === level)
    .flatMap((room) => [0.140625, 0.859375].map((side) => ({
      // A fonte acompanha toda a fita sob a viga lateral.
      x: room.rect.x + room.rect.w * side,
      y: 2.49,
      z: room.rect.z + room.rect.d * (10 / 19),
      color: "#ffc18a",
      intensity: FIXTURE_INTENSITY.terrace,
      distance: 10.5,
      halfLength: room.rect.d * (2.43 / 19),
      axis: "z" as const,
    })))
}

function accentLightSources(map: OfficeMap, level: number): RoomLightSource[] {
  const hall = map.rooms.find((room) => room.id === (level === 0 ? "hall-central" : "hall-superior"))
  if (!hall) return []
  const scaleZ = (map.bounds.d - 6) / 52
  return [20.5, 37.5].flatMap((z) => [1, -1].flatMap((inward) => {
    if (inward === -1 && z > 30) return []
    return [{
      x: hall.rect.x + (inward === -1 ? hall.rect.w : 0) + inward * 0.34,
      y: 1.75,
      z: 3 + (z - 3) * scaleZ,
      color: inward === 1 ? "#38bfff" : "#ffbd45",
      intensity: FIXTURE_INTENSITY.accent,
      distance: 3.2,
      halfLength: 1.09,
      axis: "y" as const,
    }]
  }))
}

export function worldLightSources(map: OfficeMap): OfficeLightSource[] {
  const levels = [...new Set(map.rooms.map((room) => room.level ?? 0))]
  return levels.flatMap((level) => {
    const normal = [...normalLightSources(ceilingFixturePlacements(map, level)), ...terraceLightSources(map, level), ...accentLightSources(map, level)]
    const emergency: RoomLightSource[] = emergencyPlacements(map, level).map((fixture) => ({
      x: fixture.x, y: (fixture.y ?? WALL_HEIGHT) - 0.08, z: fixture.z,
      color: "#ff2038", intensity: FIXTURE_INTENSITY.emergency, distance: 8,
      halfLength: 0.53, axis: Math.abs(Math.sin(fixture.rot)) > 0.5 ? "z" : "x",
    }))
    if ((map.emergency.level ?? 0) === level) emergency.push({
      x: map.emergency.x, y: (map.emergency.y ?? 0) + 0.18, z: map.emergency.z,
      color: "#ff2038", intensity: FIXTURE_INTENSITY.emergencyButton, distance: 4.8,
      halfLength: 0, axis: "y",
    })
    return [normal, emergency].flatMap((group, mode) => group.map((light): OfficeLightSource => {
      const start: [number, number, number] = [light.x, light.y + level * FLOOR_HEIGHT, light.z]
      const end: [number, number, number] = [...start]
      const axis = light.axis === "x" ? 0 : light.axis === "y" ? 1 : 2
      start[axis] -= light.halfLength
      end[axis] += light.halfLength
      return { start, end, color: light.color, intensity: light.intensity, range: light.distance, radius: 0.12, emergency: mode === 1 }
    }))
  })
}

export function OfficeWorld({
  map,
  blackout,
  level,
  baseY = 0,
}: {
  map: OfficeMap
  blackout: boolean
  level: number
  baseY?: number
}) {
  const emergencyFixtures = useMemo(() => emergencyPlacements(map, level), [level, map])

  return (
    <group position-y={baseY}>
      <DetailedPropKind
        kind="emergencyLight"
        model={EMERGENCY_LIGHT_MODEL}
        transforms={emergencyFixtures}
        emissiveScale={blackout ? 1 : 0}
        shadows={false}
      />
    </group>
  )
}

function DetailedPropKind({
  kind,
  model,
  transforms,
  emissiveScale = 1,
  shadows = true,
}: {
  kind: string
  model: DetailedModelConfig
  transforms: Placement[]
  emissiveScale?: number
  shadows?: boolean
}) {
  const { scene } = useGLTF(model.path, true, false)
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true)
    const meshes: THREE.Mesh[] = []
    const bounds = new THREE.Box3()
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || model.skipNodes?.includes(child.name)) return
      child.geometry.computeBoundingBox()
      if (child.geometry.boundingBox) bounds.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld))
      meshes.push(child)
    })

    const normalizer = new THREE.Matrix4()
    if (model.fit && !bounds.isEmpty()) {
      const originalSize = bounds.getSize(new THREE.Vector3())
      const sourceLongOnX = originalSize.x > originalSize.z
      const targetLongOnZ = model.fit.depth > model.fit.width
      const rotation = new THREE.Matrix4().makeRotationY(sourceLongOnX === targetLongOnZ ? Math.PI / 2 : 0)
      const fittedBounds = bounds.clone().applyMatrix4(rotation)
      const fittedSize = fittedBounds.getSize(new THREE.Vector3())
      const scale = Math.min(model.fit.width / fittedSize.x, model.fit.depth / fittedSize.z)
      const scaling = new THREE.Matrix4().makeScale(scale, scale, scale)
      fittedBounds.applyMatrix4(scaling)
      const center = fittedBounds.getCenter(new THREE.Vector3())
      const translation = new THREE.Matrix4().makeTranslation(-center.x, -fittedBounds.min.y, -center.z)
      normalizer.copy(translation).multiply(scaling).multiply(rotation)
    }

    return meshes.flatMap((mesh, index) => {
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (source.length !== 1) return []
      const material = source[0].clone()
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = 1.15
      }
      return [{
        key: `${kind}-${index}-${mesh.name}`,
        geometry: mesh.geometry,
        material: patchVision(material),
        matrix: normalizer.clone().multiply(mesh.matrixWorld),
        emission: source[0] instanceof THREE.MeshStandardMaterial ? source[0].emissiveIntensity : 0,
      }]
    })
  }, [kind, model, scene])

  useLayoutEffect(() => {
    parts.forEach((part) => {
      if (part.material instanceof THREE.MeshStandardMaterial) part.material.emissiveIntensity = part.emission * emissiveScale
    })
  }, [parts, emissiveScale])

  useEffect(() => () => parts.forEach((part) => part.material.dispose()), [parts])

  return (
    <>
      {parts.map((part) => (
        <DetailedPartInstances key={part.key} part={part} transforms={transforms} shadows={shadows} />
      ))}
    </>
  )
}

function DetailedPartInstances({
  part,
  transforms,
  shadows,
}: {
  part: { geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 }
  transforms: Placement[]
  shadows: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = ref.current
    return () => { mesh?.dispose() }
  }, [part.geometry, part.material, transforms.length])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const placement = new THREE.Object3D()
    const matrix = new THREE.Matrix4()
    transforms.forEach((item, index) => {
      placement.position.set(item.x, item.y ?? 0, item.z)
      placement.rotation.set(0, item.rot, 0)
      placement.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1)
      placement.updateMatrix()
      matrix.multiplyMatrices(placement.matrix, part.matrix)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
  }, [part.matrix, transforms])

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, transforms.length]}
      castShadow={shadows}
      receiveShadow={shadows}
      dispose={null}
    />
  )
}
