"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality, View } from "../match-types"
import { useVisionMaterial } from "./vision-material"

/// A parede muda de altura conforme de onde se olha, e isso não é enfeite. Em
/// primeira pessoa ela precisa passar dos olhos, senão o jogador enxerga por
/// cima de tudo e o esconde-esconde acaba. Na câmera de cima ela precisa ficar
/// na altura do peito, senão vira um muro que engole a sala. É a mesma parede
/// nos dois casos para a colisão, só o desenho encolhe.
const WALL_HEIGHT: Record<View, number> = { primeira: 3.2, isometrica: 1.55 }
const TRIM_HEIGHT = 0.16
const BASEBOARD_HEIGHT = 0.22

/// Só entra janela em pano de parede grande. Em pedaço curto, ao lado de porta,
/// ela sai espremida e parece defeito, e a passagem sobre o vazio fica fechada
/// de propósito: ninguém deve ver de dentro da sala quem está atravessando.
const WINDOW_MIN_WALL = 6
/// Onde o vão começa e termina, em fração da altura da parede. Em primeira
/// pessoa isso põe a janela na altura dos olhos, que é onde ela serve.
const WINDOW_BOTTOM = 0.39
const WINDOW_TOP = 0.81
/// A ombreira de alvenaria que sobra em cada ponta do pano de parede.
const JAMB_WIDTH = 1.0
/// Largura de um vão e o pilar mínimo entre dois. Uma parede de vinte metros
/// não leva uma vidraça de dezoito: leva cinco janelas com pilar entre elas, que
/// é o que dá ritmo de prédio em vez de aquário.
const BAY_WIDTH = 2.6
const PIER_MIN = 1.0

/// Onde ficam os vãos ao longo de um pano de parede, medidos da ponta dele.
function bayspans(length: number): [number, number][] {
  const usable = length - JAMB_WIDTH * 2
  let count = Math.floor((usable + PIER_MIN) / (BAY_WIDTH + PIER_MIN))
  if (count < 1) return []
  let gap = count > 1 ? (usable - count * BAY_WIDTH) / (count - 1) : 0
  if (count > 1 && gap < PIER_MIN) {
    count -= 1
    gap = count > 1 ? (usable - count * BAY_WIDTH) / (count - 1) : 0
  }
  const spans: [number, number][] = []
  for (let index = 0; index < count; index += 1) {
    const from = JAMB_WIDTH + index * (BAY_WIDTH + gap)
    spans.push([from, from + BAY_WIDTH])
  }
  return spans
}

/// O que sobra de parede cheia entre um vão e outro.
function solidSpans(length: number, bays: [number, number][]): [number, number][] {
  const spans: [number, number][] = []
  let cursor = 0
  for (const [from, to] of bays) {
    if (from > cursor) spans.push([cursor, from])
    cursor = to
  }
  if (cursor < length) spans.push([cursor, length])
  return spans
}

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
  ) => add(new RoundedBoxGeometry(...size, 2, radius), tone, position, rotation)

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

  for (const [w, h, d, x, y, z, tone] of spec.boxes) {
    box([w, h, d], [x, y, z], tone ?? spec.color)
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
    box([0.34, 0.14, 0.07], [0, 1.01, -0.22], "#72839e", [0, 0, 0], 0.06)
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
    box([0.82, 0.12, 0.7], [-0.46, 0.52, 0.08], "#9cacbf", [0, 0, 0], 0.055)
    box([0.82, 0.12, 0.7], [0.46, 0.52, 0.08], "#91a3ba", [0, 0, 0], 0.055)
    box([0.84, 0.42, 0.11], [-0.46, 0.77, -0.29], "#8fa1b8", [-0.08, 0, 0], 0.06)
    box([0.84, 0.42, 0.11], [0.46, 0.77, -0.29], "#8498b1", [-0.08, 0, 0], 0.06)
    ;[-0.76, 0.76].forEach((x) => box([0.09, 0.16, 0.09], [x, 0.08, 0], "#56657b", [0, 0, 0], 0.025))
  } else if (kind === "counter") {
    for (let index = 0; index < 11; index += 1) {
      box([0.055, 0.78, 0.035], [-1.9 + index * 0.38, 0.53, 0.475], index % 2 ? "#c5a783" : "#b9956e", [0, 0, 0], 0.016)
    }
    box([0.65, 0.34, 0.025], [0, 0.58, 0.51], "#2d6f8e", [0, 0, 0], 0.025)
    box([0.45, 0.045, 0.16], [0, 1.15, 0], "#63738b", [0, 0, 0], 0.018)
  } else if (kind === "meetingTable") {
    cylinder(0.12, 0.12, 0.035, [0, 0.82, 0], "#273548", [0, 0, 0], 18)
    torus(0.16, 0.018, [0, 0.825, 0], "#8190a4")
    box([0.72, 0.045, 0.22], [0, 0.795, -0.45], "#c1a37e", [0, 0, 0], 0.025)
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
  } else if (kind === "vending") {
    box([0.77, 1.42, 0.035], [-0.08, 1.15, 0.405], "#142133", [0, 0, 0], 0.02)
    const products = ["#ef6b73", "#f4bb55", "#58c88c", "#62aaf5"]
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        cylinder(0.055, 0.055, 0.16, [-0.31 + column * 0.24, 0.72 + row * 0.29, 0.44], products[(row + column) % products.length], [0, 0, 0], 10)
      }
      box([0.7, 0.018, 0.04], [-0.08, 0.6 + row * 0.29, 0.44], "#8291a5", [0, 0, 0], 0.006)
    }
    box([0.18, 0.3, 0.035], [0.41, 1.35, 0.43], "#24354c", [0, 0, 0], 0.018)
    box([0.11, 0.055, 0.02], [0.41, 1.43, 0.455], "#6de3d0", [0, 0, 0], 0.008)
    box([0.56, 0.2, 0.04], [-0.08, 0.28, 0.44], "#0e1724", [0, 0, 0], 0.02)
  }

  const merged = mergeGeometries(parts, false)
  if (!merged) throw new Error(`Não foi possível montar o objeto 3D ${kind}`)
  parts.forEach((part) => part.dispose())
  return merged
}

const STAIR_SPEC: PropSpec = {
  color: "#c8d1dc",
  boxes: [
    [0.08, 1.45, 3.8, -1.45, 0.78, 0, "#65758a"],
    [0.08, 1.45, 3.8, 1.45, 0.78, 0, "#65758a"],
    ...Array.from({ length: 9 }, (_, index) =>
      [
        2.8,
        0.16 + index * 0.16,
        0.42,
        0,
        (0.16 + index * 0.16) / 2,
        1.68 - index * 0.42,
        index % 2 ? "#d5dce5" : "#c6d0dc",
      ] as Box,
    ),
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

export function OfficeWorld({
  map,
  quality,
  blackout,
  view,
  level,
}: {
  map: OfficeMap
  quality: Quality
  blackout: boolean
  view: View
  level: number
}) {
  const wallHeight = WALL_HEIGHT[view]
  const groundMaterial = useVisionMaterial({ color: "#253148", roughness: 0.98, surface: "piso" })
  const floorMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.94, vertexColors: true, surface: "piso" })
  const plinthMaterial = useVisionMaterial({ color: "#39435c", roughness: 0.95, vertexColors: true })
  const rugMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.99, surface: "piso" })
  const wallMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.76, vertexColors: true, surface: "parede" })
  const baseboardMaterial = useVisionMaterial({ color: "#b0bccd", roughness: 0.7, metalness: 0.05 })
  const trimMaterial = useVisionMaterial({ color: "#ffffff", unlit: true })
  // Vidro fosco, não vidraça limpa, e isso é regra de jogo antes de ser gosto:
  // quem está do outro lado continua escondido pela parede na conta da linha de
  // visão, então o vidro não pode deixar ninguém reconhecer uma silhueta ali.
  // Ele entra luz e mostra o vazio lá fora, e para de entregar o resto.
  const glassMaterial = useVisionMaterial({
    color: "#cfe9f7",
    emissive: "#6ba7cf",
    emissiveIntensity: 0.22,
    roughness: 0.4,
    metalness: 0.15,
    transparent: true,
    opacity: 0.72,
  })
  const frameMaterial = useVisionMaterial({ color: "#8d9bb0", roughness: 0.45, metalness: 0.35 })
  const ventMaterial = useVisionMaterial({ color: "#ffffff", roughness: 0.5, metalness: 0.4, vertexColors: true })
  const ceilingMaterial = useVisionMaterial({
    color: "#fff9e8",
    emissive: "#fff2c5",
    emissiveIntensity: blackout ? 0.02 : 1.35,
    roughness: 0.3,
  })
  const ceilingSlabMaterial = useVisionMaterial({ color: "#e8edf4", roughness: 0.9, surface: "piso" })
  const serverAisleMaterial = useVisionMaterial({
    color: "#263b50",
    emissive: "#164e63",
    emissiveIntensity: 0.22,
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
    () => [
      {
        x: map.bounds.x + map.bounds.w / 2,
        y: -0.72,
        z: map.bounds.z + map.bounds.d / 2,
        rot: 0,
        sx: map.bounds.w + 5,
        sy: 0.22,
        sz: map.bounds.d + 5,
      },
    ],
    [map.bounds],
  )

  const ceilingFixtures = useMemo(
    () =>
      map.rooms
        .filter((room) => (room.level ?? 0) === level && room.kind !== "terraco")
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
          return fixtures
        }),
    [map.rooms, wallHeight, level],
  )

  const ceilings = useMemo(
    () =>
      map.rooms.filter((room) => (room.level ?? 0) === level && room.kind !== "terraco").map((room) => ({
        x: room.rect.x + room.rect.w / 2,
        y: wallHeight + 0.06,
        z: room.rect.z + room.rect.d / 2,
        rot: 0,
        sx: room.rect.w,
        sy: 0.12,
        sz: room.rect.d,
      })),
    [map.rooms, wallHeight, level],
  )

  const roomLights = useMemo<RoomLightSource[]>(() => {
    if (quality === "baixo") return []

    return map.rooms
      .filter((room) => (room.level ?? 0) === level && room.kind !== "terraco")
      .flatMap((room) => {
        const area = room.rect.w * room.rect.d
        const amount = quality === "alto" ? (area >= 500 ? 3 : area >= 260 ? 2 : 1) : 1
        const alongX = room.rect.w >= room.rect.d
        const roomTone = new THREE.Color("#fff4df").lerp(new THREE.Color(room.light), 0.28)

        return Array.from({ length: amount }, (_, index) => {
          const fraction = (index + 1) / (amount + 1)
          return {
            x: alongX
              ? room.rect.x + room.rect.w * fraction
              : room.rect.x + room.rect.w / 2,
            z: alongX
              ? room.rect.z + room.rect.d / 2
              : room.rect.z + room.rect.d * fraction,
            color: `#${roomTone.getHexString()}`,
            intensity: room.kind === "corredor" ? 34 : 29,
            distance: THREE.MathUtils.clamp(Math.max(room.rect.w, room.rect.d) * 0.82, 10, 19),
          }
        })
      })
  }, [map.rooms, quality, level])

  const serverAisles = useMemo(
    () =>
      map.rooms
        .filter(
          (room) =>
            (room.level ?? 0) === level && (room.id === "servidores" || room.id === "operacoes"),
        )
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

  const floors = useMemo(
    () =>
      map.rooms.filter((room) => (room.level ?? 0) === level).map((room) => ({
        x: room.rect.x + room.rect.w / 2,
        z: room.rect.z + room.rect.d / 2,
        rot: 0,
        sx: room.rect.w,
        sy: room.kind === "corredor" ? SLAB_CORREDOR : SLAB_SALA,
        sz: room.rect.d,
        color: room.floor,
      })),
    [map.rooms, level],
  )

  // A base escura que aparece só nas bordas da laje: é ela que faz a sala
  // parecer pousada no vazio em vez de recortada nele.
  const plinths = useMemo(
    () =>
      map.rooms.filter((room) => (room.level ?? 0) === level).map((room) => ({
        x: room.rect.x + room.rect.w / 2,
        y: -0.18,
        z: room.rect.z + room.rect.d / 2,
        rot: 0,
        sx: room.rect.w + PLINTH_OVERHANG * 2,
        sy: (room.kind === "corredor" ? SLAB_CORREDOR : SLAB_SALA) + 0.75,
        sz: room.rect.d + PLINTH_OVERHANG * 2,
      })),
    [map.rooms, level],
  )

  // Um tapete no meio das salas grandes. Sem ele o miolo do cômodo é um vazio
  // de cor única do tamanho de uma quadra.
  const rugs = useMemo(
    () =>
      map.rooms
        .filter(
          (room) =>
            (room.level ?? 0) === level &&
            room.kind === "sala" &&
            room.rect.w >= 11 &&
            room.rect.d >= 11,
        )
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
    [map.rooms, level],
  )

  const walls = useMemo(
    () =>
      map.walls.filter((wall) => (wall.level ?? 0) === level).map((wall) => ({
        x: (wall.minX + wall.maxX) / 2,
        z: (wall.minZ + wall.maxZ) / 2,
        rot: 0,
        sx: wall.maxX - wall.minX,
        sy: 1,
        sz: wall.maxZ - wall.minZ,
        accent: wall.accent ?? "#a5b4fc",
        style: wall.style ?? "parede",
      })),
    [map.walls, level],
  )

  // A parede com janela é montada em pedaços: peitoril embaixo, verga em cima e
  // um pilar cheio entre um vão e outro. O buraco fica aberto de verdade, com a
  // espessura da parede aparecendo na borda. Desenhar o vidro por cima da parede
  // inteira dava painel colado, não janela.
  const { bodies, glass, frames } = useMemo(() => {
    const bodies: Placement[] = []
    const glass: Placement[] = []
    const frames: Placement[] = []
    const abaixo = wallHeight * WINDOW_BOTTOM
    const acima = wallHeight * WINDOW_TOP
    const meio = (abaixo + acima) / 2

    for (const wall of walls) {
      const horizontal = wall.sx > wall.sz
      const length = horizontal ? wall.sx : wall.sz
      if (wall.style === "guarda-corpo") {
        bodies.push({ ...wall, sy: 0.92 })
        continue
      }
      const bays = length >= WINDOW_MIN_WALL ? bayspans(length) : []

      if (bays.length === 0) {
        bodies.push({ ...wall, sy: wallHeight })
        continue
      }

      // Peitoril e verga correm o pano inteiro; os pilares fecham o que sobra.
      bodies.push({ ...wall, y: 0, sy: abaixo })
      bodies.push({ ...wall, y: acima, sy: wallHeight - acima })

      const origem = horizontal ? wall.x - length / 2 : wall.z - length / 2
      const pedaco = (from: number, to: number, extra: Partial<Placement>): Placement => {
        const centro = origem + (from + to) / 2
        return {
          ...wall,
          x: horizontal ? centro : wall.x,
          z: horizontal ? wall.z : centro,
          sx: horizontal ? to - from : wall.sx,
          sz: horizontal ? wall.sz : to - from,
          ...extra,
        }
      }

      for (const [from, to] of solidSpans(length, bays)) {
        bodies.push(pedaco(from, to, { y: 0, sy: wallHeight }))
      }

      for (const [from, to] of bays) {
        const vidro = pedaco(from, to, { y: meio, sy: acima - abaixo })
        // O vidro entra um pouco para dentro da parede, senão fica rente e
        // some; o caixilho é que aparece rente à face.
        glass.push({
          ...vidro,
          sx: horizontal ? vidro.sx : wall.sx - 0.16,
          sz: horizontal ? wall.sz - 0.16 : vidro.sz,
        })
        frames.push(pedaco(from, to, { y: meio, sy: 0.07 }))
        frames.push(pedaco(from, to, { y: abaixo + 0.03, sy: 0.06 }))
        frames.push(pedaco(from, to, { y: acima - 0.03, sy: 0.06 }))
      }
    }
    return { bodies, glass, frames }
  }, [walls, wallHeight])

  const baseboards = useMemo(
    () => walls.map((wall) => ({ ...wall, sx: wall.sx + 0.08, sz: wall.sz + 0.08 })),
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
    () =>
      map.vents
        .filter((vent) => (vent.level ?? 0) === level)
        .map((vent) => ({ x: vent.x, z: vent.z, rot: 0 })),
    [map.vents, level],
  )

  const stairPlacements = useMemo(
    () =>
      (map.stairs ?? [])
        .filter((stair) => stair.level === level)
        .map((stair) => ({ x: stair.x, z: stair.z, rot: stair.rot })),
    [map.stairs, level],
  )

  const emergencyLights = useMemo(
    () => [
      ...(map.stairs ?? [])
        .filter((stair) => stair.level === level)
        .map((stair) => ({ x: stair.x, z: stair.z })),
      ...((map.emergency.level ?? 0) === level
        ? [{ x: map.emergency.x, z: map.emergency.z }]
        : []),
    ],
    [level, map.emergency, map.stairs],
  )

  const slabGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, -0.5, 0)
    shadeByFace(box, 1, 0.7, 0.36)
    return box
  }, [])

  const groundGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, -0.5, 0)
    return box
  }, [])

  const ceilingGeometry = useMemo(() => {
    const box = new RoundedBoxGeometry(1.45, 0.07, 0.46, 2, 0.08)
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

  // Altura 1 na geometria e a altura de verdade na escala da instância: trocar
  // de câmera vira uma matriz nova, não uma geometria nova.
  const wallGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, 0.5, 0)
    shadeByFace(box, 1, 0.9, 0.6)
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
      slabGeometry,
      groundGeometry,
      ceilingGeometry,
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
    slabGeometry,
    groundGeometry,
    ceilingGeometry,
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
    return [...byKind.entries()].map(([kind, transforms]) => ({ kind, transforms }))
  }, [map.props, quality, level])

  return (
    <group>
      <Instances geometry={groundGeometry} material={groundMaterial} transforms={ground} shadows={false} />
      <Instances geometry={plinthGeometry} material={plinthMaterial} transforms={plinths} shadows={false} />
      <Instances geometry={slabGeometry} material={floorMaterial} transforms={floors} />
      <Instances geometry={rugGeometry} material={rugMaterial} transforms={rugs} shadows={false} />
      <Instances geometry={rugGeometry} material={serverAisleMaterial} transforms={serverAisles} shadows={false} />
      <Instances geometry={rugGeometry} material={serverLineMaterial} transforms={serverLines} shadows={false} />
      <Instances geometry={wallGeometry} material={wallMaterial} transforms={bodies} />
      <Instances geometry={baseboardGeometry} material={baseboardMaterial} transforms={baseboards} shadows={false} />
      <Instances geometry={trimGeometry} material={trimMaterial} transforms={trims} shadows={false} />
      <Instances geometry={bandGeometry} material={frameMaterial} transforms={frames} shadows={false} />
      <Instances geometry={bandGeometry} material={glassMaterial} transforms={glass} shadows={false} />
      <Instances geometry={ventGeometry} material={ventMaterial} transforms={ventPlacements} shadows={false} />
      <Instances geometry={stairGeometry} material={ventMaterial} transforms={stairPlacements} />
      {view === "primeira" && (
        <Instances geometry={bandGeometry} material={ceilingSlabMaterial} transforms={ceilings} shadows={false} />
      )}
      {view === "primeira" && quality !== "baixo" && (
        <Instances geometry={ceilingGeometry} material={ceilingMaterial} transforms={ceilingFixtures} shadows={false} />
      )}
      {roomLights.map((light, index) => (
        <pointLight
          key={`room-light-${index}`}
          position={[light.x, Math.max(2.8, wallHeight - 0.3), light.z]}
          color={light.color}
          intensity={blackout ? 0 : light.intensity}
          distance={light.distance}
          decay={2}
        />
      ))}
      {quality !== "baixo" &&
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
      {propGroups.map((group) => (
        <PropKind key={group.kind} kind={group.kind} transforms={group.transforms} />
      ))}
    </group>
  )
}

function PropKind({ kind, transforms }: { kind: string; transforms: Placement[] }) {
  const spec = PROPS[kind]
  const geometry = useMemo(() => geometryFor(kind, spec), [kind, spec])
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
