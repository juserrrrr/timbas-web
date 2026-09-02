"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality } from "../match-types"
import { useVisionMaterial } from "./vision-material"

const WALL_HEIGHT = 2.15

type Box = [w: number, h: number, d: number, x: number, y: number, z: number]

interface PropSpec {
  color: string
  emissive?: string
  boxes: Box[]
}

const PROPS: Record<string, PropSpec> = {
  desk: {
    color: "#c09a70",
    boxes: [
      [1.7, 0.08, 0.85, 0, 0.74, 0],
      [0.1, 0.72, 0.75, -0.78, 0.36, 0],
      [0.1, 0.72, 0.75, 0.78, 0.36, 0],
      [1.5, 0.3, 0.06, 0, 0.5, -0.38],
    ],
  },
  chair: {
    color: "#46536a",
    boxes: [
      [0.5, 0.08, 0.5, 0, 0.46, 0],
      [0.5, 0.55, 0.08, 0, 0.75, -0.22],
      [0.12, 0.4, 0.12, 0, 0.24, 0],
      [0.55, 0.06, 0.55, 0, 0.06, 0],
    ],
  },
  monitor: {
    color: "#202a38",
    emissive: "#3b82f6",
    boxes: [
      [0.62, 0.38, 0.05, 0, 1.06, 0],
      [0.1, 0.18, 0.1, 0, 0.87, 0],
      [0.34, 0.03, 0.2, 0, 0.79, 0],
    ],
  },
  plant: {
    color: "#4e8b5b",
    boxes: [
      [0.38, 0.36, 0.38, 0, 0.18, 0],
      [0.52, 0.62, 0.52, 0, 0.7, 0],
      [0.3, 0.3, 0.3, 0.16, 1.05, -0.1],
    ],
  },
  sofa: {
    color: "#576984",
    boxes: [
      [2.0, 0.42, 0.9, 0, 0.28, 0],
      [2.0, 0.5, 0.24, 0, 0.68, -0.34],
      [0.22, 0.55, 0.9, -0.9, 0.55, 0],
      [0.22, 0.55, 0.9, 0.9, 0.55, 0],
    ],
  },
  counter: {
    color: "#a78a65",
    boxes: [
      [4.2, 1.05, 0.9, 0, 0.52, 0],
      [4.5, 0.1, 1.1, 0, 1.08, 0],
    ],
  },
  meetingTable: {
    color: "#9b744d",
    boxes: [
      [3.8, 0.12, 1.7, 0, 0.74, 0],
      [1.2, 0.7, 0.6, 0, 0.36, 0],
    ],
  },
  rack: {
    color: "#191d25",
    emissive: "#37d39a",
    boxes: [
      [0.8, 2.0, 1.0, 0, 1.0, 0],
      [0.62, 1.7, 0.04, 0, 1.05, 0.52],
    ],
  },
  locker: {
    color: "#4a4f5e",
    boxes: [
      [1.1, 2.0, 0.55, 0, 1.0, 0],
      [1.14, 0.05, 0.6, 0, 1.35, 0],
      [1.14, 0.05, 0.6, 0, 0.7, 0],
    ],
  },
  shelf: {
    color: "#6b5a45",
    boxes: [
      [2.6, 0.08, 0.6, 0, 0.5, 0],
      [2.6, 0.08, 0.6, 0, 1.1, 0],
      [2.6, 0.08, 0.6, 0, 1.7, 0],
      [0.1, 1.9, 0.6, -1.28, 0.95, 0],
      [0.1, 1.9, 0.6, 1.28, 0.95, 0],
    ],
  },
  coffee: {
    color: "#2b3038",
    emissive: "#d97706",
    boxes: [
      [0.7, 1.0, 0.6, 0, 0.5, 0],
      [0.5, 0.16, 0.06, 0, 0.78, 0.3],
    ],
  },
  crate: {
    color: "#8a6f45",
    boxes: [
      [0.95, 0.9, 0.95, 0, 0.45, 0],
      [1.0, 0.08, 1.0, 0, 0.9, 0],
    ],
  },
  printer: {
    color: "#585f6d",
    boxes: [
      [0.9, 0.75, 0.7, 0, 0.38, 0],
      [0.7, 0.1, 0.5, 0, 0.8, 0.05],
    ],
  },
  whiteboard: {
    color: "#e8e8e2",
    boxes: [
      [2.6, 1.3, 0.07, 0, 1.35, 0],
      [2.7, 0.09, 0.12, 0, 0.68, 0],
    ],
  },
  car: {
    color: "#6b2f34",
    boxes: [
      [2.0, 0.7, 4.3, 0, 0.55, 0],
      [1.75, 0.6, 2.1, 0, 1.15, -0.15],
      [0.35, 0.6, 0.6, -1.0, 0.36, 1.4],
      [0.35, 0.6, 0.6, 1.0, 0.36, 1.4],
      [0.35, 0.6, 0.6, -1.0, 0.36, -1.4],
      [0.35, 0.6, 0.6, 1.0, 0.36, -1.4],
    ],
  },
  cone: {
    color: "#e2622a",
    boxes: [
      [0.4, 0.06, 0.4, 0, 0.03, 0],
      [0.22, 0.5, 0.22, 0, 0.28, 0],
    ],
  },
  sink: {
    color: "#8d939e",
    boxes: [
      [1.7, 0.16, 0.6, 0, 0.86, 0],
      [1.7, 0.7, 0.5, 0, 0.44, -0.04],
    ],
  },
  vending: {
    color: "#23303d",
    emissive: "#38bdf8",
    boxes: [
      [1.1, 2.0, 0.75, 0, 1.0, 0],
      [0.75, 1.4, 0.05, 0, 1.15, 0.39],
    ],
  },
}

function geometryFor(spec: PropSpec): THREE.BufferGeometry {
  const parts = spec.boxes.map(([w, h, d, x, y, z]) => {
    const box = new THREE.BoxGeometry(w, h, d)
    box.translate(x, y, z)
    return box
  })
  const merged = mergeGeometries(parts, false)!
  parts.forEach((part) => part.dispose())
  return merged
}

function Instances({
  geometry,
  material,
  transforms,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  transforms: { x: number; z: number; rot: number; sx?: number; sy?: number; sz?: number; color?: string }[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    transforms.forEach((item, index) => {
      dummy.position.set(item.x, 0, item.z)
      dummy.rotation.set(0, item.rot, 0)
      dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      if (item.color) mesh.setColorAt(index, new THREE.Color(item.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [transforms])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  )
}

export function OfficeWorld({ map, quality, blackout }: { map: OfficeMap; quality: Quality; blackout: boolean }) {
  const floorMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.95 })
  const wallMaterial = useVisionMaterial({ color: "#9ca8ba", roughness: 0.82 })
  const trimMaterial = useVisionMaterial({ color: "#364154", roughness: 0.55, metalness: 0.08 })

  const floors = useMemo(
    () =>
      map.rooms.map((room) => ({
        x: room.rect.x + room.rect.w / 2,
        z: room.rect.z + room.rect.d / 2,
        rot: 0,
        sx: room.rect.w,
        sy: 1,
        sz: room.rect.d,
        color: room.floor,
      })),
    [map.rooms],
  )

  const walls = useMemo(
    () =>
      map.walls.map((wall) => ({
        x: (wall.minX + wall.maxX) / 2,
        z: (wall.minZ + wall.maxZ) / 2,
        rot: 0,
        sx: wall.maxX - wall.minX,
        sy: WALL_HEIGHT,
        sz: wall.maxZ - wall.minZ,
      })),
    [map.walls],
  )

  // O friso escuro no topo da parede dá a linha que separa uma sala da outra
  // quando a câmera olha de cima. Sem ele o escritório vira um labirinto chapado.
  const trims = useMemo(() => walls.map((wall) => ({ ...wall, sy: 1, sx: wall.sx + 0.1, sz: wall.sz + 0.1 })), [walls])

  const floorGeometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    plane.rotateX(-Math.PI / 2)
    plane.translate(0, 0.01, 0)
    return plane
  }, [])

  const wallGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, 0.5, 0)
    return box
  }, [])

  const trimGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 0.12, 1)
    box.translate(0, WALL_HEIGHT - 0.05, 0)
    return box
  }, [])

  const propGroups = useMemo(() => {
    const byKind = new Map<string, { x: number; z: number; rot: number }[]>()
    for (const item of map.props) {
      if (!PROPS[item.kind]) continue
      // No modo leve a mobília solta some, mas o que marca sala (rack, armário,
      // mesa de reunião) fica: sem eles ninguém reconhece onde está.
      if (quality === "baixo" && ["chair", "cone", "plant", "monitor"].includes(item.kind)) continue
      const list = byKind.get(item.kind) ?? []
      list.push({ x: item.x, z: item.z, rot: item.rot })
      byKind.set(item.kind, list)
    }
    return [...byKind.entries()].map(([kind, transforms]) => ({ kind, transforms }))
  }, [map.props, quality])

  const litRooms = useMemo(
    () => (quality === "alto" ? map.rooms : map.rooms.filter((_, index) => index % 2 === 0)),
    [map.rooms, quality],
  )

  return (
    <group>
      <Instances geometry={floorGeometry} material={floorMaterial} transforms={floors} />
      <Instances geometry={wallGeometry} material={wallMaterial} transforms={walls} />
      <Instances geometry={trimGeometry} material={trimMaterial} transforms={trims} />
      {quality !== "baixo" &&
        litRooms.map((room) => (
          <pointLight
            key={room.id}
            position={[room.rect.x + room.rect.w / 2, 3.6, room.rect.z + room.rect.d / 2]}
            color={room.light}
            intensity={blackout ? 0.02 : 0.72}
            distance={Math.max(room.rect.w, room.rect.d) * 0.82}
            decay={1.65}
          />
        ))}
      {propGroups.map((group) => (
        <PropKind key={group.kind} kind={group.kind} transforms={group.transforms} />
      ))}
    </group>
  )
}

function PropKind({ kind, transforms }: { kind: string; transforms: { x: number; z: number; rot: number }[] }) {
  const spec = PROPS[kind]
  const geometry = useMemo(() => geometryFor(spec), [spec])
  const material = useVisionMaterial({
    color: spec.color,
    emissive: spec.emissive,
    emissiveIntensity: spec.emissive ? 0.6 : 0,
    roughness: 0.8,
  })
  return <Instances geometry={geometry} material={material} transforms={transforms} />
}
