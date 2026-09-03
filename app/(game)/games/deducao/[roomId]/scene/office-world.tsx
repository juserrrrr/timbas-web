"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react"
import { useGLTF, useTexture } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality } from "../match-types"
import { useVisionMaterial } from "./vision-material"

/// Pé-direito quase encostado na laje superior. O vão restante é estrutural,
/// não um buraco por onde se enxerga o mapa inteiro.
const WALL_HEIGHT = 4.02
export const FLOOR_HEIGHT = 4.2
const STAIR_RUN = 6
const STAIR_WIDTH = 2.8
const STAIR_STEPS = 18
const TRIM_HEIGHT = 0.16
const BASEBOARD_HEIGHT = 0.22

/// Espessura estrutural das lajes. No piso superior ela é recortada nos vãos
/// das escadas para os dois andares formarem um prédio contínuo.
const SLAB_SALA = 0.6
const SLAB_CORREDOR = 0.36
const PLINTH_OVERHANG = 0.5

type Box = [
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  tone?: string,
  rotation?: [number, number, number],
]

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
    color: "#d9c3a5",
    boxes: [
      [1.78, 0.075, 0.88, 0, 0.76, 0, "#d7b98e"],
      [0.07, 0.72, 0.7, -0.78, 0.37, 0, "#3f4b5b"],
      [0.07, 0.72, 0.7, 0.78, 0.37, 0, "#3f4b5b"],
      [1.52, 0.08, 0.08, 0, 0.19, -0.34, "#566375"],
    ],
  },
  chair: {
    color: "#31435e",
    boxes: [
      [0.54, 0.11, 0.52, 0, 0.5, 0.02, "#334a6b"],
      [0.5, 0.6, 0.1, 0, 0.83, -0.22, "#2c4261", [-0.09, 0, 0]],
      [0.1, 0.4, 0.1, 0, 0.27, 0, "#77859a"],
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
    boxes: [],
  },
  sofa: {
    color: "#243b5a",
    boxes: [
      [1.92, 0.36, 0.82, 0, 0.3, 0, "#263f60"],
      [1.88, 0.58, 0.2, 0, 0.72, -0.34, "#203754", [-0.1, 0, 0]],
      [0.22, 0.62, 0.86, -0.92, 0.55, 0, "#2c496d"],
      [0.22, 0.62, 0.86, 0.92, 0.55, 0, "#2c496d"],
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
    color: "#b98856",
    boxes: [
      [6.6, 0.14, 2.45, 0, 0.76, 0, "#b88755"],
      [0.22, 0.7, 1.75, -2.35, 0.38, 0, "#3e4857"],
      [0.22, 0.7, 1.75, 2.35, 0.38, 0, "#3e4857"],
      [4.7, 0.1, 0.12, 0, 0.3, 0, "#556274"],
    ],
  },
  cafeTable: {
    color: "#d5b98f",
    boxes: [
      [1.35, 0.1, 1.35, 0, 0.74, 0, "#d5b98f"],
      [0.14, 0.68, 0.14, 0, 0.36, 0, "#4a5565"],
      [0.78, 0.07, 0.78, 0, 0.06, 0, "#4a5565"],
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
    ],
  },
  cone: {
    color: "#f2703c",
    boxes: [[0.4, 0.06, 0.4, 0, 0.03, 0, "#3a4049"]],
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
  kitchen: {
    color: "#d9dee6",
    boxes: [
      [4.2, 0.82, 0.68, 0, 0.41, 0, "#d7dce4"],
      [4.34, 0.08, 0.78, 0, 0.86, 0.02, "#8896a7"],
      [4.2, 0.58, 0.08, 0, 1.2, -0.32, "#b8c2cd"],
      [1.15, 0.72, 0.38, -1.32, 1.85, -0.14, "#e5e8ed"],
      [1.15, 0.72, 0.38, 1.32, 1.85, -0.14, "#e5e8ed"],
    ],
  },
  tree: {
    color: "#4f8d50",
    boxes: [],
  },
  streetLamp: {
    color: "#4b5563",
    emissive: "#ffd98c",
    emissiveIntensity: 0.65,
    boxes: [],
  },
  bench: {
    color: "#8b6548",
    boxes: [
      [1.9, 0.14, 0.55, 0, 0.52, 0, "#a97650"],
      [1.9, 0.5, 0.12, 0, 0.86, -0.24, "#916243", [-0.12, 0, 0]],
      [0.12, 0.52, 0.12, -0.7, 0.26, 0, "#384454"],
      [0.12, 0.52, 0.12, 0.7, 0.26, 0, "#384454"],
    ],
  },
}

/// O duto no chão: aro de metal, poço escuro e quatro palhetas por cima. Era um
/// quadrado chapado, que não lia nem como buraco nem como grelha.
const VENT_SPEC: PropSpec = {
  color: "#8f9cb0",
  boxes: [
    [1.5, 0.12, 1.5, 0, 0.06, 0, "#94a2b6"],
    [1.24, 0.1, 1.24, 0, 0.14, 0, "#0d1219"],
    [1.16, 0.07, 0.16, 0, 0.2, -0.39, "#b6c2d3"],
    [1.16, 0.07, 0.16, 0, 0.2, -0.13, "#b6c2d3"],
    [1.16, 0.07, 0.16, 0, 0.2, 0.13, "#b6c2d3"],
    [1.16, 0.07, 0.16, 0, 0.2, 0.39, "#b6c2d3"],
  ],
}

/// Pinta a caixa inteira de uma cor só, por vértice. É o que deixa um móvel
/// com várias cores caber num material só e continuar valendo um desenho.
function paint(geometry: THREE.BufferGeometry, hex: string) {
  const tone = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  tone.getHSL(hsl)
  // Dedução precisa de silhuetas limpas e cores vivas mesmo nas peças escuras.
  // Levantar só a luminosidade preserva a identidade de cada objeto e o contraste.
  tone.setHSL(hsl.h, Math.min(1, hsl.s * 1.04), Math.min(0.92, hsl.l + (1 - hsl.l) * 0.1))
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

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function geometryFor(kind: string, spec: PropSpec): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []

  const add = (
    source: THREE.BufferGeometry,
    tone: string,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    let geometry = source
    if (geometry.index) {
      const flat = geometry.toNonIndexed()
      geometry.dispose()
      geometry = flat
    }
    geometry.scale(...scale)
    geometry.rotateX(rotation[0])
    geometry.rotateY(rotation[1])
    geometry.rotateZ(rotation[2])
    geometry.translate(...position)
    paint(geometry, tone)
    parts.push(geometry)
  }

  const box = (
    size: [number, number, number],
    position: [number, number, number],
    tone: string,
    rotation: [number, number, number] = [0, 0, 0],
    radius = 0.035,
  ) => add(new RoundedBoxGeometry(...size, 4, radius), tone, position, rotation)

  const cylinder = (
    top: number,
    bottom: number,
    height: number,
    position: [number, number, number],
    tone: string,
    rotation: [number, number, number] = [0, 0, 0],
    segments = 12,
  ) => add(new THREE.CylinderGeometry(top, bottom, height, segments), tone, position, rotation)

  const sphere = (
    radius: number,
    position: [number, number, number],
    scale: [number, number, number],
    tone: string,
    rotation: [number, number, number] = [0, 0, 0],
  ) => add(new THREE.SphereGeometry(radius, 12, 9), tone, position, rotation, scale)

  const torus = (
    radius: number,
    tube: number,
    position: [number, number, number],
    tone: string,
    rotation: [number, number, number] = [Math.PI / 2, 0, 0],
  ) => add(new THREE.TorusGeometry(radius, tube, 8, 18), tone, position, rotation)

  for (const [w, h, d, x, y, z, tone, rotation] of spec.boxes) {
    box([w, h, d], [x, y, z], tone ?? spec.color, rotation)
  }

  if (kind === "desk") {
    box([0.42, 0.58, 0.62], [-0.52, 0.36, 0.02], "#cbd4e1", [0, 0, 0], 0.045)
    for (let index = 0; index < 3; index += 1) {
      box([0.34, 0.12, 0.025], [-0.52, 0.2 + index * 0.17, 0.342], "#eef2f7", [0, 0, 0], 0.018)
      cylinder(0.018, 0.018, 0.1, [-0.52, 0.2 + index * 0.17, 0.365], "#667085", [Math.PI / 2, 0, 0], 8)
    }
    box([0.76, 0.018, 0.34], [0.2, 0.795, 0.12], "#65758e", [0, 0, 0], 0.012)
    cylinder(0.07, 0.07, 0.025, [0.52, 0.795, -0.18], "#344054", [0, 0, 0], 16)
  } else if (kind === "chair") {
    cylinder(0.07, 0.07, 0.35, [0, 0.23, 0], "#96a2b4", [0, 0, 0], 12)
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2
      box([0.42, 0.045, 0.065], [Math.cos(angle) * 0.18, 0.08, Math.sin(angle) * 0.18], "#707d91", [0, -angle, 0], 0.02)
      sphere(0.055, [Math.cos(angle) * 0.39, 0.06, Math.sin(angle) * 0.39], [1, 0.72, 1], "#273142")
    }
    box([0.36, 0.16, 0.075], [0, 1.07, -0.2], "#3c567b", [-0.09, 0, 0], 0.065)
    ;[-0.31, 0.31].forEach((x) => {
      box([0.045, 0.32, 0.045], [x, 0.66, 0], "#6f7d90", [0, 0, 0], 0.015)
      box([0.22, 0.045, 0.055], [x, 0.82, 0.04], "#46566d", [0, 0, 0], 0.02)
    })
  } else if (kind === "monitor") {
    box([0.53, 0.29, 0.018], [0, 1.06, 0.036], "#62b8ff", [0, 0, 0], 0.012)
    sphere(0.018, [0, 1.235, 0.055], [1, 1, 0.55], "#b8e5ff")
    box([0.62, 0.025, 0.22], [0, 0.795, 0.27], "#d4dbe5", [-0.12, 0, 0], 0.018)
    for (let index = 0; index < 8; index += 1) {
      box([0.052, 0.012, 0.045], [-0.205 + index * 0.058, 0.814, 0.27], "#64748b", [-0.12, 0, 0], 0.006)
    }
    sphere(0.055, [0.42, 0.82, 0.28], [0.75, 0.35, 1], "#64748b")
  } else if (kind === "plant") {
    cylinder(0.22, 0.17, 0.34, [0, 0.17, 0], "#c98461", [0, 0, 0], 16)
    torus(0.205, 0.035, [0, 0.34, 0], "#e2a17d")
    cylinder(0.035, 0.05, 0.72, [0, 0.65, 0], "#5f7651", [0, 0, 0], 10)
    const leaves: Array<[number, number, number, number, number]> = [
      [-0.18, 0.63, 0.02, -0.65, -0.25],
      [0.2, 0.7, 0.04, 0.7, 0.2],
      [-0.13, 0.86, -0.08, -0.42, 0.35],
      [0.16, 0.94, 0.08, 0.48, -0.28],
      [0.03, 1.1, 0.01, 0.08, 0.1],
      [-0.06, 0.76, 0.2, -0.18, -0.72],
      [0.07, 0.83, -0.2, 0.28, 0.72],
    ]
    leaves.forEach(([x, y, z, rz, ry], index) =>
      sphere(0.22, [x, y, z], [0.48, 1.35, 0.28], index % 2 ? "#62bd7b" : "#3f9b61", [0, ry, rz]),
    )
  } else if (kind === "sofa") {
    box([0.82, 0.16, 0.68], [-0.44, 0.5, 0.1], "#36577e", [0, 0, 0], 0.075)
    box([0.82, 0.16, 0.68], [0.44, 0.5, 0.1], "#304f75", [0, 0, 0], 0.075)
    box([0.82, 0.45, 0.13], [-0.44, 0.8, -0.26], "#2d4a6e", [-0.14, 0, 0], 0.075)
    box([0.82, 0.45, 0.13], [0.44, 0.8, -0.26], "#294565", [-0.14, 0, 0], 0.075)
    ;[-0.76, 0.76].forEach((x) => box([0.1, 0.18, 0.1], [x, 0.09, 0], "#293545", [0, 0, 0], 0.028))
    box([0.4, 0.34, 0.11], [-0.42, 0.76, -0.16], "#b77d58", [0, 0.1, -0.08], 0.07)
  } else if (kind === "counter") {
    for (let index = 0; index < 11; index += 1) {
      box([0.055, 0.78, 0.035], [-1.9 + index * 0.38, 0.53, 0.475], index % 2 ? "#c5a783" : "#b9956e", [0, 0, 0], 0.016)
    }
    box([0.65, 0.34, 0.025], [0, 0.58, 0.51], "#2d6f8e", [0, 0, 0], 0.025)
    box([0.45, 0.045, 0.16], [0, 1.15, 0], "#63738b", [0, 0, 0], 0.018)
  } else if (kind === "meetingTable") {
    for (const x of [-1.65, 0, 1.65]) {
      cylinder(0.1, 0.1, 0.035, [x, 0.84, 0], "#253142", [0, 0, 0], 20)
      torus(0.145, 0.018, [x, 0.845, 0], "#8290a3")
      box([0.48, 0.032, 0.14], [x, 0.835, -0.38], "#263346", [0, 0, 0], 0.02)
    }
    box([2.2, 0.022, 0.24], [0, 0.84, 0.78], "#c6a171", [0, 0, 0], 0.025)
  } else if (kind === "cafeTable") {
    cylinder(0.16, 0.16, 0.025, [0.25, 0.81, -0.2], "#f2eee8", [0, 0, 0], 20)
    torus(0.12, 0.018, [0.37, 0.85, -0.2], "#f2eee8", [0, Math.PI / 2, 0])
    cylinder(0.05, 0.045, 0.12, [-0.32, 0.84, 0.24], "#6e8461", [0, 0, 0], 16)
  } else if (kind === "rack") {
    for (let index = 0; index < 7; index += 1) {
      const y = 0.34 + index * 0.22
      box([0.56, 0.15, 0.035], [0, y, 0.535], index % 2 ? "#354052" : "#2a3444", [0, 0, 0], 0.012)
      sphere(0.022, [0.2, y, 0.558], [1, 1, 0.5], index % 3 ? "#53e69d" : "#65c7ff")
      sphere(0.014, [0.14, y, 0.559], [1, 1, 0.5], "#f7c65f")
    }
    box([0.68, 0.06, 0.06], [0, 1.92, 0.54], "#73839a", [0, 0, 0], 0.018)
  } else if (kind === "locker") {
    box([0.48, 1.84, 0.025], [-0.26, 1, 0.292], "#9ba8bb", [0, 0, 0], 0.022)
    box([0.48, 1.84, 0.025], [0.26, 1, 0.292], "#93a1b5", [0, 0, 0], 0.022)
    ;[-0.26, 0.26].forEach((x) => {
      box([0.025, 0.22, 0.025], [x + (x < 0 ? 0.17 : -0.17), 1.02, 0.322], "#4d5b70", [0, 0, 0], 0.01)
      for (let slot = 0; slot < 4; slot += 1) {
        box([0.2, 0.018, 0.012], [x, 1.65 - slot * 0.055, 0.315], "#65748a", [0, 0, 0], 0.005)
      }
    })
  } else if (kind === "shelf") {
    const colors = ["#7aa2f7", "#f6a35c", "#75c99b", "#c084fc", "#e7c66b"]
    for (let level = 0; level < 3; level += 1) {
      for (let item = 0; item < 5; item += 1) {
        box(
          [0.26 + (item % 2) * 0.07, 0.34 + ((item + level) % 3) * 0.07, 0.42],
          [-0.92 + item * 0.45, 0.31 + level * 0.6, 0],
          colors[(item + level) % colors.length],
          [0, 0, item === 4 ? -0.09 : 0],
          0.018,
        )
      }
    }
  } else if (kind === "coffee") {
    box([0.42, 0.22, 0.16], [0, 0.72, 0.36], "#151d28", [0, 0, 0], 0.035)
    cylinder(0.055, 0.055, 0.18, [0, 0.57, 0.38], "#9aa8b8", [Math.PI / 2, 0, 0], 12)
    cylinder(0.12, 0.1, 0.18, [0, 0.26, 0.38], "#f4f6fa", [0, 0, 0], 16)
    torus(0.09, 0.018, [0.1, 0.29, 0.38], "#f4f6fa", [0, Math.PI / 2, 0])
    sphere(0.025, [0.14, 0.82, 0.455], [1, 1, 0.4], "#70e1a5")
  } else if (kind === "crate") {
    ;[-0.46, 0, 0.46].forEach((x) => box([0.075, 0.82, 0.055], [x, 0.45, 0.49], "#aa7e49", [0, 0, 0], 0.012))
    ;[0.15, 0.45, 0.75].forEach((y) => box([0.9, 0.055, 0.055], [0, y, 0.49], "#efd0a0", [0, 0, 0], 0.012))
    box([0.06, 0.88, 0.06], [0, 0.45, 0.51], "#ba8b51", [0, 0, -0.78], 0.012)
  } else if (kind === "printer") {
    box([0.76, 0.09, 0.55], [0, 0.82, -0.02], "#dce3ec", [-0.08, 0, 0], 0.025)
    box([0.58, 0.02, 0.42], [0, 0.875, -0.03], "#273142", [-0.08, 0, 0], 0.012)
    box([0.54, 0.018, 0.42], [0, 0.2, 0.43], "#f7f8fb", [0.25, 0, 0], 0.006)
    box([0.24, 0.06, 0.12], [0.25, 0.72, 0.38], "#53647c", [0, 0, 0], 0.015)
    sphere(0.018, [0.31, 0.75, 0.445], [1, 1, 0.5], "#55d68b")
  } else if (kind === "whiteboard") {
    box([2.76, 0.065, 0.12], [0, 2.01, 0], "#93a1b5", [0, 0, 0], 0.018)
    box([0.07, 1.36, 0.12], [-1.36, 1.35, 0], "#93a1b5", [0, 0, 0], 0.018)
    box([0.07, 1.36, 0.12], [1.36, 1.35, 0], "#93a1b5", [0, 0, 0], 0.018)
    box([0.8, 0.025, 0.018], [-0.52, 1.55, 0.055], "#4d88cf", [0, 0, -0.12], 0.006)
    box([0.58, 0.025, 0.018], [0.44, 1.3, 0.055], "#e66c72", [0, 0, 0.18], 0.006)
    box([0.42, 0.025, 0.018], [-0.18, 1.04, 0.055], "#56a873", [0, 0, 0.08], 0.006)
  } else if (kind === "car") {
    for (const x of [-1.02, 1.02]) {
      for (const z of [-1.35, 1.35]) {
        cylinder(0.31, 0.31, 0.24, [x, 0.38, z], "#202733", [0, 0, Math.PI / 2], 18)
        cylinder(0.16, 0.16, 0.255, [x, 0.38, z], "#a6b3c5", [0, 0, Math.PI / 2], 14)
      }
    }
    box([1.62, 0.34, 0.06], [0, 1.18, 0.94], "#82b7d4", [-0.35, 0, 0], 0.018)
    box([1.62, 0.32, 0.06], [0, 1.18, -1.08], "#78a9c5", [0.32, 0, 0], 0.018)
    box([1.86, 0.16, 0.15], [0, 0.64, 2.12], "#a93249", [0, 0, 0], 0.04)
    ;[-0.62, 0.62].forEach((x) => {
      box([0.35, 0.16, 0.035], [x, 0.73, 2.17], "#fff1a8", [0, 0, 0], 0.018)
      box([0.32, 0.13, 0.035], [x, 0.68, -2.17], "#ff6474", [0, 0, 0], 0.018)
    })
  } else if (kind === "cone") {
    cylinder(0.045, 0.17, 0.5, [0, 0.3, 0], "#f2703c", [0, 0, 0], 18)
    torus(0.1, 0.028, [0, 0.29, 0], "#f8f1df")
  } else if (kind === "sink") {
    cylinder(0.3, 0.26, 0.08, [0, 0.94, 0.02], "#9eacbd", [0, 0, 0], 20)
    cylinder(0.035, 0.035, 0.34, [0, 1.1, -0.2], "#8291a5", [0, 0, 0], 12)
    torus(0.14, 0.035, [0, 1.24, -0.08], "#8291a5", [0, 0, 0])
    cylinder(0.028, 0.028, 0.18, [0, 1.24, 0.055], "#8291a5", [Math.PI / 2, 0, 0], 10)
    ;[-0.52, 0.52].forEach((x) => box([0.025, 0.18, 0.025], [x, 0.48, 0.27], "#6f7e92", [0, 0, 0], 0.008))
  } else if (kind === "kitchen") {
    for (let cabinet = 0; cabinet < 4; cabinet += 1) {
      const x = -1.55 + cabinet * 1.03
      box([0.9, 0.64, 0.035], [x, 0.42, 0.36], cabinet % 2 ? "#cbd2db" : "#d7dce4", [0, 0, 0], 0.025)
      cylinder(0.014, 0.014, 0.18, [x + 0.3, 0.46, 0.385], "#5d6b7c", [Math.PI / 2, 0, 0], 10)
    }
    box([1.05, 0.035, 0.46], [0.3, 0.91, 0.03], "#263342", [0, 0, 0], 0.08)
    cylinder(0.3, 0.3, 0.035, [0.3, 0.925, 0.03], "#8795a5", [0, 0, 0], 24)
    cylinder(0.035, 0.035, 0.36, [0.3, 1.08, -0.2], "#718094", [0, 0, 0], 14)
    torus(0.16, 0.035, [0.3, 1.24, -0.07], "#718094", [0, 0, 0])
    cylinder(0.025, 0.025, 0.18, [0.3, 1.24, 0.08], "#718094", [Math.PI / 2, 0, 0], 12)
    for (let tile = 0; tile < 9; tile += 1) {
      box([0.012, 0.48, 0.012], [-1.84 + tile * 0.46, 1.19, 0.374], "#8f9cab", [0, 0, 0], 0.004)
    }
    ;[-1.32, 1.32].forEach((x) => {
      box([0.055, 0.48, 0.02], [x, 1.84, 0.07], "#adb7c3", [0, 0, 0], 0.012)
      cylinder(0.013, 0.013, 0.2, [x + 0.36, 1.84, 0.075], "#5d6b7c", [Math.PI / 2, 0, 0], 10)
    })
  } else if (kind === "vending") {
    box([0.77, 1.42, 0.035], [-0.08, 1.15, 0.405], "#142133", [0, 0, 0], 0.02)
    const products = ["#ef6b73", "#f4bb55", "#58c88c", "#62aaf5"]
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        cylinder(
          0.055,
          0.055,
          0.16,
          [-0.31 + column * 0.24, 0.72 + row * 0.29, 0.44],
          products[(row + column) % products.length],
          [0, 0, 0],
          10,
        )
      }
      box([0.7, 0.018, 0.04], [-0.08, 0.6 + row * 0.29, 0.44], "#8291a5", [0, 0, 0], 0.006)
    }
    box([0.18, 0.3, 0.035], [0.41, 1.35, 0.43], "#24354c", [0, 0, 0], 0.018)
    box([0.11, 0.055, 0.02], [0.41, 1.43, 0.455], "#6de3d0", [0, 0, 0], 0.008)
    box([0.56, 0.2, 0.04], [-0.08, 0.28, 0.44], "#0e1724", [0, 0, 0], 0.02)
  } else if (kind === "tree") {
    cylinder(0.18, 0.28, 2.35, [0, 1.18, 0], "#77583d", [0, 0, 0], 12)
    sphere(0.95, [0, 2.55, 0], [1.05, 0.9, 1], "#4f9a57")
    sphere(0.7, [-0.58, 2.35, 0.08], [1, 0.88, 1], "#5bab61")
    sphere(0.72, [0.52, 2.42, -0.18], [1, 0.92, 1], "#438d4e")
    sphere(0.62, [0.08, 2.35, 0.58], [1, 0.85, 1], "#67b76a")
  } else if (kind === "streetLamp") {
    cylinder(0.075, 0.1, 3.2, [0, 1.6, 0], "#465363", [0, 0, 0], 12)
    cylinder(0.22, 0.3, 0.12, [0, 0.06, 0], "#34404f", [0, 0, 0], 12)
    box([0.62, 0.09, 0.12], [0.24, 3.08, 0], "#465363", [0, 0, -0.12], 0.035)
    sphere(0.19, [0.5, 2.98, 0], [1.2, 0.58, 1], "#ffe5a8")
  }

  const merged = mergeGeometries(parts, false)
  if (!merged) throw new Error(`Não foi possível montar o objeto 3D ${kind}`)
  parts.forEach((part) => part.dispose())
  return merged
}

const STAIR_SPEC: PropSpec = {
  color: "#9ca7b6",
  boxes: [
    ...Array.from(
      { length: STAIR_STEPS },
      (_, index) =>
        [
          STAIR_WIDTH,
          ((index + 1) * FLOOR_HEIGHT) / STAIR_STEPS,
          STAIR_RUN / STAIR_STEPS + 0.035,
          0,
          ((index + 1) * FLOOR_HEIGHT) / STAIR_STEPS / 2,
          STAIR_RUN / 2 - ((index + 0.5) * STAIR_RUN) / STAIR_STEPS,
          index % 2 ? "#9aa6b5" : "#8794a5",
        ] as Box,
    ),
    ...[0, 5, 10, 15, 17].flatMap((index) => {
      const stepTop = ((index + 1) * FLOOR_HEIGHT) / STAIR_STEPS
      const z = STAIR_RUN / 2 - ((index + 0.5) * STAIR_RUN) / STAIR_STEPS
      return [
        [0.075, 1.05, 0.075, -STAIR_WIDTH / 2, stepTop + 0.525, z, "#586576"],
        [0.075, 1.05, 0.075, STAIR_WIDTH / 2, stepTop + 0.525, z, "#586576"],
      ] as Box[]
    }),
    [
      0.085,
      0.085,
      Math.hypot(STAIR_RUN, FLOOR_HEIGHT),
      -STAIR_WIDTH / 2,
      FLOOR_HEIGHT / 2 + 1.02,
      0,
      "#c4cbd4",
      [Math.atan2(FLOOR_HEIGHT, STAIR_RUN), 0, 0],
    ],
    [
      0.085,
      0.085,
      Math.hypot(STAIR_RUN, FLOOR_HEIGHT),
      STAIR_WIDTH / 2,
      FLOOR_HEIGHT / 2 + 1.02,
      0,
      "#c4cbd4",
      [Math.atan2(FLOOR_HEIGHT, STAIR_RUN), 0, 0],
    ],
    [STAIR_WIDTH, 1.05, 0.075, 0, FLOOR_HEIGHT + 0.525, STAIR_RUN / 2, "#586576"],
  ],
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

interface RoomLightSource {
  x: number
  z: number
  color: string
  intensity: number
  distance: number
}

type FloorFinish = NonNullable<OfficeMap["rooms"][number]["finish"]>
type MapRoom = OfficeMap["rooms"][number]

function isRoofed(room: MapRoom) {
  return room.kind === "sala" || room.kind === "corredor"
}

interface FloorPatch {
  x: number
  z: number
  w: number
  d: number
  finish: FloorFinish
  tint: string
  slab: number
  offsetX: number
  offsetY: number
  rotation: number
  elevation: number
}

const FLOOR_TEXTURE_PATHS: Record<FloorFinish, string> = {
  carpet: "/images/games/deducao/textures/carpet.png",
  patternedCarpet: "/images/games/deducao/textures/lounge-carpet-v2.webp",
  wood: "/images/games/deducao/textures/wood.png",
  parquet: "/images/games/deducao/textures/executive-parquet-v2.webp",
  server: "/images/games/deducao/textures/server-floor.png",
  terrazzo: "/images/games/deducao/textures/terrazzo.png",
  vinyl: "/images/games/deducao/textures/corridor-vinyl-v2.webp",
  pantry: "/images/games/deducao/textures/pantry-tile.png",
  concrete: "/images/games/deducao/textures/concrete.png",
  grass: "/images/games/deducao/textures/grass-v1.webp",
  water: "/images/games/deducao/textures/pool-water-v1.webp",
  sport: "/images/games/deducao/textures/sport-court-v1.webp",
  asphalt: "/images/games/deducao/textures/asphalt-road-v1.webp",
}

const FLOOR_ASSET_NAMES: Record<FloorFinish, string> = {
  carpet: "carpet",
  patternedCarpet: "lounge-carpet-v2",
  wood: "wood",
  parquet: "executive-parquet-v2",
  server: "server-floor",
  terrazzo: "terrazzo",
  vinyl: "corridor-vinyl-v2",
  pantry: "pantry-tile",
  concrete: "concrete",
  grass: "grass-v1",
  water: "pool-water-v1",
  sport: "sport-court-v1",
  asphalt: "asphalt-road-v1",
}

const DETAILED_MODELS = {
  desk: "/models/games/deducao/desk.glb",
  chair: "/models/games/deducao/office-chair.glb",
  sofa: "/models/games/deducao/sofa.glb",
  meetingTable: "/models/games/deducao/meeting-table.glb",
} as const

type DetailedModelKind = keyof typeof DETAILED_MODELS

Object.values(DETAILED_MODELS).forEach((path) => useGLTF.preload(path))
Object.values(FLOOR_TEXTURE_PATHS).forEach((path) => useTexture.preload(path))
Object.values(FLOOR_ASSET_NAMES).forEach((name) => {
  useTexture.preload(`/images/games/deducao/textures/${name}-normal.webp`)
  useTexture.preload(`/images/games/deducao/textures/${name}-roughness.webp`)
})
;[
  "/images/games/deducao/textures/wall-plaster.webp",
  "/images/games/deducao/textures/wall-plaster-normal.webp",
  "/images/games/deducao/textures/wall-plaster-roughness.webp",
  "/images/games/deducao/textures/upholstery-v2.webp",
  "/images/games/deducao/textures/upholstery-v2-normal.webp",
  "/images/games/deducao/textures/upholstery-v2-roughness.webp",
  "/images/games/deducao/textures/ceiling-acoustic.webp",
  "/images/games/deducao/textures/ceiling-acoustic-normal.webp",
  "/images/games/deducao/textures/ceiling-acoustic-roughness.webp",
].forEach((path) => useTexture.preload(path))

const FLOOR_FINISHES = Object.keys(FLOOR_TEXTURE_PATHS) as FloorFinish[]

function splitAroundHoles(
  rect: { x: number; z: number; w: number; d: number },
  holes: Array<{ x: number; z: number; w: number; d: number }>,
) {
  let pieces = [rect]
  for (const hole of holes) {
    pieces = pieces.flatMap((piece) => {
      const left = Math.max(piece.x, hole.x)
      const right = Math.min(piece.x + piece.w, hole.x + hole.w)
      const top = Math.max(piece.z, hole.z)
      const bottom = Math.min(piece.z + piece.d, hole.z + hole.d)
      if (left >= right || top >= bottom) return [piece]

      return [
        { x: piece.x, z: piece.z, w: piece.w, d: top - piece.z },
        { x: piece.x, z: bottom, w: piece.w, d: piece.z + piece.d - bottom },
        { x: piece.x, z: top, w: left - piece.x, d: bottom - top },
        { x: right, z: top, w: piece.x + piece.w - right, d: bottom - top },
      ].filter((part) => part.w > 0.04 && part.d > 0.04)
    })
  }
  return pieces
}

function stairHole(stair: OfficeMap["stairs"][number]) {
  const vertical = Math.abs(stair.targetZ - stair.z) >= Math.abs(stair.targetX - stair.x)
  const side = STAIR_WIDTH / 2 + 0.28
  const end = 0.38
  return {
    x: Math.min(stair.x, stair.targetX) - (vertical ? side : end),
    z: Math.min(stair.z, stair.targetZ) - (vertical ? end : side),
    w: Math.abs(stair.targetX - stair.x) + (vertical ? side * 2 : end * 2),
    d: Math.abs(stair.targetZ - stair.z) + (vertical ? end * 2 : side * 2),
  }
}

function TexturedFloor({
  patch,
  source,
  normalSource,
  roughnessSource,
  quality,
  blackout,
}: {
  patch: FloorPatch
  source: THREE.Texture
  normalSource: THREE.Texture
  roughnessSource: THREE.Texture
  quality: Quality
  blackout: boolean
}) {
  const gl = useThree((state) => state.gl)
  const textures = useMemo(() => {
    const clone = source.clone()
    const normal = normalSource.clone()
    const roughness = roughnessSource.clone()
    clone.colorSpace = THREE.SRGBColorSpace
    const tile =
      patch.finish === "wood"
        ? 4.2
        : patch.finish === "parquet"
          ? 3.7
          : patch.finish === "patternedCarpet"
            ? 5.2
            : patch.finish === "vinyl"
              ? 3.5
              : patch.finish === "server"
                ? 3.2
                : patch.finish === "grass"
                  ? 3.6
                  : patch.finish === "water"
                    ? 5.5
                    : patch.finish === "sport"
                      ? 8
                      : 2.8
    for (const texture of [clone, normal, roughness]) {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(patch.w / tile, patch.d / tile)
      texture.center.set(0.5, 0.5)
      texture.offset.set(patch.offsetX, patch.offsetY)
      texture.rotation = patch.rotation
      texture.anisotropy = quality === "alto" ? gl.capabilities.getMaxAnisotropy() : quality === "medio" ? 8 : 2
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.needsUpdate = true
    }
    return { color: clone, normal, roughness }
  }, [
    gl,
    normalSource,
    patch.d,
    patch.finish,
    patch.offsetX,
    patch.offsetY,
    patch.rotation,
    patch.w,
    quality,
    roughnessSource,
    source,
  ])

  useEffect(
    () => () => {
      textures.color.dispose()
      textures.normal.dispose()
      textures.roughness.dispose()
    },
    [textures],
  )

  return (
    <mesh
      position={[patch.x + patch.w / 2, patch.elevation, patch.z + patch.d / 2]}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      <planeGeometry args={[patch.w, patch.d]} />
      <meshStandardMaterial
        map={textures.color}
        normalMap={textures.normal}
        normalScale={new THREE.Vector2(patch.finish === "water" ? 0.08 : patch.finish === "grass" ? 0.5 : 0.38, patch.finish === "water" ? 0.08 : patch.finish === "grass" ? 0.5 : 0.38)}
        roughnessMap={textures.roughness}
        color={patch.tint}
        emissive="#dbe7f1"
        emissiveIntensity={blackout ? 0 : 0.01}
        roughness={
          patch.finish === "water"
            ? 0.22
            : patch.finish === "wood" || patch.finish === "parquet"
              ? 0.68
              : patch.finish === "server"
                ? 0.58
                : 0.9
        }
        metalness={patch.finish === "water" ? 0.08 : patch.finish === "server" ? 0.16 : 0.01}
      />
    </mesh>
  )
}

function TexturedFloors({ patches, quality, blackout }: { patches: FloorPatch[]; quality: Quality; blackout: boolean }) {
  const loaded = useTexture(FLOOR_FINISHES.map((finish) => FLOOR_TEXTURE_PATHS[finish]))
  const normals = useTexture(
    FLOOR_FINISHES.map((finish) => `/images/games/deducao/textures/${FLOOR_ASSET_NAMES[finish]}-normal.webp`),
  )
  const roughness = useTexture(
    FLOOR_FINISHES.map((finish) => `/images/games/deducao/textures/${FLOOR_ASSET_NAMES[finish]}-roughness.webp`),
  )
  const textures = Object.fromEntries(FLOOR_FINISHES.map((finish, index) => [finish, loaded[index]])) as Record<
    FloorFinish,
    THREE.Texture
  >
  const normalMaps = Object.fromEntries(FLOOR_FINISHES.map((finish, index) => [finish, normals[index]])) as Record<
    FloorFinish,
    THREE.Texture
  >
  const roughnessMaps = Object.fromEntries(
    FLOOR_FINISHES.map((finish, index) => [finish, roughness[index]]),
  ) as Record<FloorFinish, THREE.Texture>

  return (
    <>
      {patches.map((patch, index) => (
        <TexturedFloor
          key={`${patch.finish}-${patch.x}-${patch.z}-${index}`}
          patch={patch}
          source={textures[patch.finish]}
          normalSource={normalMaps[patch.finish]}
          roughnessSource={roughnessMaps[patch.finish]}
          quality={quality}
          blackout={blackout}
        />
      ))}
    </>
  )
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

function LocalRoomLights({
  lights,
  height,
  blackout,
  focusRef,
}: {
  lights: RoomLightSource[]
  height: number
  blackout: boolean
  focusRef: MutableRefObject<THREE.Vector2>
}) {
  const refs = useRef<Array<THREE.SpotLight | null>>([])
  const nextSearch = useRef(0)
  const selected = useRef<RoomLightSource[]>([])
  const targets = useMemo(() => Array.from({ length: 4 }, () => new THREE.Object3D()), [])

  useFrame(({ clock }, delta) => {
    if (clock.elapsedTime >= nextSearch.current) {
      nextSearch.current = clock.elapsedTime + 0.2
      selected.current = [...lights]
        .sort(
          (left, right) =>
            (left.x - focusRef.current.x) ** 2 + (left.z - focusRef.current.y) ** 2 -
            ((right.x - focusRef.current.x) ** 2 + (right.z - focusRef.current.y) ** 2),
        )
        .slice(0, targets.length)
    }

    refs.current.forEach((light, index) => {
      if (!light) return
      const source = selected.current[index]
      light.visible = Boolean(source)
      if (!source) return
      light.position.set(source.x, height, source.z)
      light.color.set(source.color)
      light.distance = source.distance
      light.intensity += ((blackout ? 0 : source.intensity) - light.intensity) * Math.min(1, delta * 8)
      targets[index].position.set(source.x, 0.04, source.z)
      light.target = targets[index]
    })
  })

  return (
    <>
      {targets.map((target, index) => <primitive key={`light-target-${index}`} object={target} />)}
      {targets.map((target, index) => (
        <spotLight
          key={`local-light-${index}`}
          ref={(light) => { refs.current[index] = light }}
          target={target}
          intensity={0}
          angle={0.72}
          penumbra={0.82}
          decay={2}
        />
      ))}
    </>
  )
}

export function OfficeWorld({
  map,
  quality,
  blackout,
  level,
  baseY = 0,
  active = true,
  focusRef,
}: {
  map: OfficeMap
  quality: Quality
  blackout: boolean
  level: number
  baseY?: number
  active?: boolean
  focusRef: MutableRefObject<THREE.Vector2>
}) {
  const wallHeight = WALL_HEIGHT
  const [
    wallSource,
    wallNormalSource,
    wallRoughnessSource,
    upholsterySource,
    upholsteryNormalSource,
    upholsteryRoughnessSource,
    ceilingSource,
    ceilingNormalSource,
    ceilingRoughnessSource,
  ] = useTexture([
    "/images/games/deducao/textures/wall-plaster.webp",
    "/images/games/deducao/textures/wall-plaster-normal.webp",
    "/images/games/deducao/textures/wall-plaster-roughness.webp",
    "/images/games/deducao/textures/upholstery-v2.webp",
    "/images/games/deducao/textures/upholstery-v2-normal.webp",
    "/images/games/deducao/textures/upholstery-v2-roughness.webp",
    "/images/games/deducao/textures/ceiling-acoustic.webp",
    "/images/games/deducao/textures/ceiling-acoustic-normal.webp",
    "/images/games/deducao/textures/ceiling-acoustic-roughness.webp",
  ])
  const materialTextures = useMemo(() => {
    const prepare = (source: THREE.Texture, repeatX: number, repeatY: number, color = false) => {
      const texture = source.clone()
      if (color) texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(repeatX, repeatY)
      texture.anisotropy = quality === "alto" ? 16 : quality === "medio" ? 8 : 2
      texture.needsUpdate = true
      return texture
    }

    return {
      wall: prepare(wallSource, 3, 2, true),
      wallNormal: prepare(wallNormalSource, 3, 2),
      wallRoughness: prepare(wallRoughnessSource, 3, 2),
      upholstery: prepare(upholsterySource, 2.5, 2.5, true),
      upholsteryNormal: prepare(upholsteryNormalSource, 2.5, 2.5),
      upholsteryRoughness: prepare(upholsteryRoughnessSource, 2.5, 2.5),
      ceiling: prepare(ceilingSource, 7, 5, true),
      ceilingNormal: prepare(ceilingNormalSource, 7, 5),
      ceilingRoughness: prepare(ceilingRoughnessSource, 7, 5),
    }
  }, [
    ceilingNormalSource,
    ceilingRoughnessSource,
    ceilingSource,
    quality,
    upholsteryNormalSource,
    upholsteryRoughnessSource,
    upholsterySource,
    wallNormalSource,
    wallRoughnessSource,
    wallSource,
  ])
  useEffect(
    () => () => {
      Object.values(materialTextures).forEach((texture) => texture.dispose())
    },
    [materialTextures],
  )
  const groundMaterial = useVisionMaterial({
    color: "#637491",
    roughness: 0.98,
    surface: "piso",
  })
  const plinthMaterial = useVisionMaterial({
    color: "#75839a",
    roughness: 0.95,
    vertexColors: true,
  })
  const rugMaterial = useVisionMaterial({
    color: "#ffffff",
    roughness: 0.99,
    surface: "piso",
  })
  const wallMaterial = useVisionMaterial({
    color: "#d8dde3",
    map: materialTextures.wall,
    normalMap: materialTextures.wallNormal,
    normalScale: 0.24,
    roughnessMap: materialTextures.wallRoughness,
    roughness: 1,
    vertexColors: true,
    surface: "parede",
  })
  const baseboardMaterial = useVisionMaterial({
    color: "#435268",
    roughness: 0.62,
    metalness: 0.08,
  })
  const trimMaterial = useVisionMaterial({ color: "#ffffff", unlit: true })
  const frameMaterial = useVisionMaterial({
    color: "#5f6f84",
    roughness: 0.4,
    metalness: 0.28,
  })
  const roofMaterial = useVisionMaterial({
    color: "#ffffff",
    roughness: 0.82,
    vertexColors: true,
  })
  const windowMaterial = useVisionMaterial({
    color: "#99d9f5",
    emissive: "#397da3",
    emissiveIntensity: blackout ? 0.015 : 0.2,
    roughness: 0.18,
    metalness: 0.16,
  })
  const fixtureFrameMaterial = useVisionMaterial({
    color: "#c6d0dc",
    roughness: 0.3,
    metalness: 0.62,
  })
  const ventMaterial = useVisionMaterial({
    color: "#ffffff",
    roughness: 0.5,
    metalness: 0.4,
    vertexColors: true,
  })
  const ceilingMaterial = useVisionMaterial({
    color: "#eef1f2",
    emissive: "#fff0cf",
    emissiveIntensity: blackout ? 0.01 : 0.14,
    roughness: 0.3,
  })
  const ceilingSlabMaterial = useVisionMaterial({
    color: "#f5f2e9",
    map: materialTextures.ceiling,
    normalMap: materialTextures.ceilingNormal,
    normalScale: 0.3,
    roughnessMap: materialTextures.ceilingRoughness,
    roughness: 1,
    surface: "piso",
  })
  const serverAisleMaterial = useVisionMaterial({
    color: "#4d6983",
    emissive: "#246a82",
    emissiveIntensity: blackout ? 0.02 : 0.28,
    roughness: 0.72,
    surface: "piso",
  })
  const serverLineMaterial = useVisionMaterial({
    color: "#67e8f9",
    emissive: "#22d3ee",
    emissiveIntensity: blackout ? 0.04 : 0.8,
    roughness: 0.35,
  })

  const ground = useMemo(
    () =>
      level === 0
        ? [
            {
              x: map.bounds.x + map.bounds.w / 2,
              y: -0.72,
              z: map.bounds.z + map.bounds.d / 2,
              rot: 0,
              sx: map.bounds.w + 5,
              sy: 0.22,
              sz: map.bounds.d + 5,
            },
          ]
        : [],
    [level, map.bounds],
  )

  const ascendingStairs = useMemo(
    () => (map.stairs ?? []).filter((stair) => stair.level === level && stair.targetLevel > stair.level),
    [level, map.stairs],
  )
  const ceilingHoles = useMemo(() => ascendingStairs.map(stairHole), [ascendingStairs])

  const ceilingFixtures = useMemo(
    () =>
      map.rooms
        .filter((room) => (room.level ?? 0) === level && isRoofed(room))
        .flatMap((room) => {
          const columns = Math.max(1, Math.floor((room.rect.w - 3) / 6))
          const rows = Math.max(1, Math.floor((room.rect.d - 3) / 7))
          const fixtures: Placement[] = []
          for (let column = 0; column < columns; column += 1) {
            for (let row = 0; row < rows; row += 1) {
              fixtures.push({
                x: room.rect.x + ((column + 1) * room.rect.w) / (columns + 1),
                y: wallHeight - 0.08,
                z: room.rect.z + ((row + 1) * room.rect.d) / (rows + 1),
                rot: column % 2 ? Math.PI / 2 : 0,
              })
            }
          }
          return fixtures.filter(
            (fixture) =>
              !ceilingHoles.some(
                (hole) =>
                  fixture.x >= hole.x &&
                  fixture.x <= hole.x + hole.w &&
                  fixture.z >= hole.z &&
                  fixture.z <= hole.z + hole.d,
              ),
          )
        }),
    [ceilingHoles, map.rooms, wallHeight, level],
  )
  const fixtureFrames = useMemo(
    () =>
      ceilingFixtures.map((fixture) => ({
        ...fixture,
        y: (fixture.y ?? 0) + 0.018,
        sx: 1.12,
        sy: 1.45,
        sz: 1.2,
      })),
    [ceilingFixtures],
  )

  const floorHoles = useMemo(
    () =>
      (map.stairs ?? [])
        .filter((stair) => stair.targetLevel === level && stair.targetLevel > stair.level)
        .map(stairHole),
    [level, map.stairs],
  )
  const floorPatches = useMemo<FloorPatch[]>(
    () =>
      map.rooms
        .filter((room) => (room.level ?? 0) === level)
        .flatMap((room) => {
          const finish = room.finish ?? "terrazzo"
          const variant = stableHash(room.id)
          const roadSurface = room.kind === "externa" && finish === "asphalt"
          const baseTint =
            roadSurface
              ? "#76787b"
              : finish === "grass"
              ? "#b8dda2"
              : finish === "water"
                ? "#b7f3ff"
                : finish === "sport"
                  ? "#d8eef1"
                  : finish === "wood" || finish === "parquet"
              ? "#fff1dd"
              : finish === "pantry"
                ? "#e5fff4"
                : finish === "server"
                  ? "#e5f3ff"
                  : finish === "patternedCarpet"
                    ? "#e9fffb"
                    : finish === "vinyl"
                      ? "#edf5fa"
                      : "#f1f3f5"
          return splitAroundHoles(room.rect, floorHoles).map((part) => ({
            ...part,
            finish,
            tint: mix(baseTint, room.floor, roadSurface ? 0.42 : finish === "concrete" ? 0.34 : 0.12),
            slab: room.kind === "corredor" || !isRoofed(room) ? SLAB_CORREDOR : SLAB_SALA,
            offsetX: (variant % 11) / 11,
            offsetY: (Math.floor(variant / 11) % 11) / 11,
            rotation: ["carpet", "patternedCarpet", "terrazzo", "vinyl"].includes(finish)
              ? (variant % 4) * (Math.PI / 2)
              : 0,
            elevation:
              room.kind === "agua"
                ? 0.052
                : room.kind === "campo"
                  ? 0.042
                  : room.kind === "externa"
                    ? 0.018
                    : 0.032,
          }))
        }),
    [floorHoles, level, map.rooms],
  )
  const ceilings = useMemo(
    () =>
      map.rooms
        .filter((room) => (room.level ?? 0) === level && isRoofed(room))
        .flatMap((room) =>
          splitAroundHoles(room.rect, ceilingHoles).map((part) => ({
            x: part.x + part.w / 2,
            y: wallHeight + 0.06,
            z: part.z + part.d / 2,
            rot: 0,
            sx: part.w,
            sy: 0.12,
            sz: part.d,
          })),
        ),
    [ceilingHoles, map.rooms, wallHeight, level],
  )

  const roomLights = useMemo<RoomLightSource[]>(() => {
    if (quality === "baixo") return []

    return map.rooms
      .filter((room) => (room.level ?? 0) === level && isRoofed(room))
      .flatMap((room) => {
        const area = room.rect.w * room.rect.d
        const amount = quality === "alto" ? (area >= 430 ? 3 : area >= 220 ? 2 : 1) : 1
        const roomTone = new THREE.Color("#fff8e9").lerp(new THREE.Color(room.light), 0.2)
        const fixtures = ceilingFixtures.filter(
          (fixture) =>
            fixture.x > room.rect.x &&
            fixture.x < room.rect.x + room.rect.w &&
            fixture.z > room.rect.z &&
            fixture.z < room.rect.z + room.rect.d,
        )
        if (fixtures.length === 0) return []

        return Array.from({ length: Math.min(amount, fixtures.length) }, (_, index) => {
          const fixtureIndex = Math.round(((index + 1) * (fixtures.length + 1)) / (Math.min(amount, fixtures.length) + 1) - 1)
          const fixture = fixtures[THREE.MathUtils.clamp(fixtureIndex, 0, fixtures.length - 1)]
          return {
            x: fixture.x,
            z: fixture.z,
            color: `#${roomTone.getHexString()}`,
            intensity: room.kind === "corredor" ? 9 : 8,
            distance: 8.5,
          }
        })
      })
  }, [ceilingFixtures, map.rooms, quality, level])

  const serverAisles = useMemo(
    () =>
      map.rooms
        .filter((room) => (room.level ?? 0) === level && (room.id === "servidores" || room.id === "operacoes"))
        .map((room) => ({
          x: room.rect.x + room.rect.w / 2,
          y: 0.026,
          z: room.rect.z + room.rect.d / 2,
          rot: 0,
          sx: room.rect.w - 3,
          sy: 1,
          sz: 2.4,
        })),
    [map.rooms, level],
  )

  const serverLines = useMemo(
    () =>
      serverAisles.flatMap((aisle) =>
        [-0.88, 0.88].map((offset) => ({
          x: aisle.x,
          y: 0.036,
          z: aisle.z + offset,
          rot: 0,
          sx: aisle.sx,
          sy: 1,
          sz: 0.055,
        })),
      ),
    [serverAisles],
  )

  // O apagão não tem como apagar um material sem luz, então ele apaga a cor do
  // friso na mão. É a única coisa da cena que continua acesa no escuro.
  useEffect(() => {
    const target = blackout ? 0.14 : 1
    ;(trimMaterial as THREE.MeshBasicMaterial).color.setScalar(target)
  }, [trimMaterial, blackout])

  // A base escura fica por baixo do piso texturizado. No andar superior ela
  // também respeita o vão da escada, então nenhum degrau atravessa a laje.
  const plinths = useMemo(
    () =>
      floorPatches.map((patch) => ({
        x: patch.x + patch.w / 2,
        y: level === 0 ? -0.18 : -0.04,
        z: patch.z + patch.d / 2,
        rot: 0,
        sx: patch.w + (level === 0 ? PLINTH_OVERHANG * 2 : 0),
        sy: level === 0 ? patch.slab + 0.75 : 0.22,
        sz: patch.d + (level === 0 ? PLINTH_OVERHANG * 2 : 0),
      })),
    [floorPatches, level],
  )

  // Um tapete no meio das salas grandes. Sem ele o miolo do cômodo é um vazio
  // de cor única do tamanho de uma quadra.
  const rugs = useMemo(
    () =>
      map.rooms
        .filter((room) => (room.level ?? 0) === level && room.kind === "sala" && room.rect.w >= 11 && room.rect.d >= 11)
        .map((room) => ({
          x: room.rect.x + room.rect.w / 2,
          y: 0.012,
          z: room.rect.z + room.rect.d / 2,
          rot: 0,
          sx: room.rect.w - 5,
          sy: 1,
          sz: room.rect.d - 5,
          color: mix(mix(room.floor, "#e9eff6", 0.48), room.light, 0.16),
        })),
    [map.rooms, level],
  )

  const generatedOutdoor = map.source?.label?.includes("cartográficos") ?? false
  const { roofCaps, facadeWindows, entranceAwnings } = useMemo(() => {
    if (!generatedOutdoor) return { roofCaps: [], facadeWindows: [], entranceAwnings: [] }
    const roofColors = ["#7d6657", "#65717d", "#876f62", "#596d70", "#7f7463"]
    const roofCaps: Placement[] = []
    const facadeWindows: Placement[] = []
    const entranceAwnings: Placement[] = []

    for (const room of map.rooms.filter(
      (candidate) =>
        (candidate.level ?? 0) === level &&
        candidate.kind === "sala" &&
        candidate.rect.w >= 3.8 &&
        candidate.rect.d >= 3.4,
    )) {
      const variant = stableHash(room.id)
      roofCaps.push({
        x: room.rect.x + room.rect.w / 2,
        y: wallHeight + 0.12,
        z: room.rect.z + room.rect.d / 2,
        rot: 0,
        sx: room.rect.w + 0.34,
        sy: 0.24 + (variant % 3) * 0.05,
        sz: room.rect.d + 0.34,
        color: roofColors[variant % roofColors.length],
      })

      const horizontalWindows = Math.max(1, Math.min(5, Math.floor((room.rect.w - 1.2) / 2.8)))
      const verticalWindows = Math.max(1, Math.min(4, Math.floor((room.rect.d - 1.2) / 2.8)))
      for (let index = 0; index < horizontalWindows; index += 1) {
        const x = room.rect.x + ((index + 1) * room.rect.w) / (horizontalWindows + 1)
        facadeWindows.push(
          { x, y: 1.72, z: room.rect.z - 0.215, rot: 0, sx: 1.18, sy: 1.08, sz: 0.055 },
          { x, y: 1.72, z: room.rect.z + room.rect.d + 0.215, rot: 0, sx: 1.18, sy: 1.08, sz: 0.055 },
        )
      }
      for (let index = 0; index < verticalWindows; index += 1) {
        const z = room.rect.z + ((index + 1) * room.rect.d) / (verticalWindows + 1)
        facadeWindows.push(
          { x: room.rect.x - 0.215, y: 1.72, z, rot: 0, sx: 0.055, sy: 1.08, sz: 1.18 },
          { x: room.rect.x + room.rect.w + 0.215, y: 1.72, z, rot: 0, sx: 0.055, sy: 1.08, sz: 1.18 },
        )
      }
      for (const door of room.doors ?? []) {
        if (door.side !== "south") continue
        entranceAwnings.push({
          x: room.rect.x + door.at + door.width / 2,
          y: 2.78,
          z: room.rect.z + room.rect.d + 0.42,
          rot: 0,
          sx: door.width + 0.55,
          sy: 0.12,
          sz: 0.92,
          color: roofColors[(variant + 2) % roofColors.length],
        })
      }
    }
    return {
      roofCaps: roofCaps.slice(0, 48),
      facadeWindows: facadeWindows.slice(0, 240),
      entranceAwnings: entranceAwnings.slice(0, 48),
    }
  }, [generatedOutdoor, level, map.rooms, wallHeight])

  const walls = useMemo(
    () =>
      map.walls
        .filter((wall) => (wall.level ?? 0) === level)
        .map((wall) => ({
          x: (wall.minX + wall.maxX) / 2,
          z: (wall.minZ + wall.maxZ) / 2,
          rot: 0,
          sx: wall.maxX - wall.minX,
          sy: 1,
          sz: wall.maxZ - wall.minZ,
          accent: wall.accent ?? "#a5b4fc",
          color: mix("#c7cdd5", wall.accent ?? "#8d9caf", 0.16),
          style: wall.style ?? "parede",
        })),
    [map.walls, level],
  )

  const { bodies, doorFrames } = useMemo(() => {
    const bodies: Placement[] = walls.map((wall) => ({
      ...wall,
      sy: wall.style === "guarda-corpo" ? 1.05 : wallHeight,
    }))
    const doorFrames: Placement[] = []
    const seen = new Set<string>()
    const doorHeight = 2.58
    const frame = 0.1
    const depth = 0.48

    for (const room of map.rooms.filter((candidate) => (candidate.level ?? 0) === level)) {
      for (const door of room.doors ?? []) {
        const horizontal = door.side === "north" || door.side === "south"
        const centerX = horizontal
          ? room.rect.x + door.at + door.width / 2
          : room.rect.x + (door.side === "west" ? 0 : room.rect.w)
        const centerZ = horizontal
          ? room.rect.z + (door.side === "north" ? 0 : room.rect.d)
          : room.rect.z + door.at + door.width / 2
        const key = `${horizontal ? "h" : "v"}:${centerX.toFixed(2)}:${centerZ.toFixed(2)}`
        if (seen.has(key)) continue
        seen.add(key)

        // O batente fica dentro do vão, sem ocupar o mesmo volume da parede.
        // Isso evita z-fighting (o pontilhado/pisca-pisca visto nas portas).
        const postOffset = door.width / 2 - frame / 2
        const postHeight = doorHeight - frame
        if (horizontal) {
          doorFrames.push(
            {
              x: centerX - postOffset,
              y: postHeight / 2,
              z: centerZ,
              rot: 0,
              sx: frame,
              sy: postHeight,
              sz: depth,
            },
            {
              x: centerX + postOffset,
              y: postHeight / 2,
              z: centerZ,
              rot: 0,
              sx: frame,
              sy: postHeight,
              sz: depth,
            },
            {
              x: centerX,
              y: doorHeight - frame / 2,
              z: centerZ,
              rot: 0,
              sx: door.width + frame * 2,
              sy: frame,
              sz: depth,
            },
          )
          bodies.push({
            x: centerX,
            y: doorHeight,
            z: centerZ,
            rot: 0,
            sx: door.width,
            sy: wallHeight - doorHeight,
            sz: 0.4,
            color: mix("#c7cdd5", room.light, 0.16),
          })
        } else {
          doorFrames.push(
            {
              x: centerX,
              y: postHeight / 2,
              z: centerZ - postOffset,
              rot: 0,
              sx: depth,
              sy: postHeight,
              sz: frame,
            },
            {
              x: centerX,
              y: postHeight / 2,
              z: centerZ + postOffset,
              rot: 0,
              sx: depth,
              sy: postHeight,
              sz: frame,
            },
            {
              x: centerX,
              y: doorHeight - frame / 2,
              z: centerZ,
              rot: 0,
              sx: depth,
              sy: frame,
              sz: door.width + frame * 2,
            },
          )
          bodies.push({
            x: centerX,
            y: doorHeight,
            z: centerZ,
            rot: 0,
            sx: 0.4,
            sy: wallHeight - doorHeight,
            sz: door.width,
            color: mix("#c7cdd5", room.light, 0.16),
          })
        }
      }
    }
    return { bodies, doorFrames }
  }, [level, map.rooms, wallHeight, walls])

  const baseboards = useMemo(
    () =>
      walls.map((wall) => ({
        ...wall,
        sx: wall.sx + 0.08,
        sz: wall.sz + 0.08,
      })),
    [walls],
  )

  // O friso aceso no alto da parede é o que diz de longe em que sala o jogador
  // está: cada cômodo tem a sua cor, e ela some junto com a luz no apagão.
  const trims = useMemo(
    () =>
      walls.map((wall) => ({
        ...wall,
        y: wall.style === "guarda-corpo" ? 0.92 : wallHeight,
        sx: wall.sx + 0.12,
        sz: wall.sz + 0.12,
        color: wall.accent,
      })),
    [walls, wallHeight],
  )

  const ventPlacements = useMemo(
    () => map.vents.filter((vent) => (vent.level ?? 0) === level).map((vent) => ({ x: vent.x, z: vent.z, rot: 0 })),
    [map.vents, level],
  )

  const stairPlacements = useMemo(
    () =>
      (map.stairs ?? [])
        .filter((stair) => stair.level === level && stair.targetLevel > stair.level)
        .map((stair) => ({
          x: (stair.x + stair.targetX) / 2,
          z: (stair.z + stair.targetZ) / 2,
          rot: Math.atan2(stair.x - stair.targetX, stair.z - stair.targetZ),
        })),
    [map.stairs, level],
  )

  const emergencyLights = useMemo(
    () => [
      ...(map.stairs ?? []).filter((stair) => stair.level === level).map((stair) => ({ x: stair.x, z: stair.z })),
      ...((map.emergency.level ?? 0) === level ? [{ x: map.emergency.x, z: map.emergency.z }] : []),
    ],
    [level, map.emergency, map.stairs],
  )

  const groundGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, -0.5, 0)
    return box
  }, [])

  const ceilingGeometry = useMemo(() => {
    const box = new RoundedBoxGeometry(1.45, 0.07, 0.46, 2, 0.08)
    return box
  }, [])

  const fixtureFrameGeometry = useMemo(() => new RoundedBoxGeometry(1.58, 0.075, 0.58, 2, 0.07), [])

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

  // Altura 1 na geometria e a altura de verdade na escala da instância: trocar
  // de câmera vira uma matriz nova, não uma geometria nova.
  const wallGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, 0.5, 0)
    shadeByFace(box, 1, 0.87, 0.66)
    return box
  }, [])

  const bandGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  const ventGeometry = useMemo(() => geometryFor("vent", VENT_SPEC), [])
  const stairGeometry = useMemo(() => geometryFor("stairs", STAIR_SPEC), [])

  const baseboardGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, BASEBOARD_HEIGHT, 1)
    box.translate(0, BASEBOARD_HEIGHT / 2, 0)
    return box
  }, [])

  const trimGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, TRIM_HEIGHT, 1)
    box.translate(0, TRIM_HEIGHT / 2, 0)
    return box
  }, [])

  useEffect(() => {
    const geometries = [
      groundGeometry,
      ceilingGeometry,
      fixtureFrameGeometry,
      plinthGeometry,
      rugGeometry,
      wallGeometry,
      baseboardGeometry,
      trimGeometry,
      bandGeometry,
      ventGeometry,
      stairGeometry,
    ]
    return () => geometries.forEach((geometry) => geometry.dispose())
  }, [
    groundGeometry,
    ceilingGeometry,
    fixtureFrameGeometry,
    plinthGeometry,
    rugGeometry,
    wallGeometry,
    baseboardGeometry,
    trimGeometry,
    bandGeometry,
    ventGeometry,
    stairGeometry,
  ])

  const propGroups = useMemo(() => {
    const byKind = new Map<string, Placement[]>()
    for (const item of map.props) {
      if (!PROPS[item.kind]) continue
      if ((item.level ?? 0) !== level) continue
      // No modo leve a mobília solta some, mas o que marca sala (rack, armário,
      // mesa de reunião) fica: sem eles ninguém reconhece onde está.
      if (quality === "baixo" && ["chair", "cone", "plant", "monitor"].includes(item.kind)) continue
      const list = byKind.get(item.kind) ?? []
      list.push({ x: item.x, z: item.z, rot: item.rot })
      byKind.set(item.kind, list)
    }
    return [...byKind.entries()].map(([kind, transforms]) => ({
      kind,
      transforms,
    }))
  }, [map.props, quality, level])

  return (
    <group position-y={baseY}>
      <Instances geometry={groundGeometry} material={groundMaterial} transforms={ground} shadows={false} />
      <Instances geometry={plinthGeometry} material={plinthMaterial} transforms={plinths} shadows={false} />
      <TexturedFloors patches={floorPatches} quality={quality} blackout={blackout} />
      <Instances geometry={rugGeometry} material={rugMaterial} transforms={rugs} shadows={false} />
      <Instances geometry={rugGeometry} material={serverAisleMaterial} transforms={serverAisles} shadows={false} />
      <Instances geometry={rugGeometry} material={serverLineMaterial} transforms={serverLines} shadows={false} />
      <Instances geometry={wallGeometry} material={wallMaterial} transforms={bodies} />
      <Instances geometry={bandGeometry} material={roofMaterial} transforms={roofCaps} />
      <Instances geometry={bandGeometry} material={windowMaterial} transforms={facadeWindows} shadows={false} />
      <Instances geometry={bandGeometry} material={roofMaterial} transforms={entranceAwnings} />
      <Instances geometry={baseboardGeometry} material={baseboardMaterial} transforms={baseboards} shadows={false} />
      <Instances geometry={trimGeometry} material={trimMaterial} transforms={trims} shadows={false} />
      <Instances geometry={bandGeometry} material={frameMaterial} transforms={doorFrames} shadows={false} />
      <Instances geometry={ventGeometry} material={ventMaterial} transforms={ventPlacements} shadows={false} />
      <Instances geometry={stairGeometry} material={ventMaterial} transforms={stairPlacements} />
      <Instances geometry={bandGeometry} material={ceilingSlabMaterial} transforms={ceilings} shadows={false} />
      {quality !== "baixo" && (
        <>
          <Instances geometry={fixtureFrameGeometry} material={fixtureFrameMaterial} transforms={fixtureFrames} />
          <Instances geometry={ceilingGeometry} material={ceilingMaterial} transforms={ceilingFixtures} shadows={false} />
        </>
      )}
      {active && (
        <LocalRoomLights
          lights={roomLights}
          height={Math.max(2.8, wallHeight - 0.2)}
          blackout={blackout}
          focusRef={focusRef}
        />
      )}
      {active &&
        quality !== "baixo" &&
        emergencyLights.map((light, index) => (
          <pointLight
            key={`emergency-light-${index}`}
            position={[light.x, 0.48, light.z]}
            color="#ff2d3f"
            intensity={blackout ? 18 : 0}
            distance={7.5}
            decay={2}
          />
        ))}
      {propGroups.map((group) => {
        const modelPath = DETAILED_MODELS[group.kind as DetailedModelKind]
        return quality !== "baixo" && modelPath && (!generatedOutdoor || map.props.length < 70) ? (
          <DetailedPropKind
            key={group.kind}
            kind={group.kind}
            path={modelPath}
            transforms={group.transforms}
            upholstery={materialTextures.upholstery}
            upholsteryNormal={materialTextures.upholsteryNormal}
            upholsteryRoughness={materialTextures.upholsteryRoughness}
          />
        ) : (
          <PropKind
            key={group.kind}
            kind={group.kind}
            transforms={group.transforms}
            upholstery={materialTextures.upholstery}
            upholsteryNormal={materialTextures.upholsteryNormal}
            upholsteryRoughness={materialTextures.upholsteryRoughness}
          />
        )
      })}
    </group>
  )
}

function DetailedPropKind({
  kind,
  path,
  transforms,
  upholstery,
  upholsteryNormal,
  upholsteryRoughness,
}: {
  kind: string
  path: string
  transforms: Placement[]
  upholstery: THREE.Texture
  upholsteryNormal: THREE.Texture
  upholsteryRoughness: THREE.Texture
}) {
  const { scene } = useGLTF(path)
  const prepared = useMemo(() => {
    const model = scene.clone(true)
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      const source = Array.isArray(child.material) ? child.material : [child.material]
      const materials = source.map((entry) => {
        const next = entry.clone() as THREE.MeshStandardMaterial
        next.envMapIntensity = 1.15
        if (entry.name === "fabric") {
          next.color.set("#ffffff")
          next.map = upholstery
          next.normalMap = upholsteryNormal
          next.normalScale.setScalar(0.42)
          next.roughnessMap = upholsteryRoughness
          next.roughness = 1
        }
        return next
      })
      child.material = Array.isArray(child.material) ? materials : materials[0]
    })
    return model
  }, [scene, upholstery, upholsteryNormal, upholsteryRoughness])

  const objects = useMemo(
    () =>
      transforms.map((item, index) => {
        const object = prepared.clone(true)
        object.name = `${kind}-${index}`
        object.position.set(item.x, item.y ?? 0, item.z)
        object.rotation.set(0, item.rot, 0)
        object.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1)
        return object
      }),
    [kind, prepared, transforms],
  )

  useEffect(
    () => () => {
      prepared.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => material.dispose())
      })
    },
    [prepared],
  )

  return <>{objects.map((object) => <primitive key={object.name} object={object} />)}</>
}

function PropKind({
  kind,
  transforms,
  upholstery,
  upholsteryNormal,
  upholsteryRoughness,
}: {
  kind: string
  transforms: Placement[]
  upholstery: THREE.Texture
  upholsteryNormal: THREE.Texture
  upholsteryRoughness: THREE.Texture
}) {
  const spec = PROPS[kind]
  const geometry = useMemo(() => geometryFor(kind, spec), [kind, spec])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useVisionMaterial({
    color: "#ffffff",
    map: kind === "sofa" || kind === "chair" ? upholstery : undefined,
    normalMap: kind === "sofa" || kind === "chair" ? upholsteryNormal : undefined,
    normalScale: 0.35,
    roughnessMap: kind === "sofa" || kind === "chair" ? upholsteryRoughness : undefined,
    emissive: spec.emissive,
    emissiveIntensity: spec.emissive ? (spec.emissiveIntensity ?? 0.45) : 0,
    roughness: 0.72,
    vertexColors: true,
  })
  return <Instances geometry={geometry} material={material} transforms={transforms} />
}
