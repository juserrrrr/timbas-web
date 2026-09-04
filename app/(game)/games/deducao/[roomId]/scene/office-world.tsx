"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useGLTF } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality } from "../match-types"
import { patchVision } from "./vision-material"

export const FLOOR_HEIGHT = 4.2
const WALL_HEIGHT = 4.02
const BUILDING_MODEL = "/models/games/deducao/timbas-office-building.glb"

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
}

interface DetailedModelConfig {
  path: string
  fit?: { width: number; depth: number }
  skipNodes?: readonly string[]
}

const EMERGENCY_LIGHT_MODEL = { path: "/models/games/deducao/emergency-light.glb" } as const

useGLTF.preload(BUILDING_MODEL)
useGLTF.preload(EMERGENCY_LIGHT_MODEL.path)

function cloneMaterial(source: THREE.Material, blackout: boolean) {
  const material = source.clone()
  if (material instanceof THREE.MeshStandardMaterial) {
    material.envMapIntensity = 1.1
    material.emissiveIntensity *= blackout ? 0.035 : 1
  }
  return patchVision(material)
}

export function OfficeBuilding({ blackout, quality }: { blackout: boolean; quality: Quality }) {
  const { scene } = useGLTF(BUILDING_MODEL)
  const building = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => cloneMaterial(material, blackout))
        : cloneMaterial(child.material, blackout)
      child.castShadow = quality === "alto" && (child.name.startsWith("Wall") || child.name.startsWith("Structure"))
      child.receiveShadow = true
      child.frustumCulled = true
    })
    return clone
  }, [blackout, quality, scene])

  useEffect(
    () => () => {
      building.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => material.dispose())
      })
    },
    [building],
  )

  return <primitive object={building} dispose={null} />
}

function emergencyPlacements(map: OfficeMap, level: number): Placement[] {
  const corridors = map.rooms.filter(
    (room) => (room.level ?? 0) === level && room.kind === "corredor",
  )
  return corridors.flatMap((room) => {
    const count = Math.max(2, Math.floor(Math.max(room.rect.w, room.rect.d) / 9))
    const alongX = room.rect.w > room.rect.d
    return Array.from({ length: count }, (_, index) => ({
      x: alongX
        ? room.rect.x + ((index + 1) * room.rect.w) / (count + 1)
        : room.rect.x + room.rect.w / 2,
      y: WALL_HEIGHT - 0.13,
      z: alongX
        ? room.rect.z + room.rect.d / 2
        : room.rect.z + ((index + 1) * room.rect.d) / (count + 1),
      rot: alongX ? 0 : Math.PI / 2,
    }))
  })
}

function StableOfficeFill({ quality }: { quality: Quality }) {
  const { camera } = useThree()
  const direction = useMemo(() => new THREE.Vector3(), [])
  const lights = useMemo(
    () => {
      const count = quality === "alto" ? 2 : 1
      return Array.from({ length: count }, (_, index) => {
        const light = new THREE.PointLight(index === 0 ? "#fff2dc" : "#dcecff", 0)
        light.decay = 2
        return light
      })
    },
    [quality],
  )
  const targets = useMemo(() => lights.map(() => new THREE.Vector3()), [lights])

  useEffect(() => () => lights.forEach((light) => light.dispose()), [lights])

  useFrame((_, delta) => {
    camera.getWorldDirection(direction)
    direction.y = 0
    if (direction.lengthSq() < 0.001) direction.set(0, 0, -1)
    else direction.normalize()
    lights.forEach((light, index) => {
      const ahead = index === 0 ? 1.5 : 9
      const target = targets[index].set(
        camera.position.x + direction.x * ahead,
        WALL_HEIGHT - (index === 0 ? 0.62 : 0.88),
        camera.position.z + direction.z * ahead,
      )
      light.position.lerp(target, 1 - Math.exp(-10 * Math.min(delta, 0.1)))
      light.intensity = quality === "baixo" ? 7 : index === 0 ? 9.5 : 6.5
      light.distance = quality === "baixo" ? 19 : index === 0 ? 23 : 20
    })
  })

  return lights.map((light, index) => <primitive key={index} object={light} />)
}

function EmergencyLightPool({ lights, quality }: { lights: RoomLightSource[]; quality: Quality }) {
  const scale = quality === "baixo" ? 0.62 : quality === "medio" ? 0.82 : 1
  return lights.map((light, index) => (
    <pointLight
      key={index}
      position={[light.x, light.y, light.z]}
      color={light.color}
      intensity={light.intensity * scale}
      distance={light.distance}
      decay={2}
    />
  ))
}

export function OfficeWorld({
  map,
  quality,
  blackout,
  level,
  baseY = 0,
  active = true,
}: {
  map: OfficeMap
  quality: Quality
  blackout: boolean
  level: number
  baseY?: number
  active?: boolean
}) {
  const emergencyFixtures = useMemo(() => emergencyPlacements(map, level), [level, map])
  const emergencyLights = useMemo<RoomLightSource[]>(
    () => [
      ...emergencyFixtures.map((fixture) => ({
        x: fixture.x,
        y: fixture.y ?? WALL_HEIGHT,
        z: fixture.z,
        color: "#ff2038",
        intensity: 20,
        distance: 8,
      })),
      ...((map.emergency.level ?? 0) === level
        ? [{
            x: map.emergency.x,
            y: (map.emergency.y ?? 0) + 0.18,
            z: map.emergency.z,
            color: "#ff2038",
            intensity: 12,
            distance: 4.8,
          }]
        : []),
    ],
    [emergencyFixtures, level, map.emergency],
  )

  return (
    <group position-y={baseY}>
      {blackout && (
        <DetailedPropKind
          kind="emergencyLight"
          model={EMERGENCY_LIGHT_MODEL}
          transforms={emergencyFixtures}
          shadows={false}
        />
      )}
      {active && !blackout && <StableOfficeFill quality={quality} />}
      {active && blackout && <EmergencyLightPool lights={emergencyLights} quality={quality} />}
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
  const { scene } = useGLTF(model.path)
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
        material.emissiveIntensity *= emissiveScale
      }
      return [{
        key: `${kind}-${index}-${mesh.name}`,
        geometry: mesh.geometry,
        material: patchVision(material),
        matrix: normalizer.clone().multiply(mesh.matrixWorld),
      }]
    })
  }, [emissiveScale, kind, model, scene])

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
