"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality } from "../match-types"
import { useVisionMaterial } from "./vision-material"

/// Parede baixa de propósito: a câmera olha de cima e de longe, e parede alta
/// vira um muro que engole a sala inteira. Na altura do peito ela ainda corta a
/// passagem e a linha de visão, mas deixa o cômodo aberto para quem olha.
const WALL_HEIGHT = 1.55
const TRIM_HEIGHT = 0.16
const BASEBOARD_HEIGHT = 0.22

/// Cada sala é uma laje solta no vazio. A espessura é o que dá a ela cara de
/// peça pousada em cima de nada, em vez de buraco recortado num chão infinito.
const SLAB_SALA = 0.6
const SLAB_CORREDOR = 0.36
const PLINTH_OVERHANG = 0.5

type Box = [w: number, h: number, d: number, x: number, y: number, z: number, tone?: string]

interface PropSpec {
  color: string
  emissive?: string
  emissiveIntensity?: number
  boxes: Box[]
}

// Cada peça é um punhado de caixas de cantos quebrados, cada uma com a sua cor.
// O tampo claro sobre o pé escuro é o que separa um móvel de um bloco.
const PROPS: Record<string, PropSpec> = {
  desk: {
    color: "#e9edf3",
    boxes: [
      [1.7, 0.08, 0.85, 0, 0.74, 0, "#f6f8fc"],
      [0.1, 0.72, 0.75, -0.78, 0.36, 0, "#a7b3c5"],
      [0.1, 0.72, 0.75, 0.78, 0.36, 0, "#a7b3c5"],
      [1.5, 0.3, 0.06, 0, 0.5, -0.38, "#d8e0ea"],
    ],
  },
  chair: {
    color: "#5a6b86",
    boxes: [
      [0.5, 0.08, 0.5, 0, 0.46, 0, "#687894"],
      [0.5, 0.55, 0.08, 0, 0.75, -0.22, "#5a6b86"],
      [0.12, 0.4, 0.12, 0, 0.24, 0, "#9aa6b8"],
      [0.55, 0.06, 0.55, 0, 0.06, 0, "#7b8799"],
    ],
  },
  monitor: {
    color: "#111a26",
    emissive: "#60a5fa",
    emissiveIntensity: 0.5,
    boxes: [
      [0.62, 0.38, 0.05, 0, 1.06, 0, "#16202e"],
      [0.1, 0.18, 0.1, 0, 0.87, 0, "#c3ccd9"],
      [0.34, 0.03, 0.2, 0, 0.79, 0, "#c3ccd9"],
    ],
  },
  plant: {
    color: "#4fa86a",
    boxes: [
      [0.38, 0.36, 0.38, 0, 0.18, 0, "#cf9070"],
      [0.52, 0.62, 0.52, 0, 0.7, 0, "#4fa86a"],
      [0.3, 0.3, 0.3, 0.16, 1.05, -0.1, "#6cc78a"],
    ],
  },
  sofa: {
    color: "#7d8ea8",
    boxes: [
      [2.0, 0.42, 0.9, 0, 0.28, 0, "#8496af"],
      [2.0, 0.5, 0.24, 0, 0.68, -0.34, "#7d8ea8"],
      [0.22, 0.55, 0.9, -0.9, 0.55, 0, "#94a4bc"],
      [0.22, 0.55, 0.9, 0.9, 0.55, 0, "#94a4bc"],
    ],
  },
  counter: {
    color: "#e3d3bd",
    boxes: [
      [4.2, 1.05, 0.9, 0, 0.52, 0, "#e3d3bd"],
      [4.5, 0.1, 1.1, 0, 1.08, 0, "#f7f9fc"],
    ],
  },
  meetingTable: {
    color: "#e9d7bd",
    boxes: [
      [3.8, 0.12, 1.7, 0, 0.74, 0, "#eddcc4"],
      [1.2, 0.7, 0.6, 0, 0.36, 0, "#b99a76"],
    ],
  },
  rack: {
    color: "#232a36",
    emissive: "#34d399",
    emissiveIntensity: 0.45,
    boxes: [
      [0.8, 2.0, 1.0, 0, 1.0, 0, "#262f3d"],
      [0.62, 1.7, 0.04, 0, 1.05, 0.52, "#111820"],
    ],
  },
  locker: {
    color: "#8e9bb0",
    boxes: [
      [1.1, 2.0, 0.55, 0, 1.0, 0, "#8e9bb0"],
      [1.14, 0.05, 0.6, 0, 1.35, 0, "#b3bfd1"],
      [1.14, 0.05, 0.6, 0, 0.7, 0, "#b3bfd1"],
    ],
  },
  shelf: {
    color: "#dcc39c",
    boxes: [
      [2.6, 0.08, 0.6, 0, 0.5, 0, "#e6d2b1"],
      [2.6, 0.08, 0.6, 0, 1.1, 0, "#e6d2b1"],
      [2.6, 0.08, 0.6, 0, 1.7, 0, "#e6d2b1"],
      [0.1, 1.9, 0.6, -1.28, 0.95, 0, "#b99a76"],
      [0.1, 1.9, 0.6, 1.28, 0.95, 0, "#b99a76"],
    ],
  },
  coffee: {
    color: "#39404d",
    emissive: "#f59e0b",
    emissiveIntensity: 0.3,
    boxes: [
      [0.7, 1.0, 0.6, 0, 0.5, 0, "#39404d"],
      [0.5, 0.16, 0.06, 0, 0.78, 0.3, "#f0b45c"],
    ],
  },
  crate: {
    color: "#d3ad76",
    boxes: [
      [0.95, 0.9, 0.95, 0, 0.45, 0, "#d3ad76"],
      [1.0, 0.08, 1.0, 0, 0.9, 0, "#e3c294"],
    ],
  },
  printer: {
    color: "#8b95a6",
    boxes: [
      [0.9, 0.75, 0.7, 0, 0.38, 0, "#8b95a6"],
      [0.7, 0.1, 0.5, 0, 0.8, 0.05, "#c2cbd8"],
    ],
  },
  whiteboard: {
    color: "#f7f9fc",
    boxes: [
      [2.6, 1.3, 0.07, 0, 1.35, 0, "#fbfcfe"],
      [2.7, 0.09, 0.12, 0, 0.68, 0, "#aeb9c9"],
    ],
  },
  car: {
    color: "#c0475a",
    boxes: [
      [2.0, 0.7, 4.3, 0, 0.55, 0, "#c0475a"],
      [1.75, 0.6, 2.1, 0, 1.15, -0.15, "#cfe0ef"],
      [0.35, 0.6, 0.6, -1.0, 0.36, 1.4, "#2a2f38"],
      [0.35, 0.6, 0.6, 1.0, 0.36, 1.4, "#2a2f38"],
      [0.35, 0.6, 0.6, -1.0, 0.36, -1.4, "#2a2f38"],
      [0.35, 0.6, 0.6, 1.0, 0.36, -1.4, "#2a2f38"],
    ],
  },
  cone: {
    color: "#f2703c",
    boxes: [
      [0.4, 0.06, 0.4, 0, 0.03, 0, "#3a4049"],
      [0.22, 0.5, 0.22, 0, 0.28, 0, "#f2703c"],
    ],
  },
  sink: {
    color: "#eef2f7",
    boxes: [
      [1.7, 0.16, 0.6, 0, 0.86, 0, "#f4f7fb"],
      [1.7, 0.7, 0.5, 0, 0.44, -0.04, "#b6c1d0"],
    ],
  },
  vending: {
    color: "#2a3a4c",
    emissive: "#38bdf8",
    emissiveIntensity: 0.4,
    boxes: [
      [1.1, 2.0, 0.75, 0, 1.0, 0, "#2a3a4c"],
      [0.75, 1.4, 0.05, 0, 1.15, 0.39, "#9ad6f7"],
    ],
  },
}

/// Pinta a caixa inteira de uma cor só, por vértice. É o que deixa um móvel
/// com várias cores caber num material só e continuar valendo um desenho.
function paint(geometry: THREE.BufferGeometry, hex: string) {
  const tone = new THREE.Color(hex)
  const count = geometry.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = tone.r
    colors[index * 3 + 1] = tone.g
    colors[index * 3 + 2] = tone.b
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
}

/// Sombreado de fábrica nas faces: topo cheio, lateral um pouco abaixo, fundo
/// no escuro. A laje ganha profundidade sem depender de luz nenhuma bater nela.
function shadeByFace(geometry: THREE.BufferGeometry, top: number, side: number, bottom: number) {
  const normal = geometry.attributes.normal
  const colors = new Float32Array(normal.count * 3)
  for (let index = 0; index < normal.count; index += 1) {
    const up = normal.getY(index)
    const value = up > 0.5 ? top : up < -0.5 ? bottom : side
    colors[index * 3] = value
    colors[index * 3 + 1] = value
    colors[index * 3 + 2] = value
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
}

function mix(from: string, to: string, amount: number): string {
  return `#${new THREE.Color(from).lerp(new THREE.Color(to), amount).getHexString()}`
}

function geometryFor(spec: PropSpec): THREE.BufferGeometry {
  const parts = spec.boxes.map(([w, h, d, x, y, z, tone]) => {
    const box = new RoundedBoxGeometry(w, h, d, 1, 0.045)
    box.translate(x, y, z)
    paint(box, tone ?? spec.color)
    return box
  })
  const merged = mergeGeometries(parts, false)!
  parts.forEach((part) => part.dispose())
  return merged
}

interface Placement {
  x: number
  z: number
  rot: number
  y?: number
  sx?: number
  sy?: number
  sz?: number
  color?: string
}

function Instances({
  geometry,
  material,
  transforms,
  shadows = true,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  transforms: Placement[]
  shadows?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    transforms.forEach((item, index) => {
      dummy.position.set(item.x, item.y ?? 0, item.z)
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
      castShadow={shadows}
      receiveShadow={shadows}
      frustumCulled={false}
    />
  )
}

export function OfficeWorld({ map, quality, blackout }: { map: OfficeMap; quality: Quality; blackout: boolean }) {
  const floorMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.94, vertexColors: true })
  const plinthMaterial = useVisionMaterial({ color: "#39435c", roughness: 0.95, vertexColors: true })
  const rugMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.99 })
  const wallMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.76, vertexColors: true })
  const baseboardMaterial = useVisionMaterial({ color: "#b0bccd", roughness: 0.7, metalness: 0.05 })
  const trimMaterial = useVisionMaterial({ color: "#ffffff", unlit: true })

  // O apagão não tem como apagar um material sem luz, então ele apaga a cor do
  // friso na mão. É a única coisa da cena que continua acesa no escuro.
  useEffect(() => {
    const target = blackout ? 0.14 : 1
    ;(trimMaterial as THREE.MeshBasicMaterial).color.setScalar(target)
  }, [trimMaterial, blackout])

  const floors = useMemo(
    () =>
      map.rooms.map((room) => ({
        x: room.rect.x + room.rect.w / 2,
        z: room.rect.z + room.rect.d / 2,
        rot: 0,
        sx: room.rect.w,
        sy: room.kind === "corredor" ? SLAB_CORREDOR : SLAB_SALA,
        sz: room.rect.d,
        color: room.floor,
      })),
    [map.rooms],
  )

  // A base escura que aparece só nas bordas da laje: é ela que faz a sala
  // parecer pousada no vazio em vez de recortada nele.
  const plinths = useMemo(
    () =>
      map.rooms.map((room) => ({
        x: room.rect.x + room.rect.w / 2,
        y: -0.18,
        z: room.rect.z + room.rect.d / 2,
        rot: 0,
        sx: room.rect.w + PLINTH_OVERHANG * 2,
        sy: (room.kind === "corredor" ? SLAB_CORREDOR : SLAB_SALA) + 0.75,
        sz: room.rect.d + PLINTH_OVERHANG * 2,
      })),
    [map.rooms],
  )

  // Um tapete no meio das salas grandes. Sem ele o miolo do cômodo é um vazio
  // de cor única do tamanho de uma quadra.
  const rugs = useMemo(
    () =>
      map.rooms
        .filter((room) => room.kind === "sala" && room.rect.w >= 11 && room.rect.d >= 11)
        .map((room) => ({
          x: room.rect.x + room.rect.w / 2,
          y: 0.012,
          z: room.rect.z + room.rect.d / 2,
          rot: 0,
          sx: room.rect.w - 5,
          sy: 1,
          sz: room.rect.d - 5,
          color: mix(room.floor, room.light, 0.28),
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
        sy: 1,
        sz: wall.maxZ - wall.minZ,
        accent: wall.accent ?? "#a5b4fc",
      })),
    [map.walls],
  )

  const baseboards = useMemo(
    () => walls.map((wall) => ({ ...wall, sx: wall.sx + 0.08, sz: wall.sz + 0.08 })),
    [walls],
  )

  // O friso aceso no alto da parede é o que diz de longe em que sala o jogador
  // está: cada cômodo tem a sua cor, e ela some junto com a luz no apagão.
  const trims = useMemo(
    () => walls.map((wall) => ({ ...wall, sx: wall.sx + 0.12, sz: wall.sz + 0.12, color: wall.accent })),
    [walls],
  )

  const slabGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, -0.5, 0)
    shadeByFace(box, 1, 0.7, 0.36)
    return box
  }, [])

  const plinthGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, -0.5, 0)
    shadeByFace(box, 0.55, 1, 0.5)
    return box
  }, [])

  const rugGeometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    plane.rotateX(-Math.PI / 2)
    return plane
  }, [])

  const wallGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, WALL_HEIGHT, 1)
    box.translate(0, WALL_HEIGHT / 2, 0)
    shadeByFace(box, 1, 0.9, 0.6)
    return box
  }, [])

  const baseboardGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, BASEBOARD_HEIGHT, 1)
    box.translate(0, BASEBOARD_HEIGHT / 2, 0)
    return box
  }, [])

  const trimGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, TRIM_HEIGHT, 1)
    box.translate(0, WALL_HEIGHT + TRIM_HEIGHT / 2, 0)
    return box
  }, [])

  useEffect(() => {
    const geometries = [slabGeometry, plinthGeometry, rugGeometry, wallGeometry, baseboardGeometry, trimGeometry]
    return () => geometries.forEach((geometry) => geometry.dispose())
  }, [slabGeometry, plinthGeometry, rugGeometry, wallGeometry, baseboardGeometry, trimGeometry])

  const propGroups = useMemo(() => {
    const byKind = new Map<string, Placement[]>()
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

  return (
    <group>
      <Instances geometry={plinthGeometry} material={plinthMaterial} transforms={plinths} shadows={false} />
      <Instances geometry={slabGeometry} material={floorMaterial} transforms={floors} />
      <Instances geometry={rugGeometry} material={rugMaterial} transforms={rugs} shadows={false} />
      <Instances geometry={wallGeometry} material={wallMaterial} transforms={walls} />
      <Instances geometry={baseboardGeometry} material={baseboardMaterial} transforms={baseboards} shadows={false} />
      <Instances geometry={trimGeometry} material={trimMaterial} transforms={trims} shadows={false} />
      {propGroups.map((group) => (
        <PropKind key={group.kind} kind={group.kind} transforms={group.transforms} />
      ))}
    </group>
  )
}

function PropKind({ kind, transforms }: { kind: string; transforms: Placement[] }) {
  const spec = PROPS[kind]
  const geometry = useMemo(() => geometryFor(spec), [spec])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useVisionMaterial({
    color: "#ffffff",
    emissive: spec.emissive,
    emissiveIntensity: spec.emissive ? (spec.emissiveIntensity ?? 0.45) : 0,
    roughness: 0.72,
    vertexColors: true,
  })
  return <Instances geometry={geometry} material={material} transforms={transforms} />
}
