"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Crosshair, Hand, Map as MapIcon, Minus, Plus, Satellite, ScanSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export interface GeoBounds {
  south: number
  west: number
  north: number
  east: number
}

interface Point {
  x: number
  y: number
}

const TILE_SIZE = 256

function clampLatitude(value: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, value))
}

function worldFromCoordinates(latitude: number, longitude: number, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom
  const lat = (clampLatitude(latitude) * Math.PI) / 180
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat))) / (4 * Math.PI)) * scale,
  }
}

function coordinatesFromWorld(point: Point, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom
  const longitude = (point.x / scale) * 360 - 180
  const mercator = Math.PI - (2 * Math.PI * point.y) / scale
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(mercator))
  return { latitude: clampLatitude(latitude), longitude }
}

function normalizeRect(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  }
}

function areaMeters(bounds: GeoBounds) {
  const latitude = (bounds.north + bounds.south) / 2
  return {
    width: Math.abs(bounds.east - bounds.west) * 111_320 * Math.cos((latitude * Math.PI) / 180),
    depth: Math.abs(bounds.north - bounds.south) * 110_540,
  }
}

function defaultSelection(size: { width: number; height: number }) {
  const w = Math.min(320, size.width * 0.72)
  const h = Math.min(220, size.height * 0.58)
  return { x: (size.width - w) / 2, y: (size.height - h) / 2, w, h }
}

export function RealAreaPicker({
  latitude,
  longitude,
  busy,
  onGenerate,
}: {
  latitude: number
  longitude: number
  busy: boolean
  onGenerate: (bounds: GeoBounds) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const selectionTouched = useRef(false)
  const sizeRef = useRef({ width: 800, height: 430 })
  const gesture = useRef<{
    pointerId: number
    mode: "pan" | "select"
    start: Point
    center: { latitude: number; longitude: number }
  } | null>(null)
  const [size, setSize] = useState({ width: 800, height: 430 })
  const [center, setCenter] = useState({ latitude, longitude })
  const [zoom, setZoom] = useState(18)
  const [mode, setMode] = useState<"pan" | "select">("select")
  const [baseLayer, setBaseLayer] = useState<"satellite" | "streets">("satellite")
  const [selection, setSelection] = useState(() => defaultSelection({ width: 800, height: 430 }))

  useEffect(() => {
    setCenter({ latitude, longitude })
    setZoom(18)
    selectionTouched.current = false
    setSelection(defaultSelection(sizeRef.current))
  }, [latitude, longitude])

  useEffect(() => {
    const node = container.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, entry.contentRect.width)
      const height = Math.max(280, entry.contentRect.height)
      sizeRef.current = { width, height }
      setSize({ width, height })
      setSelection((current) => {
        if (!selectionTouched.current) return defaultSelection({ width, height })
        const x = Math.max(0, Math.min(current.x, width - 40))
        const y = Math.max(0, Math.min(current.y, height - 40))
        return {
          x,
          y,
          w: Math.max(24, Math.min(current.w, width - x)),
          h: Math.max(24, Math.min(current.h, height - y)),
        }
      })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const centerWorld = worldFromCoordinates(center.latitude, center.longitude, zoom)
  const origin = { x: centerWorld.x - size.width / 2, y: centerWorld.y - size.height / 2 }
  const linkedWorld = worldFromCoordinates(latitude, longitude, zoom)
  const linkedPoint = { x: linkedWorld.x - origin.x, y: linkedWorld.y - origin.y }
  const tiles = useMemo(() => {
    const max = 2 ** zoom
    const firstX = Math.floor(origin.x / TILE_SIZE)
    const lastX = Math.floor((origin.x + size.width) / TILE_SIZE)
    const firstY = Math.max(0, Math.floor(origin.y / TILE_SIZE))
    const lastY = Math.min(max - 1, Math.floor((origin.y + size.height) / TILE_SIZE))
    const result: Array<{ key: string; x: number; y: number; urlX: number; urlY: number }> = []
    for (let tileY = firstY; tileY <= lastY; tileY += 1) {
      for (let tileX = firstX; tileX <= lastX; tileX += 1) {
        const wrappedX = ((tileX % max) + max) % max
        result.push({
          key: `${zoom}-${tileX}-${tileY}`,
          x: tileX * TILE_SIZE - origin.x,
          y: tileY * TILE_SIZE - origin.y,
          urlX: wrappedX,
          urlY: tileY,
        })
      }
    }
    return result
  }, [origin.x, origin.y, size.height, size.width, zoom])

  const selectedBounds = useMemo<GeoBounds>(() => {
    const northWest = coordinatesFromWorld({ x: origin.x + selection.x, y: origin.y + selection.y }, zoom)
    const southEast = coordinatesFromWorld(
      { x: origin.x + selection.x + selection.w, y: origin.y + selection.y + selection.h },
      zoom,
    )
    return {
      north: northWest.latitude,
      west: northWest.longitude,
      south: southEast.latitude,
      east: southEast.longitude,
    }
  }, [origin.x, origin.y, selection, zoom])
  const meters = areaMeters(selectedBounds)

  const localPoint = (event: { clientX: number; clientY: number }): Point => {
    const rect = container.current?.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(size.width, event.clientX - (rect?.left ?? 0))),
      y: Math.max(0, Math.min(size.height, event.clientY - (rect?.top ?? 0))),
    }
  }

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const point = localPoint(event)
    gesture.current = { pointerId: event.pointerId, mode, start: point, center }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (mode === "select") {
      selectionTouched.current = true
      setSelection({ x: point.x, y: point.y, w: 0, h: 0 })
    }
  }

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const point = localPoint(event)
    if (active.mode === "select") {
      setSelection(normalizeRect(active.start, point))
      return
    }
    const startWorld = worldFromCoordinates(active.center.latitude, active.center.longitude, zoom)
    const coordinates = coordinatesFromWorld(
      { x: startWorld.x - (point.x - active.start.x), y: startWorld.y - (point.y - active.start.y) },
      zoom,
    )
    setCenter(coordinates)
  }

  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return
    gesture.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    setSelection((current) =>
      current.w >= 24 && current.h >= 24
        ? current
        : { x: size.width * 0.2, y: size.height * 0.2, w: size.width * 0.6, h: size.height * 0.6 },
    )
  }

  const changeZoom = (amount: number, anchor: Point = { x: size.width / 2, y: size.height / 2 }) => {
    const maximumZoom = baseLayer === "satellite" ? 18 : 20
    const nextZoom = Math.max(15, Math.min(maximumZoom, zoom + amount))
    if (nextZoom === zoom) return
    const anchoredCoordinates = coordinatesFromWorld({ x: origin.x + anchor.x, y: origin.y + anchor.y }, zoom)
    const anchoredWorld = worldFromCoordinates(anchoredCoordinates.latitude, anchoredCoordinates.longitude, nextZoom)
    const nextCenterWorld = {
      x: anchoredWorld.x - anchor.x + size.width / 2,
      y: anchoredWorld.y - anchor.y + size.height / 2,
    }
    setCenter(coordinatesFromWorld(nextCenterWorld, nextZoom))
    setZoom(nextZoom)
  }

  const tileUrl = (tile: { urlX: number; urlY: number }) =>
    baseLayer === "satellite"
      ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.urlY}/${tile.urlX}`
      : `https://tile.openstreetmap.org/${zoom}/${tile.urlX}/${tile.urlY}.png`

  return (
    <div className="space-y-3">
      <div
        ref={container}
        className={`relative h-[430px] touch-none overflow-hidden rounded-2xl border border-white/10 bg-[#0b1118] ${mode === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onWheel={(event) => {
          event.preventDefault()
          changeZoom(event.deltaY < 0 ? 1 : -1, localPoint(event))
        }}
      >
        {tiles.map((tile) => (
          // O seletor carrega apenas os ladrilhos que estão visíveis; não há
          // download em lote nem persistência das imagens no mapa publicado.
          <img
            key={tile.key}
            src={tileUrl(tile)}
            alt=""
            draggable={false}
            className="pointer-events-none absolute h-64 w-64 max-w-none select-none"
            style={{ left: tile.x, top: tile.y }}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ))}

        <div
          className="pointer-events-none absolute border-2 border-cyan-300 bg-cyan-300/15 shadow-[0_0_0_9999px_rgba(2,6,12,0.42)]"
          style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
        />

        {linkedPoint.x >= 0 && linkedPoint.x <= size.width && linkedPoint.y >= 0 && linkedPoint.y <= size.height && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: linkedPoint.x, top: linkedPoint.y }}
          >
            <span className="block size-4 rounded-full border-[3px] border-white bg-cyan-400 shadow-[0_0_0_5px_rgba(6,182,212,0.28),0_2px_8px_rgba(0,0,0,0.8)]" />
          </div>
        )}

        <div className="pointer-events-auto absolute left-3 top-3 z-20 flex overflow-hidden rounded-xl border border-white/15 bg-black/75 p-1 backdrop-blur" onPointerDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setMode("pan")
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider ${mode === "pan" ? "bg-cyan-400 text-black" : "text-gray-300"}`}
          >
            <Hand className="h-3.5 w-3.5" /> Mover
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setMode("select")
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider ${mode === "select" ? "bg-cyan-400 text-black" : "text-gray-300"}`}
          >
            <ScanSearch className="h-3.5 w-3.5" /> Selecionar
          </button>
        </div>

        <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 overflow-hidden rounded-xl border border-white/15 bg-black/75 p-1 backdrop-blur" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={(event) => { event.stopPropagation(); setBaseLayer("satellite"); setZoom((current) => Math.min(18, current)) }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider ${baseLayer === "satellite" ? "bg-cyan-400 text-black" : "text-gray-300"}`}><Satellite className="h-3.5 w-3.5" />Satélite</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setBaseLayer("streets") }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider ${baseLayer === "streets" ? "bg-cyan-400 text-black" : "text-gray-300"}`}><MapIcon className="h-3.5 w-3.5" />Ruas</button>
        </div>

        <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-black/75 backdrop-blur" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" className="p-2.5 text-white hover:bg-white/10" onClick={(event) => { event.stopPropagation(); changeZoom(1) }} aria-label="Aproximar"><Plus className="h-4 w-4" /></button>
          <button type="button" className="border-t border-white/10 p-2.5 text-white hover:bg-white/10" onClick={(event) => { event.stopPropagation(); changeZoom(-1) }} aria-label="Afastar"><Minus className="h-4 w-4" /></button>
          <button type="button" className="border-t border-white/10 p-2.5 text-white hover:bg-white/10" onClick={(event) => { event.stopPropagation(); setCenter({ latitude, longitude }) }} aria-label="Voltar para a coordenada"><Crosshair className="h-4 w-4" /></button>
        </div>

        <a
          href={baseLayer === "satellite" ? "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" : "https://www.openstreetmap.org/copyright"}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto absolute bottom-1.5 right-2 rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold text-black"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {baseLayer === "satellite" ? "Imagery © Esri, Maxar, Earthstar Geographics" : "© OpenStreetMap contributors"}
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-3">
        <div>
          <p className="text-xs font-black text-white">Área selecionada: {Math.round(meters.width)} × {Math.round(meters.depth)} m</p>
          <p className="mt-1 text-[10px] text-gray-500">O ponto azul é a coordenada do link · zoom {zoom}. Use Mover para posicionar e Selecionar para redesenhar.</p>
        </div>
        <Button
          size="sm"
          disabled={busy || meters.width < 10 || meters.depth < 10 || meters.width > 1_200 || meters.depth > 1_200}
          onClick={() => onGenerate(selectedBounds)}
          className="bg-emerald-400 text-black hover:bg-emerald-300"
        >
          {busy ? <Spinner className="mr-1.5 size-4" /> : <ScanSearch className="mr-1.5 h-4 w-4" />}
          Gerar cenário desta área
        </Button>
      </div>
      {(meters.width > 1_200 || meters.depth > 1_200) && (
        <p className="text-[11px] text-amber-300">Reduza a seleção para no máximo 1.200 × 1.200 metros.</p>
      )}
    </div>
  )
}
