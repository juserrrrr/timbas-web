"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Download,
  ExternalLink,
  FileJson,
  Grid3X3,
  ImagePlus,
  Map as MapIcon,
  MapPinned,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react"
import { AdminHeader, AdminMetrics, InlineNotice, SectionCard } from "@/components/admin/shell"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  createAdminOfficeMap,
  deleteAdminOfficeMap,
  getAdminOfficeMap,
  listAdminOfficeMaps,
  updateAdminOfficeMap,
  type GameMapSummary,
  type MapRoom,
  type MapTaskSpot,
  type OfficeMap,
} from "@/lib/services/games"
import { toast } from "@/lib/toast"
import { RealAreaPicker, type GeoBounds } from "./real-area-picker"

const DRAFT_KEY = "timbas.deducao.map-draft.v1"
const FINISHES: Array<{ value: NonNullable<MapRoom["finish"]>; label: string }> = [
  { value: "vinyl", label: "Vinílico" },
  { value: "patternedCarpet", label: "Carpete desenhado" },
  { value: "carpet", label: "Carpete escuro" },
  { value: "wood", label: "Madeira" },
  { value: "parquet", label: "Parquet" },
  { value: "terrazzo", label: "Terrazzo" },
  { value: "server", label: "Piso técnico" },
  { value: "pantry", label: "Cerâmica" },
  { value: "concrete", label: "Concreto" },
  { value: "grass", label: "Grama" },
  { value: "water", label: "Água/piscina" },
  { value: "sport", label: "Quadra esportiva" },
  { value: "asphalt", label: "Asfalto" },
]
const ROOM_COLORS: Record<NonNullable<MapRoom["finish"]>, string> = {
  vinyl: "#6387a3",
  patternedCarpet: "#4f9a98",
  carpet: "#40536f",
  wood: "#aa744b",
  parquet: "#c28a4d",
  terrazzo: "#89939f",
  server: "#397895",
  pantry: "#5a9479",
  concrete: "#747b84",
  grass: "#4f8f47",
  water: "#26b9cf",
  sport: "#378a91",
  asphalt: "#303337",
}
const TASK_KINDS = [
  { value: "cabos", label: "Consertar cabos" },
  { value: "senha", label: "Digitar senha" },
  { value: "arquivo", label: "Organizar arquivos" },
  { value: "estoque", label: "Conferir estoque" },
  { value: "cafe", label: "Preparar café" },
  { value: "impressora", label: "Reparar impressora" },
  { value: "rack", label: "Reiniciar servidor" },
] as const
const TASK_KIND_VALUES = new Set<string>(TASK_KINDS.map((kind) => kind.value))

type DragState = {
  id: string
  mode: "move" | "resize"
  startX: number
  startZ: number
  room: MapRoom["rect"]
}

type ViewPanState = {
  pointerId: number
  clientX: number
  clientY: number
  view: OfficeMap["bounds"]
  unitsPerPixelX: number
  unitsPerPixelZ: number
}

function clampView(view: OfficeMap["bounds"], bounds: OfficeMap["bounds"]): OfficeMap["bounds"] {
  const w = Math.max(Math.min(18, bounds.w), Math.min(bounds.w, view.w))
  const d = Math.max(Math.min(14, bounds.d), Math.min(bounds.d, view.d))
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.w - w, view.x)),
    z: Math.max(bounds.z, Math.min(bounds.z + bounds.d - d, view.z)),
    w,
    d,
  }
}

function cloneMap(map: OfficeMap): OfficeMap {
  return structuredClone(map)
}

function snap(value: number): number {
  return Math.round(value * 2) / 2
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeAngle(value: number): number {
  return round2(Math.atan2(Math.sin(value), Math.cos(value)))
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "sala"
}

function uniqueRoomId(map: OfficeMap, base: string): string {
  const used = new Set(map.rooms.map((room) => room.id))
  let id = slug(base)
  let suffix = 2
  while (used.has(id)) id = `${slug(base)}-${suffix++}`
  return id
}

function pointInside(map: OfficeMap, point: { x: number; z: number; level?: number }) {
  return map.rooms.some(
    (room) =>
      (room.level ?? 0) === (point.level ?? 0) &&
      point.x >= room.rect.x &&
      point.x <= room.rect.x + room.rect.w &&
      point.z >= room.rect.z &&
      point.z <= room.rect.z + room.rect.d,
  )
}

function pointInWater(map: OfficeMap, point: { x: number; z: number; level?: number }) {
  return map.rooms.some(
    (room) =>
      room.kind === "agua" &&
      (room.level ?? 0) === (point.level ?? 0) &&
      point.x >= room.rect.x &&
      point.x <= room.rect.x + room.rect.w &&
      point.z >= room.rect.z &&
      point.z <= room.rect.z + room.rect.d,
  )
}

function pointInsideRoom(room: MapRoom, point: { x: number; z: number; level?: number }) {
  return (
    (room.level ?? 0) === (point.level ?? 0) &&
    point.x >= room.rect.x &&
    point.x <= room.rect.x + room.rect.w &&
    point.z >= room.rect.z &&
    point.z <= room.rect.z + room.rect.d
  )
}

function playableRooms(map: OfficeMap) {
  return map.rooms.filter((room) => room.kind !== "terraco" && room.kind !== "agua")
}

function safePoint(map: OfficeMap, room: MapRoom, xRatio = 0.5, zRatio = 0.5) {
  const ratios = [
    [xRatio, zRatio],
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
    [0.5, 0.25],
    [0.5, 0.75],
  ]
  for (const [rx, rz] of ratios) {
    const insetX = Math.min(0.2, room.rect.w / 4)
    const insetZ = Math.min(0.2, room.rect.d / 4)
    const point = {
      x: round2(
        Math.max(room.rect.x + insetX, Math.min(room.rect.x + room.rect.w - insetX, room.rect.x + room.rect.w * rx)),
      ),
      z: round2(
        Math.max(room.rect.z + insetZ, Math.min(room.rect.z + room.rect.d - insetZ, room.rect.z + room.rect.d * rz)),
      ),
      level: room.level ?? 0,
    }
    if (pointInsideRoom(room, point) && !pointInWater(map, point)) return point
  }
  return {
    x: round2(room.rect.x + room.rect.w / 2),
    z: round2(room.rect.z + room.rect.d / 2),
    level: room.level ?? 0,
  }
}

function preparePlayable(source: OfficeMap): OfficeMap {
  const map = cloneMap(source)
  const rooms = playableRooms(map)
  const ground = rooms.filter((room) => (room.level ?? 0) === 0)
  const purposeBuilt = ground.filter((room) => room.kind === "sala" || room.kind === "campo")
  const meetingRoom = [...(purposeBuilt.length > 0 ? purposeBuilt : ground)].sort(
    (a, b) => b.rect.w * b.rect.d - a.rect.w * a.rect.d,
  )[0]
  if (!meetingRoom) return map

  const center = safePoint(map, meetingRoom)
  const spacing = Math.max(0.9, Math.min(1.5, Math.min(meetingRoom.rect.w, meetingRoom.rect.d) / 7))
  const candidates = Array.from({ length: 12 }, (_, index) => ({
    x: snap(center.x + (index % 4 - 1.5) * spacing),
    z: snap(center.z + (Math.floor(index / 4) - 1) * spacing),
    level: 0,
  })).filter((point) => pointInside(map, point) && !pointInWater(map, point))
  map.spawns = candidates.length >= 4 ? candidates : [{ ...center }, { ...center }, { ...center }, { ...center }]
  map.emergency = center

  const radius = Math.max(1.2, Math.min(2.8, Math.min(meetingRoom.rect.w, meetingRoom.rect.d) / 3))
  map.meetingSeats = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2
    return {
      x: snap(center.x + Math.cos(angle) * radius),
      z: snap(center.z + Math.sin(angle) * radius),
      level: 0,
      dir: normalizeAngle(angle + Math.PI / 2),
    }
  }).filter((point) => pointInside(map, point) && !pointInWater(map, point))
  while (map.meetingSeats.length < 4) map.meetingSeats.push({ ...center, dir: 0 })

  const preferredTaskRooms = rooms.filter((room) => room.kind === "sala" || room.kind === "campo")
  const taskRooms = preferredTaskRooms.length > 0 ? preferredTaskRooms : rooms.length > 0 ? rooms : [meetingRoom]
  const taskKinds = ["cabos", "senha", "arquivo", "estoque", "cafe", "impressora", "rack"]
  map.taskSpots = Array.from({ length: Math.max(4, Math.min(16, taskRooms.length * 2)) }, (_, index) => {
    const room = taskRooms[index % taskRooms.length]
    const lane = Math.floor(index / taskRooms.length)
    const point = safePoint(map, room, lane % 2 === 0 ? 0.38 : 0.62, lane % 2 === 0 ? 0.42 : 0.58)
    return {
      id: `tarefa-${index + 1}`,
      kind: taskKinds[index % taskKinds.length],
      room: room.id,
      label: `Tarefa em ${room.name}`,
      x: point.x,
      z: point.z,
      level: room.level ?? 0,
    }
  })
  map.props = map.props.filter((prop) => pointInside(map, prop))
  map.vents = map.vents.filter((vent) => pointInside(map, vent) && map.rooms.some((room) => room.id === vent.room))
  map.walls = []
  map.obstacles = []
  return map
}

function repairPlayable(source: OfficeMap): OfficeMap {
  const map = cloneMap(source)
  const defaults = preparePlayable(map)
  const rooms = playableRooms(map)
  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const taskIds = new Set<string>()

  const roomAndPoint = (preferred: MapRoom | undefined, index: number) => {
    const ordered = preferred ? [preferred, ...rooms.filter((room) => room.id !== preferred.id)] : rooms
    for (const room of ordered) {
      const point = safePoint(map, room, index % 2 === 0 ? 0.38 : 0.62, index % 3 === 0 ? 0.42 : 0.58)
      if (!pointInWater(map, point)) return { room, point }
    }
    const room = rooms[0]
    return room ? { room, point: safePoint(map, room) } : null
  }

  map.taskSpots = map.taskSpots.slice(0, 200).flatMap((task, index) => {
    const preferred = roomById.get(task.room)
    const placement = preferred && pointInsideRoom(preferred, task) && !pointInWater(map, task)
      ? { room: preferred, point: { x: round2(task.x), z: round2(task.z), level: preferred.level ?? 0 } }
      : roomAndPoint(preferred, index)
    if (!placement) return []

    const baseId = slug(task.id || `tarefa-${index + 1}`)
    let id = baseId
    let suffix = 2
    while (taskIds.has(id)) id = `${baseId}-${suffix++}`
    taskIds.add(id)
    return [{
      ...task,
      id,
      kind: TASK_KIND_VALUES.has(task.kind) ? task.kind : TASK_KINDS[index % TASK_KINDS.length].value,
      label: task.label?.trim() || `Tarefa em ${placement.room.name}`,
      room: placement.room.id,
      x: placement.point.x,
      z: placement.point.z,
      level: placement.room.level ?? 0,
    }]
  })

  for (const fallback of defaults.taskSpots) {
    if (map.taskSpots.length >= 4) break
    const placement = roomAndPoint(roomById.get(fallback.room), map.taskSpots.length)
    if (!placement) break
    let id = `tarefa-${map.taskSpots.length + 1}`
    while (taskIds.has(id)) id = `${id}-nova`
    taskIds.add(id)
    map.taskSpots.push({
      ...fallback,
      id,
      room: placement.room.id,
      label: `Tarefa em ${placement.room.name}`,
      x: placement.point.x,
      z: placement.point.z,
      level: placement.room.level ?? 0,
    })
  }

  const usablePoint = (point: { x: number; z: number; level?: number }) =>
    Number.isFinite(point.x) && Number.isFinite(point.z) && pointInside(map, point) && !pointInWater(map, point)
  const spawns = map.spawns.filter(usablePoint).slice(0, 24)
  map.spawns = spawns.length >= 4 ? spawns : defaults.spawns
  map.emergency = usablePoint(map.emergency) ? map.emergency : defaults.emergency
  const seats = map.meetingSeats
    .filter(usablePoint)
    .slice(0, 16)
    .map((seat) => ({ ...seat, dir: normalizeAngle(Number.isFinite(seat.dir) ? seat.dir : 0) }))
  map.meetingSeats = seats.length >= 4 ? seats : defaults.meetingSeats
  map.props = map.props.filter((prop) => usablePoint(prop))
  const ventRooms = new Map(map.rooms.filter((room) => room.kind !== "agua").map((room) => [room.id, room]))
  const validVents = map.vents.filter((vent) => {
    const room = ventRooms.get(vent.room)
    return Boolean(room && pointInsideRoom(room, vent) && !pointInWater(map, vent))
  })
  const validVentIds = new Set(validVents.map((vent) => vent.id))
  map.vents = validVents.map((vent) => ({ ...vent, links: vent.links.filter((link) => validVentIds.has(link)) }))
  map.walls = []
  map.obstacles = []
  return map
}

function newMap(): OfficeMap {
  const base: OfficeMap = {
    name: "Novo mapa",
    bounds: { x: 0, z: 0, w: 60, d: 44 },
    rooms: [
      {
        id: "sala-principal",
        name: "Sala principal",
        rect: { x: 2, z: 2, w: 56, d: 40 },
        kind: "sala",
        level: 0,
        floor: "#71889b",
        finish: "patternedCarpet",
        light: "#67e8f9",
        doors: [],
      },
    ],
    walls: [],
    obstacles: [],
    props: [],
    taskSpots: [],
    vents: [],
    stairs: [],
    emergency: { x: 30, z: 22, level: 0 },
    spawns: [],
    meetingSeats: [],
  }
  return preparePlayable(base)
}

function coordinatesFromGoogleUrl(value: string) {
  const normalized = value.replace(/\+/g, " ")
  let decoded = normalized
  try {
    decoded = decodeURIComponent(normalized)
  } catch {
    // Um link incompleto pode conter "%" enquanto ainda está sendo colado.
  }
  const match =
    decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ??
    decoded.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ??
    decoded.match(/\/maps\/(?:search|place)\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ??
    decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  return Math.abs(latitude) <= 85.05112878 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function doorLine(room: MapRoom, door: NonNullable<MapRoom["doors"]>[number]) {
  if (door.side === "north" || door.side === "south") {
    const z = room.rect.z + (door.side === "south" ? room.rect.d : 0)
    return { x1: room.rect.x + door.at, y1: z, x2: room.rect.x + door.at + door.width, y2: z }
  }
  const x = room.rect.x + (door.side === "east" ? room.rect.w : 0)
  return { x1: x, y1: room.rect.z + door.at, x2: x, y2: room.rect.z + door.at + door.width }
}

function polygonsFromGeoFile(text: string, isKml: boolean): Array<Array<[number, number]>> {
  if (isKml) {
    const document = new DOMParser().parseFromString(text, "application/xml")
    return [...document.querySelectorAll("Polygon coordinates")]
      .map((node) =>
        (node.textContent ?? "")
          .trim()
          .split(/\s+/)
          .map((point) => point.split(",").slice(0, 2).map(Number) as [number, number])
          .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat)),
      )
      .filter((polygon) => polygon.length >= 3)
  }

  const geo = JSON.parse(text) as { type?: string; features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }> }
  const polygons: Array<Array<[number, number]>> = []
  for (const feature of geo.features ?? []) {
    const geometry = feature.geometry
    if (geometry?.type === "Polygon") {
      const ring = (geometry.coordinates as Array<Array<[number, number]>>)?.[0]
      if (ring?.length >= 3) polygons.push(ring)
    } else if (geometry?.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates as Array<Array<Array<[number, number]>>>) {
        if (polygon[0]?.length >= 3) polygons.push(polygon[0])
      }
    }
  }
  return polygons
}

function mapFromPolygons(polygons: Array<Array<[number, number]>>, scale: number, label: string): OfficeMap {
  const all = polygons.flat()
  if (all.length === 0) throw new Error("Nenhum polígono foi encontrado no arquivo.")
  const latitude = all.reduce((sum, point) => sum + point[1], 0) / all.length
  const longitude = all.reduce((sum, point) => sum + point[0], 0) / all.length
  const cos = Math.cos((latitude * Math.PI) / 180)
  const projected = polygons.map((polygon) =>
    polygon.map(([lng, lat]) => ({ x: (lng - longitude) * 111_320 * cos, z: (latitude - lat) * 110_540 })),
  )
  const points = projected.flat()
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minZ = Math.min(...points.map((point) => point.z))
  const maxZ = Math.max(...points.map((point) => point.z))
  const padding = 3
  const finishes = ["vinyl", "patternedCarpet", "parquet", "terrazzo"] as const
  const rooms = projected.map((polygon, index): MapRoom => {
    const left = Math.min(...polygon.map((point) => point.x))
    const right = Math.max(...polygon.map((point) => point.x))
    const top = Math.min(...polygon.map((point) => point.z))
    const bottom = Math.max(...polygon.map((point) => point.z))
    return {
      id: `area-${index + 1}`,
      name: `Área ${index + 1}`,
      rect: {
        x: snap((left - minX) * scale + padding),
        z: snap((top - minZ) * scale + padding),
        w: Math.max(2, snap((right - left) * scale)),
        d: Math.max(2, snap((bottom - top) * scale)),
      },
      kind: "sala",
      level: 0,
      floor: "#71889b",
      finish: finishes[index % finishes.length],
      light: ["#67e8f9", "#34d399", "#f59e0b", "#a78bfa"][index % 4],
      doors: [],
    }
  })
  const base = newMap()
  base.name = label || "Local importado"
  base.bounds = { x: 0, z: 0, w: Math.max(12, snap((maxX - minX) * scale + padding * 2)), d: Math.max(12, snap((maxZ - minZ) * scale + padding * 2)) }
  base.rooms = rooms
  base.props = []
  base.vents = []
  base.stairs = []
  base.source = { label, latitude, longitude, gameUnitsPerMeter: scale }
  return preparePlayable(base)
}

interface OsmElement {
  type: "way"
  id: number
  tags?: Record<string, string>
  geometry?: Array<{ lat: number; lon: number }>
}

interface OsmResponse {
  elements?: OsmElement[]
}

async function fetchOsmArea(bounds: GeoBounds): Promise<OsmElement[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const query = `[out:json][timeout:25];(
    way["building"](${bbox});
    way["leisure"~"^(swimming_pool|pitch|playground|garden|park)$"](${bbox});
    way["natural"="water"](${bbox});
    way["water"](${bbox});
    way["landuse"~"^(grass|recreation_ground|village_green)$"](${bbox});
    way["amenity"="parking"](${bbox});
    way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|footway|path)$"](${bbox});
  );out tags geom;`
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
  let lastError: unknown = null

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 32_000)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Serviço cartográfico respondeu ${response.status}.`)
      const payload = (await response.json()) as OsmResponse
      return (payload.elements ?? []).filter((item) => item.type === "way" && (item.geometry?.length ?? 0) >= 2)
    } catch (error) {
      lastError = error
    } finally {
      window.clearTimeout(timeout)
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Não foi possível consultar os dados desta área.")
}

function generatedBuildingProps(
  room: MapRoom,
  tags: Record<string, string>,
  index: number,
): OfficeMap["props"] {
  if (room.rect.w < 3.8 || room.rect.d < 3.4) return []
  const props: OfficeMap["props"] = []
  const put = (kind: string, xRatio: number, zRatio: number, rot = 0) => {
    props.push({
      kind,
      x: round2(room.rect.x + room.rect.w * xRatio),
      z: round2(room.rect.z + room.rect.d * zRatio),
      rot,
      level: room.level ?? 0,
    })
  }
  const use = `${tags.building ?? ""} ${tags.amenity ?? ""} ${tags.shop ?? ""} ${tags.office ?? ""}`
  const home = /house|residential|apartments|bungalow|detached/.test(use)
  const commercial = Boolean(tags.shop) || /commercial|retail|supermarket/.test(use)
  const institutional = /school|college|university|office|public|civic/.test(use)
  const roomy = room.rect.w >= 7 && room.rect.d >= 5.5

  if (home) {
    put("sofa", 0.34, 0.52, index % 2 ? Math.PI / 2 : 0)
    if (room.rect.w >= 5.5) put("kitchen", 0.69, 0.24, Math.PI)
    put("plant", 0.78, 0.72, index % 3)
  } else if (commercial) {
    put("counter", 0.5, 0.3, 0)
    if (roomy) put("shelf", 0.28, 0.7, Math.PI / 2)
    put("vending", 0.78, 0.7, Math.PI)
  } else if (institutional && roomy) {
    put("meetingTable", 0.5, 0.5, index % 2 ? Math.PI / 2 : 0)
    put("chair", 0.3, 0.5, Math.PI / 2)
    put("chair", 0.7, 0.5, -Math.PI / 2)
    put("whiteboard", 0.5, 0.18, 0)
  } else {
    put("desk", 0.42, 0.42, index % 2 ? Math.PI / 2 : 0)
    put("chair", 0.42, 0.67, Math.PI)
    put("monitor", 0.42, 0.4, index % 2 ? Math.PI / 2 : 0)
    if (roomy) put(index % 3 === 0 ? "rack" : "locker", 0.78, 0.7, Math.PI)
  }
  return props
}

function mapFromOsm(
  elements: OsmElement[],
  geoBounds: GeoBounds,
  requestedScale: number,
  referenceUrl: string,
): { map: OfficeMap; scale: number; counts: Record<string, number> } {
  const centerLatitude = (geoBounds.north + geoBounds.south) / 2
  const centerLongitude = (geoBounds.east + geoBounds.west) / 2
  const metersWide = Math.abs(geoBounds.east - geoBounds.west) * 111_320 * Math.cos((centerLatitude * Math.PI) / 180)
  const metersDeep = Math.abs(geoBounds.north - geoBounds.south) * 110_540
  const desiredScale = Number.isFinite(requestedScale) ? requestedScale : 0.7
  const scale = Math.max(0.05, Math.min(4, desiredScale, 242 / Math.max(metersWide, metersDeep)))
  const padding = 3
  const mapWidth = Math.max(12, snap(metersWide * scale + padding * 2))
  const mapDepth = Math.max(12, snap(metersDeep * scale + padding * 2))
  const project = ({ lat, lon }: { lat: number; lon: number }) => ({
    x: (lon - geoBounds.west) * 111_320 * Math.cos((centerLatitude * Math.PI) / 180) * scale + padding,
    z: (geoBounds.north - lat) * 110_540 * scale + padding,
  })
  const clipSegmentToMap = (from: { x: number; z: number }, to: { x: number; z: number }) => {
    const minX = padding
    const maxX = mapWidth - padding
    const minZ = padding
    const maxZ = mapDepth - padding
    const dx = to.x - from.x
    const dz = to.z - from.z
    let start = 0
    let end = 1
    const clip = (direction: number, distance: number) => {
      if (direction === 0) return distance >= 0
      const ratio = distance / direction
      if (direction < 0) {
        if (ratio > end) return false
        if (ratio > start) start = ratio
      } else {
        if (ratio < start) return false
        if (ratio < end) end = ratio
      }
      return true
    }
    if (
      !clip(-dx, from.x - minX) ||
      !clip(dx, maxX - from.x) ||
      !clip(-dz, from.z - minZ) ||
      !clip(dz, maxZ - from.z)
    ) return null
    return {
      from: { x: from.x + dx * start, z: from.z + dz * start },
      to: { x: from.x + dx * end, z: from.z + dz * end },
    }
  }
  const rectFrom = (points: Array<{ x: number; z: number }>, extra = 0) => {
    const left = Math.min(...points.map((point) => point.x)) - extra
    const right = Math.max(...points.map((point) => point.x)) + extra
    const top = Math.min(...points.map((point) => point.z)) - extra
    const bottom = Math.max(...points.map((point) => point.z)) + extra
    const x = Math.max(0, Math.min(mapWidth - 2, snap(left)))
    const z = Math.max(0, Math.min(mapDepth - 2, snap(top)))
    return {
      x,
      z,
      w: Math.max(2, Math.min(mapWidth - x, snap(Math.min(mapWidth, right) - x))),
      d: Math.max(2, Math.min(mapDepth - z, snap(Math.min(mapDepth, bottom) - z))),
    }
  }
  const room = (
    id: string,
    name: string,
    rect: MapRoom["rect"],
    kind: MapRoom["kind"],
    finish: NonNullable<MapRoom["finish"]>,
    floor: string,
    light: string,
    doors: MapRoom["doors"] = [],
  ): MapRoom => ({ id, name, rect, kind, level: 0, finish, floor, light, doors })

  const surfaces: MapRoom[] = []
  const waters: MapRoom[] = []
  const buildings: MapRoom[] = []
  const generatedProps: OfficeMap["props"] = []
  let pathParts = 0
  const counts = { construcoes: 0, agua: 0, campos: 0, caminhos: 0, mobiliario: 0, inferidos: 0 }

  for (const element of elements.slice(0, 240)) {
    const geometry = (element.geometry ?? []).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
    if (geometry.length < 2) continue
    const points = geometry.map(project)
    const tags = element.tags ?? {}
    const id = `osm-${element.id}`
    const featureCenter = geometry.reduce(
      (center, point) => ({ lat: center.lat + point.lat / geometry.length, lon: center.lon + point.lon / geometry.length }),
      { lat: 0, lon: 0 },
    )
    const centerInsideSelection =
      featureCenter.lat >= geoBounds.south &&
      featureCenter.lat <= geoBounds.north &&
      featureCenter.lon >= geoBounds.west &&
      featureCenter.lon <= geoBounds.east
    if (!tags.highway && !centerInsideSelection) continue

    if (tags.building) {
      if (buildings.length >= 32) continue
      const rect = rectFrom(points)
      const doorWidth = Math.min(2.8, Math.max(1.2, rect.w - 0.4))
      const buildingIndex = buildings.length
      const use = tags.building
      const home = ["house", "residential", "apartments", "bungalow", "detached"].includes(use)
      const names: Record<string, string> = {
        house: "Casa",
        residential: "Residência",
        apartments: "Edifício residencial",
        commercial: "Comércio",
        retail: "Loja",
        school: "Escola",
        warehouse: "Galpão",
        industrial: "Prédio industrial",
      }
      const finishes = home
        ? (["wood", "parquet", "patternedCarpet"] as const)
        : (["terrazzo", "vinyl", "concrete", "carpet"] as const)
      const floors = home
        ? ["#b57c56", "#b9936c", "#8e745f", "#c19a72"]
        : ["#788896", "#687b8d", "#8a8178", "#677984", "#81758d"]
      const lights = ["#ffd38a", "#8fe3ff", "#a7f3d0", "#f9a8d4", "#c4b5fd"]
      const building = room(
        id,
        tags.name || names[use] || "Construção",
        rect,
        "sala",
        finishes[buildingIndex % finishes.length],
        floors[buildingIndex % floors.length],
        lights[buildingIndex % lights.length],
        [{ side: "south", at: Math.max(0, (rect.w - doorWidth) / 2), width: doorWidth }],
      )
      buildings.push(building)
      generatedProps.push(...generatedBuildingProps(building, tags, buildingIndex))
      counts.construcoes += 1
      continue
    }

    if (tags.leisure === "swimming_pool" || tags.natural === "water" || tags.water) {
      if (waters.length >= 12) continue
      waters.push(room(id, tags.name || "Piscina/água", rectFrom(points), "agua", "water", "#21b6d0", "#8cf3ff"))
      counts.agua += 1
      continue
    }

    if (tags.leisure === "pitch") {
      surfaces.push(room(id, tags.name || "Campo/quadra", rectFrom(points), "campo", "sport", "#3f8f91", "#d7fff7"))
      counts.campos += 1
      continue
    }

    if (["grass", "recreation_ground", "village_green"].includes(tags.landuse) || ["garden", "park", "playground"].includes(tags.leisure)) {
      surfaces.push(room(id, tags.name || "Área verde", rectFrom(points), "campo", "grass", "#57924d", "#dfffcf"))
      counts.campos += 1
      continue
    }

    if (tags.amenity === "parking") {
      const parking = room(id, tags.name || "Estacionamento", rectFrom(points), "externa", "concrete", "#505861", "#dce7ee")
      surfaces.push(parking)
      if (parking.rect.w >= 8 && parking.rect.d >= 7) {
        const cars = Math.min(4, Math.max(1, Math.floor(parking.rect.w / 7)))
        for (let car = 0; car < cars; car += 1) {
          generatedProps.push({
            kind: "car",
            x: round2(parking.rect.x + ((car + 1) * parking.rect.w) / (cars + 1)),
            z: round2(parking.rect.z + parking.rect.d * 0.52),
            rot: car % 2 ? 0 : Math.PI,
            level: 0,
          })
        }
      }
      continue
    }

    if (tags.highway && pathParts < 30) {
      const walking = ["footway", "path", "pedestrian"].includes(tags.highway)
      const lanes = Math.max(1, Number(tags.lanes) || 1)
      const meters = Number(tags.width) || (walking ? 1.8 : tags.highway === "service" ? 4 : Math.min(8, lanes * 3.1 + 1.2))
      const thickness = Math.max(walking ? 1.2 : 2.8, meters * scale)
      for (let index = 1; index < points.length && pathParts < 30; index += 1) {
        const clipped = clipSegmentToMap(points[index - 1], points[index])
        if (!clipped) continue
        const { from, to } = clipped
        const length = Math.hypot(to.x - from.x, to.z - from.z)
        if (length < 0.15) continue
        const steps = Math.max(1, Math.ceil(length / Math.max(1.8, thickness * 0.7)))
        for (let step = 0; step < steps && pathParts < 30; step += 1) {
          const ratio = (step + 0.5) / steps
          const x = from.x + (to.x - from.x) * ratio
          const z = from.z + (to.z - from.z) * ratio
          const rect = rectFrom([
            { x: x - thickness / 2, z: z - thickness / 2 },
            { x: x + thickness / 2, z: z + thickness / 2 },
          ])
          surfaces.push(room(
            `${id}-${index}-${step}`,
            tags.name || (walking ? "Caminho" : "Rua"),
            rect,
            "externa",
            walking ? "concrete" : "asphalt",
            walking ? "#777d80" : "#252a31",
            walking ? "#e8f0f4" : "#9da8b4",
          ))
          pathParts += 1
          counts.caminhos += 1
        }
      }
    }
  }

  const innerW = Math.max(6, mapWidth - padding * 2)
  const innerD = Math.max(6, mapDepth - padding * 2)
  const roadDepth = Math.max(3, Math.min(5.5, innerD * 0.1))
  const roadZ = [0.5, 0.82, 0.18]
    .map((ratio) => padding + innerD * ratio - roadDepth / 2)
    .map((z) => ({
      z,
      occupied: [...buildings, ...waters].reduce((area, existing) => {
        const top = Math.max(z, existing.rect.z)
        const bottom = Math.min(z + roadDepth, existing.rect.z + existing.rect.d)
        return area + Math.max(0, bottom - top) * existing.rect.w
      }, 0),
    }))
    .sort((left, right) => left.occupied - right.occupied)[0].z
  if (pathParts === 0 && mapWidth >= 28 && mapDepth >= 22) {
    surfaces.push(room(
      "inferred-road-main",
      "Rua de acesso",
      { x: padding, z: roadZ, w: innerW, d: roadDepth },
      "externa",
      "asphalt",
      "#252a31",
      "#aab4bf",
    ))
    counts.caminhos += 1
    counts.inferidos += 1
  }

  const targetBuildings = innerW * innerD >= 2_200 ? 6 : innerW * innerD >= 1_100 ? 5 : innerW * innerD >= 600 ? 4 : 3
  const sparseCartography = buildings.length < Math.min(3, targetBuildings)
  if (sparseCartography) {
    type PlannedRect = { x: number; z: number; w: number; d: number }
    const plannedRect = (x: number, z: number, w: number, d: number): PlannedRect => ({
      x: round2(padding + innerW * x),
      z: round2(padding + innerD * z),
      w: round2(Math.max(3.8, Math.min(innerW * w, innerW * (1 - x)))),
      d: round2(Math.max(3.4, Math.min(innerD * d, innerD * (1 - z)))),
    })
    const overlaps = (candidate: PlannedRect, existing: MapRoom, margin = 0.75) =>
      candidate.x < existing.rect.x + existing.rect.w + margin &&
      candidate.x + candidate.w > existing.rect.x - margin &&
      candidate.z < existing.rect.z + existing.rect.d + margin &&
      candidate.z + candidate.d > existing.rect.z - margin
    const fits = (candidate: PlannedRect, margin = 0.75) =>
      candidate.x >= padding &&
      candidate.z >= padding &&
      candidate.x + candidate.w <= mapWidth - padding &&
      candidate.z + candidate.d <= mapDepth - padding &&
      ![...buildings, ...waters, ...surfaces.filter((surface) => surface.finish !== "grass")].some((existing) =>
        overlaps(candidate, existing, margin),
      )
    const addArea = (candidate: PlannedRect, type: "pool" | "field") => {
      if (!fits(candidate, 1)) return false
      if (type === "pool") {
        waters.push(room("inferred-pool", "Piscina", candidate, "agua", "water", "#21b6d0", "#8cf3ff"))
        counts.agua += 1
      } else {
        surfaces.push(room("inferred-field", "Quadra esportiva", candidate, "campo", "sport", "#3f8f91", "#d7fff7"))
        counts.campos += 1
      }
      counts.inferidos += 1
      return true
    }
    const tryAreaCandidates = (type: "pool" | "field", candidates: PlannedRect[]) => {
      for (const candidate of candidates) {
        if (addArea(candidate, type)) return true
      }
      return false
    }

    if (waters.length === 0 && innerW >= 28 && innerD >= 22) {
      tryAreaCandidates("pool", [
        plannedRect(0.08, 0.66, 0.18, 0.2),
        plannedRect(0.73, 0.65, 0.18, 0.2),
        plannedRect(0.08, 0.16, 0.17, 0.18),
      ])
    }
    if (!surfaces.some((surface) => surface.kind === "campo") && innerW >= 34 && innerD >= 25) {
      tryAreaCandidates("field", [
        plannedRect(0.38, 0.64, 0.24, 0.23),
        plannedRect(0.4, 0.12, 0.22, 0.22),
        plannedRect(0.68, 0.64, 0.23, 0.22),
      ])
    }

    const addBuilding = (name: string, rect: PlannedRect, tags: Record<string, string>) => {
      if (!fits(rect)) return false
      const index = buildings.length
      const doorWidth = Math.min(2.8, Math.max(1.4, rect.w * 0.22))
      const building = room(
        `inferred-building-${index + 1}`,
        name,
        rect,
        "sala",
        index % 3 === 0 ? "wood" : index % 3 === 1 ? "terrazzo" : "vinyl",
        ["#b88761", "#73899b", "#8b796d", "#697d72"][index % 4],
        ["#ffd38a", "#8fe3ff", "#a7f3d0", "#f9a8d4"][index % 4],
        [{ side: "south", at: Math.max(0, (rect.w - doorWidth) / 2), width: doorWidth }],
      )
      buildings.push(building)
      generatedProps.push(...generatedBuildingProps(building, tags, index))
      counts.construcoes += 1
      counts.inferidos += 1
      return true
    }

    const buildingPlans: Array<{ name: string; rect: PlannedRect; tags: Record<string, string> }> = [
      { name: "Casa principal", rect: plannedRect(0.08, 0.08, 0.24, 0.2), tags: { building: "house" } },
      { name: "Salão principal", rect: plannedRect(0.38, 0.08, 0.25, 0.17), tags: { building: "commercial" } },
      { name: "Administração", rect: plannedRect(0.72, 0.09, 0.2, 0.2), tags: { building: "office", office: "yes" } },
      { name: "Casa de hóspedes", rect: plannedRect(0.08, 0.57, 0.2, 0.19), tags: { building: "house" } },
      { name: "Área de apoio", rect: plannedRect(0.7, 0.57, 0.22, 0.18), tags: { building: "warehouse" } },
      { name: "Quiosque", rect: plannedRect(0.31, 0.7, 0.13, 0.14), tags: { building: "retail" } },
      { name: "Vestiário", rect: plannedRect(0.57, 0.7, 0.12, 0.15), tags: { building: "commercial" } },
      { name: "Portaria", rect: plannedRect(0.8, 0.38, 0.1, 0.12), tags: { building: "commercial" } },
      { name: "Depósito", rect: plannedRect(0.28, 0.31, 0.13, 0.13), tags: { building: "warehouse" } },
    ]
    for (const plan of buildingPlans) {
      if (buildings.length >= targetBuildings) break
      addBuilding(plan.name, plan.rect, plan.tags)
    }

    const vehicleRoads = surfaces.filter((surface) => surface.finish === "asphalt")
    if (innerW >= 38 && vehicleRoads.length > 0) {
      const carSpots = vehicleRoads.filter((_, index) => index % Math.max(1, Math.floor(vehicleRoads.length / 2)) === 0).slice(0, 2)
      for (const [index, road] of carSpots.entries()) {
        generatedProps.push({
          kind: "car",
          x: round2(road.rect.x + road.rect.w / 2),
          z: round2(road.rect.z + road.rect.d / 2),
          rot: road.rect.w >= road.rect.d ? Math.PI / 2 : 0,
          level: 0,
        })
        if (index === 0) {
          generatedProps.push({
            kind: "cone",
            x: round2(road.rect.x + road.rect.w * 0.25),
            z: round2(road.rect.z + road.rect.d * 0.25),
            rot: 0,
            level: 0,
          })
        }
      }
    }
  }

  const protectedRooms = [...buildings, ...waters, ...surfaces.filter((surface) => surface.kind === "campo")]
  const freeOutdoorPoint = (x: number, z: number, margin = 0.8) =>
    x >= padding + margin &&
    x <= mapWidth - padding - margin &&
    z >= padding + margin &&
    z <= mapDepth - padding - margin &&
    !protectedRooms.some((area) =>
      x >= area.rect.x - margin &&
      x <= area.rect.x + area.rect.w + margin &&
      z >= area.rect.z - margin &&
      z <= area.rect.z + area.rect.d + margin,
    )

  const landscapeCandidates = Array.from({ length: Math.min(14, Math.max(6, Math.floor(mapWidth / 18))) }, (_, index) => ({
    x: padding + ((index + 1) * (mapWidth - padding * 2)) / (Math.min(14, Math.max(6, Math.floor(mapWidth / 18))) + 1),
    z: index % 2 === 0 ? padding + 1.3 : mapDepth - padding - 1.3,
  }))
  for (const [index, point] of landscapeCandidates.entries()) {
    if (!freeOutdoorPoint(point.x, point.z, 1.1)) continue
    generatedProps.push({ kind: "tree", x: round2(point.x), z: round2(point.z), rot: index * 0.7, level: 0 })
  }

  const roadSurfaces = surfaces.filter((surface) => surface.finish === "asphalt")
  for (const [index, road] of roadSurfaces.filter((_, roadIndex) => roadIndex % 5 === 0).slice(0, 12).entries()) {
    const x = road.rect.x + road.rect.w + 0.75
    const z = road.rect.z + road.rect.d / 2
    if (!freeOutdoorPoint(x, z, 0.3)) continue
    generatedProps.push({ kind: "streetLamp", x: round2(x), z: round2(z), rot: index % 2 ? Math.PI : 0, level: 0 })
  }

  for (const [index, area] of [...waters, ...surfaces.filter((surface) => surface.kind === "campo")].slice(0, 8).entries()) {
    const candidates = [
      { x: area.rect.x - 1.3, z: area.rect.z + area.rect.d / 2, rot: Math.PI / 2 },
      { x: area.rect.x + area.rect.w + 1.3, z: area.rect.z + area.rect.d / 2, rot: -Math.PI / 2 },
    ]
    const spot = candidates.find((candidate) => freeOutdoorPoint(candidate.x, candidate.z, 0.35))
    if (spot) generatedProps.push({ kind: "bench", x: round2(spot.x), z: round2(spot.z), rot: spot.rot + index * 0.01, level: 0 })
  }

  const base = newMap()
  base.name = `Local real ${centerLatitude.toFixed(5)}, ${centerLongitude.toFixed(5)}`
  base.bounds = { x: 0, z: 0, w: mapWidth, d: mapDepth }
  base.rooms = [
    room("area-externa", "Área externa", { x: padding, z: padding, w: mapWidth - padding * 2, d: mapDepth - padding * 2 }, "externa", "grass", "#528d4c", "#d8f6cf"),
    ...surfaces.slice(0, 30),
    ...waters,
    ...buildings,
  ].slice(0, 78)
  base.props = generatedProps.slice(0, 220)
  counts.mobiliario = base.props.length
  base.vents = []
  base.stairs = []
  base.source = {
    label: sparseCartography
      ? "Área baseada em dados cartográficos do OpenStreetMap com detalhes ausentes completados automaticamente"
      : "Área gerada de dados cartográficos do OpenStreetMap",
    referenceUrl,
    latitude: centerLatitude,
    longitude: centerLongitude,
    gameUnitsPerMeter: scale,
  }
  return { map: preparePlayable(base), scale, counts }
}

const inputClass = "h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white outline-none transition focus:border-cyan-400/50"
const labelClass = "space-y-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500"

export default function GameMapEditorPage() {
  const [map, setMap] = useState<OfficeMap | null>(null)
  const [mapCatalog, setMapCatalog] = useState<GameMapSummary[]>([])
  const [activeMapId, setActiveMapId] = useState<string | null>("original")
  const [level, setLevel] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingArea, setGeneratingArea] = useState(false)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceOpacity, setReferenceOpacity] = useState(0.45)
  const [realScale, setRealScale] = useState(0.7)
  const [referenceUrl, setReferenceUrl] = useState("")
  const [generationSummary, setGenerationSummary] = useState<string | null>(null)
  const [rawJson, setRawJson] = useState("")
  const [planView, setPlanView] = useState<OfficeMap["bounds"] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<DragState | null>(null)
  const planPan = useRef<ViewPanState | null>(null)

  useEffect(() => {
    void Promise.all([listAdminOfficeMaps(), getAdminOfficeMap("original")])
      .then(([catalog, entry]) => {
        setMapCatalog(catalog.maps)
        setMap(entry.map)
        setReferenceUrl(entry.map.source?.referenceUrl ?? "")
      })
      .catch((error) => toast.error("Não deu para abrir o criador", { description: error instanceof Error ? error.message : undefined }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!map || loading) return
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(map))
    } catch {
      // Navegadores restritos podem bloquear armazenamento local; o editor
      // continua funcionando e a publicação segue disponível.
    }
  }, [loading, map])

  useEffect(() => () => {
    if (referenceImage) URL.revokeObjectURL(referenceImage)
  }, [referenceImage])

  const rooms = useMemo(() => map?.rooms.filter((room) => (room.level ?? 0) === level) ?? [], [level, map])
  const selected = map?.rooms.find((room) => room.id === selectedId) ?? null
  const selectedTask = map?.taskSpots.find((task) => task.id === selectedTaskId) ?? null
  const tasksOnLevel = map?.taskSpots.filter((task) => (task.level ?? 0) === level) ?? []
  const effectivePlantView = map ? clampView(planView ?? map.bounds, map.bounds) : null
  const referenceCoordinates = useMemo(
    () =>
      coordinatesFromGoogleUrl(referenceUrl) ?? {
        latitude: map?.source?.latitude ?? -12.597991,
        longitude: map?.source?.longitude ?? -38.961055,
      },
    [map?.source?.latitude, map?.source?.longitude, referenceUrl],
  )

  const openStoredMap = async (mapId: string) => {
    setLoading(true)
    try {
      const entry = await getAdminOfficeMap(mapId)
      setMap(entry.map)
      setActiveMapId(entry.id)
      setReferenceUrl(entry.map.source?.referenceUrl ?? "")
      setPlanView(null)
      setSelectedId(null)
      setSelectedTaskId(null)
    } catch (error) {
      toast.error("Não deu para abrir o mapa", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshMapCatalog = async () => {
    const catalog = await listAdminOfficeMaps()
    setMapCatalog(catalog.maps)
  }

  const startNewMap = (source?: OfficeMap) => {
    const next = source ? cloneMap(source) : newMap()
    if (source) next.name = `Cópia de ${source.name}`.slice(0, 64)
    setMap(next)
    setActiveMapId(null)
    setReferenceUrl(next.source?.referenceUrl ?? "")
    setPlanView(null)
    setSelectedId(null)
    setSelectedTaskId(null)
  }

  const removeActiveMap = async () => {
    if (!activeMapId || activeMapId === "original") return
    if (!window.confirm("Remover este mapa da biblioteca? As salas já abertas precisam ser fechadas antes.")) return
    try {
      await deleteAdminOfficeMap(activeMapId)
      await refreshMapCatalog()
      await openStoredMap("original")
      toast.success("Mapa removido")
    } catch (error) {
      toast.error("Não deu para remover o mapa", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const updateMap = (recipe: (next: OfficeMap) => void) => {
    setMap((current) => {
      if (!current) return current
      const next = cloneMap(current)
      recipe(next)
      return next
    })
  }

  const updateRoom = (changes: Partial<MapRoom>) => {
    if (!selectedId) return
    updateMap((next) => {
      const index = next.rooms.findIndex((room) => room.id === selectedId)
      if (index >= 0) next.rooms[index] = { ...next.rooms[index], ...changes }
    })
  }

  const pointer = (event: { clientX: number; clientY: number }) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return { x: 0, z: 0 }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    return { x: local.x, z: local.y }
  }

  const zoomPlant = (factor: number, anchor?: { x: number; z: number }) => {
    if (!map || !effectivePlantView) return
    const current = effectivePlantView
    const center = anchor ?? { x: current.x + current.w / 2, z: current.z + current.d / 2 }
    const ratioX = Math.max(0, Math.min(1, (center.x - current.x) / current.w))
    const ratioZ = Math.max(0, Math.min(1, (center.z - current.z) / current.d))
    const w = Math.max(18, Math.min(map.bounds.w, current.w * factor))
    const d = Math.max(14, Math.min(map.bounds.d, current.d * factor))
    setPlanView(clampView({ x: center.x - w * ratioX, z: center.z - d * ratioZ, w, d }, map.bounds))
  }

  const focusPlant = (x: number, z: number) => {
    if (!map) return
    const w = Math.min(map.bounds.w, Math.max(24, Math.min(56, map.bounds.w * 0.26)))
    const d = Math.min(map.bounds.d, Math.max(18, Math.min(38, map.bounds.d * 0.26)))
    setPlanView(clampView({ x: x - w / 2, z: z - d / 2, w, d }, map.bounds))
  }

  const beginPlantPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if ((event.shiftKey || event.button === 1) && effectivePlantView) {
      const matrix = svgRef.current?.getScreenCTM()
      const pixelsPerUnitX = matrix ? Math.hypot(matrix.a, matrix.b) : 0
      const pixelsPerUnitZ = matrix ? Math.hypot(matrix.c, matrix.d) : 0
      planPan.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        view: { ...effectivePlantView },
        unitsPerPixelX: pixelsPerUnitX > 0 ? 1 / pixelsPerUnitX : effectivePlantView.w / Math.max(1, svgRef.current?.clientWidth ?? 1),
        unitsPerPixelZ: pixelsPerUnitZ > 0 ? 1 / pixelsPerUnitZ : effectivePlantView.d / Math.max(1, svgRef.current?.clientHeight ?? 1),
      }
      svgRef.current?.setPointerCapture(event.pointerId)
      event.preventDefault()
      return
    }
    setSelectedId(null)
    setSelectedTaskId(null)
  }

  const beginDrag = (event: React.PointerEvent<SVGElement>, room: MapRoom, mode: DragState["mode"]) => {
    event.stopPropagation()
    setSelectedId(room.id)
    setSelectedTaskId(null)
    const canvasEvent = event as unknown as React.PointerEvent<SVGSVGElement>
    const start = pointer(canvasEvent)
    drag.current = { id: room.id, mode, startX: start.x, startZ: start.z, room: { ...room.rect } }
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (planPan.current && map) {
      const pan = planPan.current
      setPlanView(clampView({
        ...pan.view,
        x: pan.view.x - (event.clientX - pan.clientX) * pan.unitsPerPixelX,
        z: pan.view.z - (event.clientY - pan.clientY) * pan.unitsPerPixelZ,
      }, map.bounds))
      return
    }
    if (!drag.current || !map) return
    const current = pointer(event)
    const dx = current.x - drag.current.startX
    const dz = current.z - drag.current.startZ
    const original = drag.current.room
    const bounds = map.bounds
    updateMap((next) => {
      const room = next.rooms.find((candidate) => candidate.id === drag.current?.id)
      if (!room || !drag.current) return
      if (drag.current.mode === "move") {
        room.rect.x = snap(Math.min(Math.max(original.x + dx, bounds.x), bounds.x + bounds.w - original.w))
        room.rect.z = snap(Math.min(Math.max(original.z + dz, bounds.z), bounds.z + bounds.d - original.d))
      } else {
        room.rect.w = snap(Math.max(2, Math.min(original.w + dx, bounds.x + bounds.w - original.x)))
        room.rect.d = snap(Math.max(2, Math.min(original.d + dz, bounds.z + bounds.d - original.z)))
      }
    })
  }

  const endPlantPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    drag.current = null
    planPan.current = null
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId)
  }

  const addRoom = () => {
    if (!map) return
    const id = uniqueRoomId(map, "nova-sala")
    updateMap((next) => next.rooms.push({
      id,
      name: "Nova sala",
      rect: { x: next.bounds.x + 3, z: next.bounds.z + 3, w: 12, d: 9 },
      kind: "sala",
      level,
      floor: "#71889b",
      finish: "vinyl",
      light: "#67e8f9",
      doors: [],
    }))
    setSelectedId(id)
    setSelectedTaskId(null)
  }

  const updateTask = (changes: Partial<MapTaskSpot>) => {
    if (!selectedTaskId) return
    updateMap((next) => {
      const index = next.taskSpots.findIndex((task) => task.id === selectedTaskId)
      if (index >= 0) next.taskSpots[index] = { ...next.taskSpots[index], ...changes }
    })
  }

  const addTask = () => {
    if (!map) return
    const available = playableRooms(map).filter((room) => (room.level ?? 0) === level)
    const room = (selected && available.some((candidate) => candidate.id === selected.id) ? selected : available[0])
    if (!room) return toast.error("Adicione uma área jogável neste andar primeiro.")
    const used = new Set(map.taskSpots.map((task) => task.id))
    let number = map.taskSpots.length + 1
    while (used.has(`tarefa-${number}`)) number += 1
    const id = `tarefa-${number}`
    const point = safePoint(map, room)
    updateMap((next) => next.taskSpots.push({
      id,
      kind: "cabos",
      room: room.id,
      label: `Tarefa em ${room.name}`,
      x: point.x,
      z: point.z,
      level: room.level ?? 0,
    }))
    setSelectedTaskId(id)
    setSelectedId(null)
    focusPlant(point.x, point.z)
  }

  const moveTaskToRoom = (roomId: string) => {
    if (!map) return
    const room = map.rooms.find((candidate) => candidate.id === roomId)
    if (!room) return
    const point = safePoint(map, room)
    updateTask({ room: room.id, x: point.x, z: point.z, level: room.level ?? 0 })
    setLevel(room.level ?? 0)
    focusPlant(point.x, point.z)
  }

  const duplicateRoom = () => {
    if (!selected || !map) return
    const id = uniqueRoomId(map, selected.id)
    const copy = structuredClone(selected)
    copy.id = id
    copy.name = `${selected.name} cópia`
    copy.rect.x += 2
    copy.rect.z += 2
    updateMap((next) => next.rooms.push(copy))
    setSelectedId(id)
  }

  const addStair = () => {
    const room = selected && (selected.level ?? 0) === 0 ? selected : rooms.find((candidate) => candidate.kind !== "terraco")
    if (!room) return toast.error("Selecione uma sala do primeiro andar.")
    const x = snap(room.rect.x + room.rect.w / 2)
    const z = snap(room.rect.z + room.rect.d / 2)
    updateMap((next) => next.stairs.push({
      id: `escada-${next.stairs.length + 1}`,
      level: 0,
      x,
      z: snap(Math.max(next.bounds.z + 2, z - 3)),
      rot: 0,
      targetLevel: 1,
      targetX: x,
      targetZ: snap(Math.min(next.bounds.z + next.bounds.d - 2, z + 3)),
    }))
    toast.success("Escada adicionada", { description: "Ajuste fino pelo editor JSON se precisar mudar a direção." })
  }

  const furnishRoom = () => {
    if (!selected) return
    const centerX = selected.rect.x + selected.rect.w / 2
    const centerZ = selected.rect.z + selected.rect.d / 2
    const level = selected.level ?? 0
    const kind = selected.finish === "server" ? "rack" : selected.finish === "pantry" ? "kitchen" : selected.rect.w >= 12 && selected.rect.d >= 9 ? "meetingTable" : "sofa"
    updateMap((next) => {
      next.props.push({ kind, x: snap(centerX), z: snap(centerZ), rot: 0, level })
      if (kind !== "rack" && kind !== "kitchen") next.props.push({ kind: "plant", x: snap(selected.rect.x + 1.5), z: snap(selected.rect.z + 1.5), rot: 0, level })
    })
  }

  const publish = async () => {
    if (!map) return
    setSaving(true)
    try {
      const repaired = repairPlayable(map)
      setMap(repaired)
      const result = activeMapId && activeMapId !== "original"
        ? await updateAdminOfficeMap(activeMapId, repaired)
        : await createAdminOfficeMap(repaired)
      setMap(result.map)
      setActiveMapId(result.id)
      await refreshMapCatalog()
      toast.success(activeMapId && activeMapId !== "original" ? "Mapa atualizado" : "Mapa criado", {
        description: "Ele já pode ser escolhido ao criar uma sala.",
      })
    } catch (error) {
      toast.error("O mapa não foi publicado", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const exportMap = () => {
    if (!map) return
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${slug(map.name)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importMapFile = async (file?: File) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error("O mapa JSON pode ter no máximo 2 MB.")
    try {
      const imported = JSON.parse(await file.text()) as OfficeMap
      setMap(imported)
      setActiveMapId(null)
      setSelectedId(null)
      setSelectedTaskId(null)
      setPlanView(null)
      toast.success("Arquivo carregado", { description: "Revise e publique quando estiver pronto." })
    } catch {
      toast.error("Esse arquivo não contém um mapa JSON válido.")
    }
  }

  const importGeoFile = async (file?: File) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error("O arquivo geográfico pode ter no máximo 2 MB.")
    try {
      const polygons = polygonsFromGeoFile(await file.text(), file.name.toLowerCase().endsWith(".kml"))
      const imported = mapFromPolygons(polygons, realScale, map?.source?.label ?? "Local importado")
      setMap(imported)
      setActiveMapId(null)
      setSelectedId(null)
      setSelectedTaskId(null)
      setPlanView(null)
      toast.success("Contorno convertido", { description: `${polygons.length} área(s) em escala de jogo.` })
    } catch (error) {
      toast.error("Não deu para importar a geometria", { description: error instanceof Error ? error.message : undefined })
    }
  }

  const generateRealArea = async (bounds: GeoBounds) => {
    setGeneratingArea(true)
    try {
      let elements: OsmElement[] = []
      let usedProceduralFallback = false
      try {
        elements = await fetchOsmArea(bounds)
      } catch {
        usedProceduralFallback = true
      }
      const generated = mapFromOsm(elements, bounds, realScale, safeHttpsUrl(referenceUrl) ?? "https://www.openstreetmap.org")
      setMap(repairPlayable(generated.map))
      setActiveMapId(null)
      setLevel(0)
      setSelectedId(null)
      setSelectedTaskId(null)
      setPlanView(null)
      const total = Object.values(generated.counts).reduce((sum, value) => sum + value, 0)
      const summary = total > 0
        ? `${generated.counts.construcoes} construções · ${generated.counts.agua} áreas de água · ${generated.counts.campos} campos · ${generated.counts.caminhos} trechos de rua · ${generated.counts.mobiliario} objetos${generated.counts.inferidos > 0 ? ` · ${generated.counts.inferidos} elementos completados automaticamente` : ""}`
        : "Nenhum objeto cartográfico encontrado; foi criado um terreno externo editável."
      setGenerationSummary(summary)
      toast.success("Cenário real gerado", {
        description:
          total > 0
            ? `${summary}. Escala ${generated.scale.toFixed(2)}x.${usedProceduralFallback ? " O serviço cartográfico não respondeu, então o cenário foi completado automaticamente." : ""}`
            : summary,
      })
    } catch (error) {
      toast.error("Não deu para gerar o cenário", {
        description: error instanceof Error ? error.message : "Tente selecionar uma área menor.",
      })
    } finally {
      setGeneratingArea(false)
    }
  }

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Spinner className="size-6 text-cyan-400" /></div>
  if (!map) return <InlineNotice tone="danger">Você não tem acesso ao criador ou a API não respondeu.</InlineNotice>
  const plantView = effectivePlantView ?? map.bounds
  const plantZoom = Math.max(map.bounds.w / plantView.w, map.bounds.d / plantView.d)
  const markerScale = Math.max(0.5, Math.min(2.2, Math.max(plantView.w, plantView.d) / 70))
  const compactGeneratedMap = map.bounds.w > 120 || map.rooms.length > 36
  const showPlantDetails = plantZoom >= (compactGeneratedMap ? 1.65 : 1)
  const availableTaskRooms = playableRooms(map)
  const activeCatalogEntry = mapCatalog.find((entry) => entry.id === activeMapId)
  const savesExistingMap = Boolean(activeMapId && activeMapId !== "original")

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Jogos"
        title="Criador de mapas"
        subtitle="Desenhe os dois andares, ajuste a escala e publique a mesma geometria usada pela visão e pelas colisões."
        icon={MapIcon}
        accent="cyan"
        actions={
          <>
            <Button variant="outline" onClick={exportMap}><Download className="mr-1.5 h-4 w-4" />Exportar</Button>
            <Button onClick={() => void publish()} disabled={saving} className="bg-cyan-500 text-black hover:bg-cyan-400">
              {saving ? <Spinner className="mr-1.5 size-4" /> : <Save className="mr-1.5 h-4 w-4" />}
              {savesExistingMap ? "Salvar mapa" : activeMapId === "original" ? "Criar cópia" : "Criar mapa"}
            </Button>
          </>
        }
      />

      <SectionCard
        icon={MapIcon}
        title="Biblioteca de mapas"
        description="O original fica sempre disponível. Mapas personalizados podem ser usados por salas diferentes."
        accent="cyan"
        bodyClassName="space-y-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className={`${labelClass} min-w-0 flex-1`}>
            Mapa aberto
            <select
              className={inputClass}
              value={activeMapId ?? "draft"}
              onChange={(event) => {
                if (event.target.value !== "draft") void openStoredMap(event.target.value)
              }}
            >
              {!activeMapId && <option value="draft">Novo mapa ainda não salvo</option>}
              {mapCatalog.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}{entry.original ? " (original fixo)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => startNewMap()}>
              <Plus className="mr-1.5 h-4 w-4" />Novo
            </Button>
            <Button variant="outline" onClick={() => startNewMap(map)}>
              <WandSparkles className="mr-1.5 h-4 w-4" />Duplicar
            </Button>
            {savesExistingMap && (
              <Button variant="outline" className="border-red-400/20 text-red-300" onClick={() => void removeActiveMap()}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-500">
          {activeCatalogEntry?.original
            ? "Você pode testar e alterar esta cópia na tela. Ao salvar, um novo mapa será criado e o original continuará intacto."
            : savesExistingMap
              ? "Salvar atualiza somente este mapa. Salas que usam outros mapas não são afetadas."
              : "Defina o nome e salve para adicionar este mapa à biblioteca."}
        </p>
      </SectionCard>

      <AdminMetrics items={[
        { label: "Salas", value: map.rooms.length, icon: Box, accent: "cyan" },
        { label: "Andares", value: map.rooms.some((room) => room.level === 1) ? 2 : 1, icon: Grid3X3, accent: "violet" },
        { label: "Tarefas", value: map.taskSpots.length, icon: WandSparkles, accent: "amber" },
        { label: "Escala", value: `${map.source?.gameUnitsPerMeter ?? 1}x`, icon: MapPinned, accent: "emerald" },
      ]} />

      <InlineNotice tone="info">
        Cada sala mantém o mapa escolhido quando foi criada. Um mapa personalizado só fica bloqueado para edição enquanto estiver sendo usado por uma sala aberta.
      </InlineNotice>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard icon={Grid3X3} title="Planta jogável" description="Use a roda para aproximar e Shift + arrastar para percorrer mapas grandes." accent="cyan" bodyClassName="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
              {[0, 1].map((floor) => <button key={floor} type="button" onClick={() => setLevel(floor)} className={`rounded-md px-3 py-1.5 text-[11px] font-black ${level === floor ? "bg-cyan-400 text-black" : "text-gray-500 hover:text-white"}`}>Andar {floor + 1}</button>)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={addRoom}><Plus className="mr-1 h-3.5 w-3.5" />Nova sala</Button>
              <Button size="sm" variant="outline" onClick={addStair}><Plus className="mr-1 h-3.5 w-3.5" />Escada</Button>
              <Button size="sm" variant="outline" onClick={() => { setMap(repairPlayable(map)); toast.success("Marcadores conferidos") }}><WandSparkles className="mr-1 h-3.5 w-3.5" />Conferir pontos</Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#091018]">
            <svg
              ref={svgRef}
              viewBox={`${plantView.x} ${plantView.z} ${plantView.w} ${plantView.d}`}
              className="aspect-[4/3] w-full touch-none select-none cursor-crosshair"
              onPointerMove={moveDrag}
              onPointerUp={endPlantPointer}
              onPointerCancel={endPlantPointer}
              onPointerDown={beginPlantPointer}
              onWheel={(event) => {
                event.preventDefault()
                zoomPlant(event.deltaY < 0 ? 0.72 : 1.38, pointer(event))
              }}
            >
              <defs><pattern id="grid" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M 2 0 L 0 0 0 2" fill="none" stroke="#7dd3fc" strokeOpacity="0.08" strokeWidth="0.08" /></pattern></defs>
              {referenceImage && <image href={referenceImage} x={map.bounds.x} y={map.bounds.z} width={map.bounds.w} height={map.bounds.d} opacity={referenceOpacity} preserveAspectRatio="none" />}
              <rect x={map.bounds.x} y={map.bounds.z} width={map.bounds.w} height={map.bounds.d} fill="url(#grid)" />
              {rooms.map((room) => {
                const active = selectedId === room.id
                const finish = room.finish ?? "terrazzo"
                const previewFill = room.finish === "asphalt" ? room.floor : ROOM_COLORS[finish]
                const showRoomName = active || (showPlantDetails && room.kind !== "externa") || (
                  room.kind === "sala"
                  && room.rect.w >= map.bounds.w * 0.1
                  && room.rect.d >= map.bounds.d * 0.1
                )
                return <g key={room.id} onPointerDown={(event) => beginDrag(event, room, "move")} className="cursor-move">
                  <rect x={room.rect.x} y={room.rect.z} width={room.rect.w} height={room.rect.d} rx={0.45} fill={previewFill} fillOpacity={active ? 0.82 : 0.58} stroke={active ? "#67e8f9" : room.light} strokeWidth={active ? 0.34 : 0.18} />
                  {(active || showPlantDetails) && (room.doors ?? []).map((door, index) => <line key={index} {...doorLine(room, door)} stroke="#facc15" strokeWidth={0.62 * markerScale} strokeLinecap="round" pointerEvents="none" />)}
                  {showRoomName && <text x={room.rect.x + room.rect.w / 2} y={room.rect.z + room.rect.d / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={Math.max(0.72 * markerScale, Math.min(1.6 * markerScale, room.rect.w / 7))} fontWeight="700" pointerEvents="none">{room.name}</text>}
                  {active && <rect x={room.rect.x + room.rect.w - 0.9} y={room.rect.z + room.rect.d - 0.9} width={0.9} height={0.9} rx={0.15} fill="#67e8f9" stroke="#031014" strokeWidth={0.15} className="cursor-nwse-resize" onPointerDown={(event) => beginDrag(event, room, "resize")} />}
                </g>
              })}
              {map.spawns.filter((item) => (item.level ?? 0) === level).map((item, index) => <circle key={`spawn-${index}`} cx={item.x} cy={item.z} r={0.35} fill="#4ade80" />)}
              {(map.emergency.level ?? 0) === level && <circle cx={map.emergency.x} cy={map.emergency.z} r={0.55} fill="#facc15" stroke="#fff" strokeWidth={0.12} />}
              {tasksOnLevel.map((item) => {
                const number = map.taskSpots.findIndex((task) => task.id === item.id) + 1
                const active = selectedTaskId === item.id
                return (
                  <g
                    key={item.id}
                    className="cursor-pointer"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      setSelectedTaskId(item.id)
                      setSelectedId(null)
                    }}
                  >
                    <circle
                      cx={item.x}
                      cy={item.z}
                      r={(active ? 0.92 : 0.72) * markerScale}
                      fill={active ? "#facc15" : "#fb923c"}
                      stroke="#2a1203"
                      strokeWidth={0.12 * markerScale}
                    />
                    <text
                      x={item.x}
                      y={item.z}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#1c0d03"
                      fontSize={0.75 * markerScale}
                      fontWeight="900"
                      pointerEvents="none"
                    >
                      {number}
                    </text>
                  </g>
                )
              })}
              {showPlantDetails && map.props.filter((item) => (item.level ?? 0) === level).map((item, index) => <rect key={`prop-${index}`} x={item.x - 0.25} y={item.z - 0.25} width={0.5} height={0.5} rx={0.12} fill="#e2e8f0" fillOpacity={0.75} />)}
              {map.stairs.flatMap((item) => [{ x: item.x, z: item.z, level: item.level }, { x: item.targetX, z: item.targetZ, level: item.targetLevel }]).filter((item) => item.level === level).map((item, index) => <rect key={`stair-${index}`} x={item.x - 0.5} y={item.z - 0.5} width={1} height={1} fill="#a78bfa" />)}
            </svg>
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-black/75 p-1 shadow-xl" onPointerDown={(event) => event.stopPropagation()}>
              <button type="button" title="Aproximar" onClick={() => zoomPlant(0.68)} className="flex size-8 items-center justify-center rounded-lg text-gray-200 hover:bg-white/10"><Plus className="size-4" /></button>
              <button type="button" title="Afastar" onClick={() => zoomPlant(1.45)} className="flex size-8 items-center justify-center rounded-lg text-gray-200 hover:bg-white/10"><Minus className="size-4" /></button>
              <button type="button" title="Mostrar o mapa inteiro" onClick={() => setPlanView(null)} className="flex h-8 items-center justify-center rounded-lg px-2 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:bg-white/10">Enquadrar</button>
            </div>
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/65 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">Roda: zoom · Shift + arrastar: mover</div>
            <div className="pointer-events-none absolute bottom-2 left-2 flex gap-3 rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-400"><span className="text-emerald-400">● entrada</span><span className="text-amber-300">● reunião</span><span className="text-orange-300">● número = tarefa</span></div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard icon={Box} title={selected ? "Sala selecionada" : "Mapa"} description={selected ? "Medidas em unidades do jogo; uma unidade equivale a um metro na escala 1x." : "Selecione uma sala na planta para editar."} accent="violet">
            {selected ? <div className="space-y-3">
              <label className={labelClass}>Nome<input className={inputClass} value={selected.name} onChange={(event) => updateRoom({ name: event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { field: "x", label: "Posição horizontal" },
                  { field: "z", label: "Posição vertical" },
                  { field: "w", label: "Largura" },
                  { field: "d", label: "Profundidade" },
                ] as const).map(({ field, label }) => <label key={field} className={labelClass}>{label}<input type="number" step="0.5" min={field === "w" || field === "d" ? 2 : undefined} className={inputClass} value={selected.rect[field]} onChange={(event) => updateRoom({ rect: { ...selected.rect, [field]: Number(event.target.value) } })} /></label>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>Tipo<select className={inputClass} value={selected.kind} onChange={(event) => updateRoom({ kind: event.target.value as MapRoom["kind"] })}><option value="sala">Construção/sala</option><option value="corredor">Corredor interno</option><option value="terraco">Terraço elevado</option><option value="externa">Área externa</option><option value="agua">Piscina/água</option><option value="campo">Campo/quadra</option></select></label>
                <label className={labelClass}>Piso<select className={inputClass} value={selected.finish} onChange={(event) => updateRoom({ finish: event.target.value as MapRoom["finish"] })}>{FINISHES.map((finish) => <option key={finish.value} value={finish.value}>{finish.label}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>Tom do chão<input type="color" className={`${inputClass} p-1`} value={selected.floor} onChange={(event) => updateRoom({ floor: event.target.value })} /></label>
                <label className={labelClass}>Luz da sala<input type="color" className={`${inputClass} p-1`} value={selected.light} onChange={(event) => updateRoom({ light: event.target.value })} /></label>
              </div>
              <div className="space-y-2 border-t border-white/[0.07] pt-3">
                <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Portas</p><button type="button" className="text-[10px] font-bold text-cyan-400" onClick={() => updateRoom({ doors: [...(selected.doors ?? []), { side: "north", at: 2, width: 2.4 }] })}>+ Porta</button></div>
                {(selected.doors ?? []).map((door, index) => <div key={index} className="grid grid-cols-[1fr_58px_58px_28px] gap-1.5">
                  <select className={inputClass} value={door.side} onChange={(event) => { const doors = [...(selected.doors ?? [])]; doors[index] = { ...door, side: event.target.value as typeof door.side }; updateRoom({ doors }) }}><option value="north">Norte</option><option value="south">Sul</option><option value="east">Leste</option><option value="west">Oeste</option></select>
                  <input title="Posição" type="number" step="0.5" className={inputClass} value={door.at} onChange={(event) => { const doors = [...(selected.doors ?? [])]; doors[index] = { ...door, at: Number(event.target.value) }; updateRoom({ doors }) }} />
                  <input title="Largura" type="number" step="0.2" className={inputClass} value={door.width} onChange={(event) => { const doors = [...(selected.doors ?? [])]; doors[index] = { ...door, width: Number(event.target.value) }; updateRoom({ doors }) }} />
                  <button type="button" onClick={() => updateRoom({ doors: (selected.doors ?? []).filter((_, doorIndex) => doorIndex !== index) })} className="rounded-lg border border-red-400/15 text-red-400 hover:bg-red-500/10">×</button>
                </div>)}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={duplicateRoom}>Duplicar</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={furnishRoom}>Mobiliar</Button>
                <Button size="sm" variant="outline" className="border-red-400/20 text-red-300" onClick={() => { updateMap((next) => { next.rooms = next.rooms.filter((room) => room.id !== selected.id) }); setSelectedId(null) }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div> : <div className="space-y-3">
              <label className={labelClass}>Nome do mapa<input className={inputClass} value={map.name} onChange={(event) => updateMap((next) => { next.name = event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2"><label className={labelClass}>Largura<input type="number" className={inputClass} value={map.bounds.w} onChange={(event) => updateMap((next) => { next.bounds.w = Number(event.target.value) })} /></label><label className={labelClass}>Profundidade<input type="number" className={inputClass} value={map.bounds.d} onChange={(event) => updateMap((next) => { next.bounds.d = Number(event.target.value) })} /></label></div>
            </div>}
          </SectionCard>

          <SectionCard
            icon={WandSparkles}
            title="Tarefas da partida"
            description="Os números da lista são os mesmos círculos laranja mostrados na planta."
            accent="amber"
            bodyClassName="space-y-3"
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2"><strong className="block text-lg text-orange-300">{map.taskSpots.length}</strong><span className="text-[9px] uppercase tracking-wider text-gray-500">tarefas</span></div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2"><strong className="block text-lg text-emerald-300">{map.spawns.length}</strong><span className="text-[9px] uppercase tracking-wider text-gray-500">entradas</span></div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2"><strong className="block text-lg text-amber-300">{map.meetingSeats.length}</strong><span className="text-[9px] uppercase tracking-wider text-gray-500">cadeiras</span></div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-orange-400 text-black hover:bg-orange-300" onClick={addTask}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar tarefa</Button>
              <Button size="sm" variant="outline" onClick={() => { if (window.confirm("Refazer automaticamente tarefas, entradas e reunião?")) { setMap(preparePlayable(map)); setSelectedTaskId(null); toast.success("Pontos refeitos") } }}><WandSparkles className="mr-1 h-3.5 w-3.5" />Refazer</Button>
            </div>

            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {map.taskSpots.map((task, index) => {
                const room = map.rooms.find((candidate) => candidate.id === task.room)
                const active = selectedTaskId === task.id
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => { setSelectedTaskId(task.id); setSelectedId(null); setLevel(task.level ?? 0); focusPlant(task.x, task.z) }}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${active ? "border-orange-300/50 bg-orange-300/10" : "border-white/[0.07] bg-black/20 hover:border-white/15"}`}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-400 text-[10px] font-black text-black">{index + 1}</span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-gray-200">{task.label}</strong><span className="block truncate text-[9px] uppercase tracking-wider text-gray-500">{room?.name ?? "Sala ausente"} · andar {(task.level ?? 0) + 1}</span></span>
                  </button>
                )
              })}
            </div>

            {selectedTask && (
              <div className="space-y-2 border-t border-white/[0.07] pt-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-300">Editar tarefa {map.taskSpots.findIndex((task) => task.id === selectedTask.id) + 1}</p>
                <label className={labelClass}>Nome que o jogador vê<input className={inputClass} value={selectedTask.label} onChange={(event) => updateTask({ label: event.target.value })} /></label>
                <label className={labelClass}>Tipo de minijogo<select className={inputClass} value={selectedTask.kind} onChange={(event) => updateTask({ kind: event.target.value })}>{TASK_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label>
                <label className={labelClass}>Sala/área<select className={inputClass} value={selectedTask.room} onChange={(event) => moveTaskToRoom(event.target.value)}>{availableTaskRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · andar {(room.level ?? 0) + 1}</option>)}</select></label>
                <Button size="sm" variant="outline" className="w-full border-red-400/20 text-red-300" onClick={() => { updateMap((next) => { next.taskSpots = next.taskSpots.filter((task) => task.id !== selectedTask.id) }); setSelectedTaskId(null) }}><Trash2 className="mr-1 h-3.5 w-3.5" />Remover esta tarefa</Button>
              </div>
            )}
            <p className="text-[10px] leading-relaxed text-gray-500">A partida exige no mínimo quatro tarefas. “Conferir pontos” corrige automaticamente tarefa fora da sala, entrada dentro da água e direção inválida.</p>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <SectionCard icon={MapPinned} title="Gerar cenário de um local real" description="Cole a localização, selecione a área diretamente no mapa e converta construções, piscina, campos e caminhos para o jogo." accent="emerald" bodyClassName="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_auto] lg:items-end">
              <label className={labelClass}>Link completo do Google Maps<input className={inputClass} placeholder="https://www.google.com/maps/.../@-12.59,-38.96,..." value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} /></label>
              <label className={labelClass}>Escala do jogo<input type="number" step="0.05" min="0.05" max="4" className={inputClass} value={realScale} onChange={(event) => setRealScale(Number(event.target.value))} /></label>
              {safeHttpsUrl(referenceUrl) && <Button size="sm" variant="outline" asChild><a href={safeHttpsUrl(referenceUrl) ?? undefined} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Abrir no Google</a></Button>}
            </div>

            <RealAreaPicker
              latitude={referenceCoordinates.latitude}
              longitude={referenceCoordinates.longitude}
              busy={generatingArea}
              onGenerate={(bounds) => void generateRealArea(bounds)}
            />

            {generationSummary && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Último cenário gerado</p>
                <p className="mt-1 text-xs text-gray-300">{generationSummary}</p>
                <p className="mt-1 text-[10px] text-gray-500">O cenário já está na planta jogável acima. Revise os pontos numerados e publique.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
              <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-white/10 px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.05]"><ImagePlus className="mr-1.5 h-3.5 w-3.5" />Usar planta como fundo<input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 12 * 1024 * 1024) setReferenceImage(URL.createObjectURL(file)); else if (file) toast.error("A imagem pode ter no máximo 12 MB.") }} /></label>
              <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-white/10 px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.05]"><Upload className="mr-1.5 h-3.5 w-3.5" />Importar KML/GeoJSON<input type="file" accept=".kml,.geojson,application/geo+json" className="hidden" onChange={(event) => void importGeoFile(event.target.files?.[0])} /></label>
            </div>
            {referenceImage && <label className={labelClass}>Opacidade da planta<input type="range" min="0.1" max="0.9" step="0.05" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} className="w-full accent-cyan-400" /></label>}
            <p className="text-[11px] leading-relaxed text-gray-500">O link do Google posiciona o ponto azul. Satélite serve como referência visual; construções e caminhos jogáveis vêm dos dados abertos do OpenStreetMap e viram objetos editáveis. Nenhuma imagem é publicada dentro do jogo.</p>
          </SectionCard>
        </div>

        <SectionCard icon={FileJson} title="Arquivo e manutenção" description="Leve o mapa para outro ambiente ou edite recursos avançados no JSON." accent="slate" bodyClassName="space-y-3">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-white/10 px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.05]"><Upload className="mr-1.5 h-3.5 w-3.5" />Importar mapa<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importMapFile(event.target.files?.[0])} /></label>
            <Button variant="outline" size="sm" onClick={() => { const stored = window.localStorage.getItem(DRAFT_KEY); if (stored) { setMap(JSON.parse(stored)); setActiveMapId(null); setPlanView(null); setSelectedId(null); setSelectedTaskId(null); toast.success("Rascunho restaurado") } }}>Restaurar rascunho</Button>
            <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Começar um mapa novo?")) startNewMap() }}><Plus className="mr-1 h-3.5 w-3.5" />Novo</Button>
            <Button variant="outline" size="sm" onClick={() => void openStoredMap("original")}><RotateCcw className="mr-1 h-3.5 w-3.5" />Abrir original</Button>
          </div>
          <details className="rounded-xl border border-white/[0.07] bg-black/20 p-3" onToggle={(event) => { if (event.currentTarget.open) setRawJson(JSON.stringify(map, null, 2)) }}><summary className="cursor-pointer text-xs font-black text-gray-300">Editor JSON avançado</summary><textarea value={rawJson} onChange={(event) => setRawJson(event.target.value)} className="mt-3 h-64 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] text-gray-300 outline-none focus:border-cyan-400/40" /><Button size="sm" variant="outline" onClick={() => { try { setMap(JSON.parse(rawJson)); toast.success("JSON aplicado ao rascunho") } catch { toast.error("JSON inválido") } }}>Aplicar JSON</Button></details>
        </SectionCard>
      </div>
    </div>
  )
}
