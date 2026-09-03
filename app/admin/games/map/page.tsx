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
  getAdminOfficeMap,
  publishAdminOfficeMap,
  resetAdminOfficeMap,
  type MapRoom,
  type OfficeMap,
} from "@/lib/services/games"
import { toast } from "@/lib/toast"

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
}

type DragState = {
  id: string
  mode: "move" | "resize"
  startX: number
  startZ: number
  room: MapRoom["rect"]
}

function cloneMap(map: OfficeMap): OfficeMap {
  return structuredClone(map)
}

function snap(value: number): number {
  return Math.round(value * 2) / 2
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

function preparePlayable(source: OfficeMap): OfficeMap {
  const map = cloneMap(source)
  const rooms = map.rooms.filter((room) => room.kind !== "terraco")
  const ground = rooms.filter((room) => (room.level ?? 0) === 0)
  const meetingRoom = [...ground].sort((a, b) => b.rect.w * b.rect.d - a.rect.w * a.rect.d)[0]
  if (!meetingRoom) return map

  const center = {
    x: meetingRoom.rect.x + meetingRoom.rect.w / 2,
    z: meetingRoom.rect.z + meetingRoom.rect.d / 2,
    level: 0,
  }
  const spacing = Math.max(0.9, Math.min(1.5, Math.min(meetingRoom.rect.w, meetingRoom.rect.d) / 7))
  const candidates = Array.from({ length: 12 }, (_, index) => ({
    x: snap(center.x + (index % 4 - 1.5) * spacing),
    z: snap(center.z + (Math.floor(index / 4) - 1) * spacing),
    level: 0,
  })).filter((point) => pointInside(map, point))
  map.spawns = candidates.length >= 4 ? candidates : [{ ...center }, { ...center }, { ...center }, { ...center }]
  map.emergency = center

  const radius = Math.max(1.2, Math.min(2.8, Math.min(meetingRoom.rect.w, meetingRoom.rect.d) / 3))
  map.meetingSeats = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2
    return {
      x: snap(center.x + Math.cos(angle) * radius),
      z: snap(center.z + Math.sin(angle) * radius),
      level: 0,
      dir: angle + Math.PI / 2,
    }
  }).filter((point) => pointInside(map, point))
  while (map.meetingSeats.length < 4) map.meetingSeats.push({ ...center, dir: 0 })

  const taskRooms = rooms.length > 0 ? rooms : [meetingRoom]
  const taskKinds = ["cabos", "senha", "arquivo", "estoque", "cafe", "impressora", "rack"]
  map.taskSpots = Array.from({ length: Math.max(4, Math.min(16, taskRooms.length * 2)) }, (_, index) => {
    const room = taskRooms[index % taskRooms.length]
    const lane = Math.floor(index / taskRooms.length)
    return {
      id: `tarefa-${index + 1}`,
      kind: taskKinds[index % taskKinds.length],
      room: room.id,
      label: `Tarefa em ${room.name}`,
      x: snap(room.rect.x + room.rect.w * (lane % 2 === 0 ? 0.38 : 0.62)),
      z: snap(room.rect.z + room.rect.d * (lane % 2 === 0 ? 0.42 : 0.58)),
      level: room.level ?? 0,
    }
  })
  map.props = map.props.filter((prop) => pointInside(map, prop))
  map.vents = map.vents.filter((vent) => pointInside(map, vent) && map.rooms.some((room) => room.id === vent.room))
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
  const match = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ?? value.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  return match ? { latitude: Number(match[1]), longitude: Number(match[2]) } : null
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

function resizeMap(source: OfficeMap, width: number, depth: number): OfficeMap {
  const map = cloneMap(source)
  const previous = map.bounds
  const nextWidth = Math.max(10, Math.min(250, snap(width)))
  const nextDepth = Math.max(10, Math.min(250, snap(depth)))
  const scaleX = nextWidth / previous.w
  const scaleZ = nextDepth / previous.d
  const movePoint = <T extends { x: number; z: number }>(point: T): T => ({
    ...point,
    x: snap(previous.x + (point.x - previous.x) * scaleX),
    z: snap(previous.z + (point.z - previous.z) * scaleZ),
  })
  map.rooms = map.rooms.map((room) => ({
    ...room,
    rect: {
      x: snap(previous.x + (room.rect.x - previous.x) * scaleX),
      z: snap(previous.z + (room.rect.z - previous.z) * scaleZ),
      w: Math.max(2, snap(room.rect.w * scaleX)),
      d: Math.max(2, snap(room.rect.d * scaleZ)),
    },
  }))
  map.props = map.props.map(movePoint)
  map.taskSpots = map.taskSpots.map(movePoint)
  map.vents = map.vents.map(movePoint)
  map.spawns = map.spawns.map(movePoint)
  map.meetingSeats = map.meetingSeats.map(movePoint)
  map.emergency = movePoint(map.emergency)
  map.stairs = map.stairs.map((stair) => ({
    ...movePoint(stair),
    targetX: snap(previous.x + (stair.targetX - previous.x) * scaleX),
    targetZ: snap(previous.z + (stair.targetZ - previous.z) * scaleZ),
  }))
  map.bounds.w = nextWidth
  map.bounds.d = nextDepth
  map.walls = []
  map.obstacles = []
  return map
}

const inputClass = "h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white outline-none transition focus:border-cyan-400/50"
const labelClass = "space-y-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500"

export default function GameMapEditorPage() {
  const [map, setMap] = useState<OfficeMap | null>(null)
  const [level, setLevel] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceOpacity, setReferenceOpacity] = useState(0.45)
  const [realWidth, setRealWidth] = useState(80)
  const [realDepth, setRealDepth] = useState(60)
  const [realScale, setRealScale] = useState(0.7)
  const [referenceUrl, setReferenceUrl] = useState("")
  const [rawJson, setRawJson] = useState("")
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<DragState | null>(null)

  useEffect(() => {
    void getAdminOfficeMap()
      .then(({ map: loaded }) => {
        setMap(loaded)
        setReferenceUrl(loaded.source?.referenceUrl ?? "")
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

  const pointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return { x: 0, z: 0 }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    return { x: local.x, z: local.y }
  }

  const beginDrag = (event: React.PointerEvent<SVGElement>, room: MapRoom, mode: DragState["mode"]) => {
    event.stopPropagation()
    setSelectedId(room.id)
    const canvasEvent = event as unknown as React.PointerEvent<SVGSVGElement>
    const start = pointer(canvasEvent)
    drag.current = { id: room.id, mode, startX: start.x, startZ: start.z, room: { ...room.rect } }
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: React.PointerEvent<SVGSVGElement>) => {
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
      const result = await publishAdminOfficeMap(map)
      setMap(result.map)
      toast.success("Mapa publicado", { description: "Novas salas usarão esta versão." })
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
      setSelectedId(null)
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
      setSelectedId(null)
      toast.success("Contorno convertido", { description: `${polygons.length} área(s) em escala de jogo.` })
    } catch (error) {
      toast.error("Não deu para importar a geometria", { description: error instanceof Error ? error.message : undefined })
    }
  }

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Spinner className="size-6 text-cyan-400" /></div>
  if (!map) return <InlineNotice tone="danger">Você não tem acesso ao criador ou a API não respondeu.</InlineNotice>

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
              {saving ? <Spinner className="mr-1.5 size-4" /> : <Save className="mr-1.5 h-4 w-4" />}Publicar mapa
            </Button>
          </>
        }
      />

      <AdminMetrics items={[
        { label: "Salas", value: map.rooms.length, icon: Box, accent: "cyan" },
        { label: "Andares", value: map.rooms.some((room) => room.level === 1) ? 2 : 1, icon: Grid3X3, accent: "violet" },
        { label: "Tarefas", value: map.taskSpots.length, icon: WandSparkles, accent: "amber" },
        { label: "Escala", value: `${map.source?.gameUnitsPerMeter ?? 1}x`, icon: MapPinned, accent: "emerald" },
      ]} />

      <InlineNotice tone="info">
        Publicar é bloqueado enquanto existir uma sala de jogo aberta. Assim ninguém recebe um desenho diferente das colisões do servidor.
      </InlineNotice>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard icon={Grid3X3} title="Planta jogável" description="Arraste uma sala para mover; use o quadrado no canto para redimensionar." accent="cyan" bodyClassName="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
              {[0, 1].map((floor) => <button key={floor} type="button" onClick={() => setLevel(floor)} className={`rounded-md px-3 py-1.5 text-[11px] font-black ${level === floor ? "bg-cyan-400 text-black" : "text-gray-500 hover:text-white"}`}>Andar {floor + 1}</button>)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={addRoom}><Plus className="mr-1 h-3.5 w-3.5" />Nova sala</Button>
              <Button size="sm" variant="outline" onClick={addStair}><Plus className="mr-1 h-3.5 w-3.5" />Escada</Button>
              <Button size="sm" variant="outline" onClick={() => setMap(preparePlayable(map))}><WandSparkles className="mr-1 h-3.5 w-3.5" />Preparar jogabilidade</Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#091018]">
            <svg
              ref={svgRef}
              viewBox={`${map.bounds.x} ${map.bounds.z} ${map.bounds.w} ${map.bounds.d}`}
              className="aspect-[4/3] w-full touch-none select-none"
              onPointerMove={moveDrag}
              onPointerUp={(event) => { drag.current = null; svgRef.current?.releasePointerCapture(event.pointerId) }}
              onPointerCancel={() => { drag.current = null }}
              onPointerDown={() => setSelectedId(null)}
            >
              <defs><pattern id="grid" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M 2 0 L 0 0 0 2" fill="none" stroke="#7dd3fc" strokeOpacity="0.08" strokeWidth="0.08" /></pattern></defs>
              {referenceImage && <image href={referenceImage} x={map.bounds.x} y={map.bounds.z} width={map.bounds.w} height={map.bounds.d} opacity={referenceOpacity} preserveAspectRatio="none" />}
              <rect x={map.bounds.x} y={map.bounds.z} width={map.bounds.w} height={map.bounds.d} fill="url(#grid)" />
              {rooms.map((room) => {
                const active = selectedId === room.id
                const finish = room.finish ?? "terrazzo"
                return <g key={room.id} onPointerDown={(event) => beginDrag(event, room, "move")} className="cursor-move">
                  <rect x={room.rect.x} y={room.rect.z} width={room.rect.w} height={room.rect.d} rx={0.45} fill={ROOM_COLORS[finish]} fillOpacity={active ? 0.82 : 0.58} stroke={active ? "#67e8f9" : room.light} strokeWidth={active ? 0.34 : 0.18} />
                  {(room.doors ?? []).map((door, index) => <line key={index} {...doorLine(room, door)} stroke="#facc15" strokeWidth={0.62} strokeLinecap="round" pointerEvents="none" />)}
                  <text x={room.rect.x + room.rect.w / 2} y={room.rect.z + room.rect.d / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={Math.max(0.8, Math.min(1.6, room.rect.w / 7))} fontWeight="700" pointerEvents="none">{room.name}</text>
                  {active && <rect x={room.rect.x + room.rect.w - 0.9} y={room.rect.z + room.rect.d - 0.9} width={0.9} height={0.9} rx={0.15} fill="#67e8f9" stroke="#031014" strokeWidth={0.15} className="cursor-nwse-resize" onPointerDown={(event) => beginDrag(event, room, "resize")} />}
                </g>
              })}
              {map.spawns.filter((item) => (item.level ?? 0) === level).map((item, index) => <circle key={`spawn-${index}`} cx={item.x} cy={item.z} r={0.35} fill="#4ade80" />)}
              {(map.emergency.level ?? 0) === level && <circle cx={map.emergency.x} cy={map.emergency.z} r={0.55} fill="#facc15" stroke="#fff" strokeWidth={0.12} />}
              {map.taskSpots.filter((item) => (item.level ?? 0) === level).map((item) => <rect key={item.id} x={item.x - 0.25} y={item.z - 0.25} width={0.5} height={0.5} fill="#fb923c" transform={`rotate(45 ${item.x} ${item.z})`} />)}
              {map.props.filter((item) => (item.level ?? 0) === level).map((item, index) => <rect key={`prop-${index}`} x={item.x - 0.25} y={item.z - 0.25} width={0.5} height={0.5} rx={0.12} fill="#e2e8f0" fillOpacity={0.75} />)}
              {map.stairs.flatMap((item) => [{ x: item.x, z: item.z, level: item.level }, { x: item.targetX, z: item.targetZ, level: item.targetLevel }]).filter((item) => item.level === level).map((item, index) => <rect key={`stair-${index}`} x={item.x - 0.5} y={item.z - 0.5} width={1} height={1} fill="#a78bfa" />)}
            </svg>
            <div className="pointer-events-none absolute bottom-2 left-2 flex gap-3 rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-400"><span className="text-emerald-400">● entrada</span><span className="text-amber-300">● reunião</span><span className="text-orange-300">◆ tarefa</span></div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard icon={Box} title={selected ? "Sala selecionada" : "Mapa"} description={selected ? "Medidas em unidades do jogo; uma unidade equivale a um metro na escala 1x." : "Selecione uma sala na planta para editar."} accent="violet">
            {selected ? <div className="space-y-3">
              <label className={labelClass}>Nome<input className={inputClass} value={selected.name} onChange={(event) => updateRoom({ name: event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                {(["x", "z", "w", "d"] as const).map((field) => <label key={field} className={labelClass}>{field.toUpperCase()}<input type="number" step="0.5" min={field === "w" || field === "d" ? 2 : undefined} className={inputClass} value={selected.rect[field]} onChange={(event) => updateRoom({ rect: { ...selected.rect, [field]: Number(event.target.value) } })} /></label>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>Tipo<select className={inputClass} value={selected.kind} onChange={(event) => updateRoom({ kind: event.target.value as MapRoom["kind"] })}><option value="sala">Sala</option><option value="corredor">Corredor</option><option value="terraco">Terraço</option></select></label>
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
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard icon={MapPinned} title="Local real" description="Use uma planta, KML ou GeoJSON como referência e converta metros para a escala do jogo." accent="emerald" bodyClassName="space-y-3">
          <label className={labelClass}>Link completo do Google Maps<input className={inputClass} placeholder="https://www.google.com/maps/.../@-23.5,-46.6,..." value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} /></label>
          <div className="grid grid-cols-3 gap-2"><label className={labelClass}>Largura real<input type="number" className={inputClass} value={realWidth} onChange={(event) => setRealWidth(Number(event.target.value))} /></label><label className={labelClass}>Profundidade real<input type="number" className={inputClass} value={realDepth} onChange={(event) => setRealDepth(Number(event.target.value))} /></label><label className={labelClass}>Escala<input type="number" step="0.05" min="0.05" max="4" className={inputClass} value={realScale} onChange={(event) => setRealScale(Number(event.target.value))} /></label></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { const coords = coordinatesFromGoogleUrl(referenceUrl); setMap((current) => { if (!current) return current; const next = resizeMap(current, realWidth * realScale, realDepth * realScale); next.source = { ...next.source, referenceUrl: safeHttpsUrl(referenceUrl) ?? undefined, gameUnitsPerMeter: realScale, ...(coords ?? {}) }; return next }); toast.success("Escala aplicada") }}><MapPinned className="mr-1 h-3.5 w-3.5" />Aplicar escala</Button>
            {safeHttpsUrl(referenceUrl) && <Button size="sm" variant="outline" asChild><a href={safeHttpsUrl(referenceUrl) ?? undefined} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Abrir referência</a></Button>}
            <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-white/10 px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.05]"><ImagePlus className="mr-1.5 h-3.5 w-3.5" />Imagem local<input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 12 * 1024 * 1024) setReferenceImage(URL.createObjectURL(file)); else if (file) toast.error("A imagem pode ter no máximo 12 MB.") }} /></label>
            <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-white/10 px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.05]"><Upload className="mr-1.5 h-3.5 w-3.5" />KML/GeoJSON<input type="file" accept=".kml,.geojson,application/geo+json" className="hidden" onChange={(event) => void importGeoFile(event.target.files?.[0])} /></label>
          </div>
          {referenceImage && <label className={labelClass}>Opacidade da referência<input type="range" min="0.1" max="0.9" step="0.05" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} className="w-full accent-cyan-400" /></label>}
          <p className="text-[11px] leading-relaxed text-gray-600">A imagem fica somente neste navegador e não é publicada. KML/GeoJSON vira retângulos editáveis na escala escolhida; contornos irregulares são aproximados pelo formato suportado pelo jogo.</p>
        </SectionCard>

        <SectionCard icon={FileJson} title="Arquivo e manutenção" description="Leve o mapa para outro ambiente ou edite recursos avançados no JSON." accent="slate" bodyClassName="space-y-3">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-white/10 px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.05]"><Upload className="mr-1.5 h-3.5 w-3.5" />Importar mapa<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importMapFile(event.target.files?.[0])} /></label>
            <Button variant="outline" size="sm" onClick={() => { const stored = window.localStorage.getItem(DRAFT_KEY); if (stored) { setMap(JSON.parse(stored)); toast.success("Rascunho restaurado") } }}>Restaurar rascunho</Button>
            <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Começar um mapa novo?")) { setMap(newMap()); setSelectedId(null) } }}><Plus className="mr-1 h-3.5 w-3.5" />Novo</Button>
            <Button variant="outline" size="sm" className="border-red-400/20 text-red-300" onClick={async () => { if (!window.confirm("Voltar ao mapa original do Timbas?")) return; try { const result = await resetAdminOfficeMap(); setMap(result.map); toast.success("Mapa original restaurado") } catch (error) { toast.error("Não deu para restaurar", { description: error instanceof Error ? error.message : undefined }) } }}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar original</Button>
          </div>
          <details className="rounded-xl border border-white/[0.07] bg-black/20 p-3" onToggle={(event) => { if (event.currentTarget.open) setRawJson(JSON.stringify(map, null, 2)) }}><summary className="cursor-pointer text-xs font-black text-gray-300">Editor JSON avançado</summary><textarea value={rawJson} onChange={(event) => setRawJson(event.target.value)} className="mt-3 h-64 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] text-gray-300 outline-none focus:border-cyan-400/40" /><Button size="sm" variant="outline" onClick={() => { try { setMap(JSON.parse(rawJson)); toast.success("JSON aplicado ao rascunho") } catch { toast.error("JSON inválido") } }}>Aplicar JSON</Button></details>
        </SectionCard>
      </div>
    </div>
  )
}
