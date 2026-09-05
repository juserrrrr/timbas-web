"use client"

import { useEffect, useRef } from "react"
import type { MapTaskSpot, OfficeMap } from "@/lib/services/games"
import type { Role } from "./use-deducao-room"

interface Props {
  map: OfficeMap
  spots: MapTaskSpot[]
  role: Role | null
  level: number
  /// Posição e direção do jogador, escritas pela cena a cada quadro. O mapa lê
  /// daqui e mexe no SVG na mão: passar isso por estado do React redesenharia
  /// a planta inteira sessenta vezes por segundo para andar dois pixels.
  poseRef: React.MutableRefObject<{ x: number; z: number; dir: number }>
  /// Mapa grande mostra nome de sala e legenda. O pequeno é só orientação.
  grande?: boolean
}

function roomFill(room: OfficeMap["rooms"][number]) {
  if (room.kind === "agua") return "#1689a6"
  if (room.kind === "campo") return room.finish === "sport" ? "#287d78" : "#507f45"
  if (room.kind === "externa") return room.finish === "grass" ? "#426d3c" : "#69727c"
  if (room.kind === "terraco") return "#8b7968"
  if (room.kind === "corredor") return "#5b6780"
  return "#8f9cb4"
}

function roomLabelLines(room: OfficeMap["rooms"][number]) {
  const maxCharacters = Math.max(8, Math.floor((room.rect.w - 1.4) / 0.78))
  const lines: string[] = []
  for (const word of room.name.split(/\s+/)) {
    const previous = lines[lines.length - 1]
    if (previous && previous.length + word.length + 1 <= maxCharacters) lines[lines.length - 1] += ` ${word}`
    else lines.push(word)
  }
  return lines
}

function doorLine(room: OfficeMap["rooms"][number], door: NonNullable<OfficeMap["rooms"][number]["doors"]>[number]) {
  const horizontal = door.side === "north" || door.side === "south"
  const x = room.rect.x + (horizontal ? door.at : door.side === "east" ? room.rect.w : 0)
  const z = room.rect.z + (!horizontal ? door.at : door.side === "south" ? room.rect.d : 0)
  return { x1: x, y1: z, x2: x + (horizontal ? door.width : 0), y2: z + (horizontal ? 0 : door.width) }
}

export function Minimap({ map, spots, role, level, poseRef, grande = false }: Props) {
  const marker = useRef<SVGGElement>(null)

  useEffect(() => {
    let frame = 0
    let previousTransform = ""
    const seguir = () => {
      const node = marker.current
      if (node) {
        const { x, z, dir } = poseRef.current
        // O ponteiro nasce apontando para cima; girar 180 menos a direção do
        // jogo é o que alinha o norte da planta com o norte do escritório.
        const giro = 180 - (dir * 180) / Math.PI
        const transform = `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${giro.toFixed(1)})`
        if (transform !== previousTransform) {
          node.setAttribute("transform", transform)
          previousTransform = transform
        }
      }
      frame = requestAnimationFrame(seguir)
    }
    frame = requestAnimationFrame(seguir)
    return () => cancelAnimationFrame(frame)
  }, [poseRef])

  const { bounds } = map
  const rooms = map.rooms.filter((room) => (room.level ?? 0) === level)
  const stairs = map.stairs.filter((stair) => stair.level === level || stair.targetLevel === level)
  const floorName = level === 0 ? "Térreo" : `${level + 1}º andar`

  return (
    <svg
      viewBox={`${bounds.x - 2} ${bounds.z - 2} ${bounds.w + 4} ${bounds.d + 4}`}
      className={grande ? "block min-h-0 max-h-[calc(100dvh-12rem)] w-full" : "block h-full w-full"}
      role="img"
      aria-label={`Mapa da partida: ${floorName}`}
    >
      <title>{`${map.name}: ${floorName}`}</title>
      {rooms.map((room) => (
        <rect
          key={room.id}
          data-map-room={room.id}
          x={room.rect.x}
          y={room.rect.z}
          width={room.rect.w}
          height={room.rect.d}
          rx={room.kind === "corredor" ? 0.6 : 1.4}
          fill={roomFill(room)}
          stroke={room.light}
          strokeWidth={room.kind === "corredor" ? 0.35 : 0.6}
          opacity={room.kind === "corredor" ? 0.75 : 0.95}
        />
      ))}

      {rooms.flatMap((room) => (room.doors ?? []).map((door, index) => (
        <line key={`${room.id}-${index}`} data-map-door={room.id} {...doorLine(room, door)} stroke="#e2e8f0" strokeWidth={0.75} />
      )))}

      {grande &&
        rooms
          .filter((room) => room.kind !== "corredor" && room.kind !== "externa")
          .map((room) => {
            const lines = roomLabelLines(room)
            const x = room.rect.x + room.rect.w / 2
            return (
              <text
                key={room.id}
                data-map-label={room.id}
                x={x}
                y={room.rect.z + room.rect.d / 2 - ((lines.length - 1) * 1.7) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={1.45}
                fill="#0f1520"
                opacity={0.85}
                className="font-semibold"
              >
                {lines.map((line, index) => (
                  <tspan key={index} x={x} dy={index === 0 ? 0 : 1.7}
                    textLength={line.length * 0.78 > room.rect.w - 1.4 ? Math.max(1, room.rect.w - 1.4) : undefined}
                    lengthAdjust="spacingAndGlyphs">
                    {line}
                  </tspan>
                ))}
              </text>
            )
          })}

      {stairs.map((stair) => {
        const atStart = stair.level === level
        const x = atStart ? stair.x : stair.targetX
        const z = atStart ? stair.z : stair.targetZ
        const destination = atStart ? stair.targetLevel : stair.level
        const points = [`${stair.x},${stair.z}`]
        if (stair.turnX !== undefined && stair.turnZ !== undefined) points.push(`${stair.turnX},${stair.turnZ}`)
        points.push(`${stair.targetX},${stair.targetZ}`)
        return <g key={stair.id} data-map-stair={stair.id}>
          <title>{`Escada para ${destination === 0 ? "o térreo" : `o ${destination + 1}º andar`}`}</title>
          <polyline points={points.join(" ")} fill="none" stroke="#e2e8f0" strokeWidth={0.7} strokeDasharray="0.7 0.4" />
          <circle cx={x} cy={z} r={1.35} fill="#0f172a" stroke="#e2e8f0" strokeWidth={0.3} />
          <text x={x} y={z} textAnchor="middle" dominantBaseline="central" fontSize={2} fill="#f8fafc">{destination > level ? "↑" : "↓"}</text>
        </g>
      })}

      {(map.emergency.level ?? 0) === level && (
        <circle data-map-emergency="true" cx={map.emergency.x} cy={map.emergency.z} r={1.1} fill="#ef4444" opacity={0.9} />
      )}

      {role === "assassino" &&
        map.vents.filter((vent) => (vent.level ?? 0) === level).map((vent) => (
          <rect
            key={vent.id}
            data-map-vent={vent.id}
            x={vent.x - 0.9}
            y={vent.z - 0.9}
            width={1.8}
            height={1.8}
            rx={0.4}
            fill="none"
            stroke="#f87171"
            strokeWidth={0.5}
          />
        ))}

      {spots.filter((spot) => (spot.level ?? 0) === level).map((spot) => (
        <circle key={spot.id} data-map-task={spot.id} cx={spot.x} cy={spot.z} r={1.3} fill="#fbbf24" opacity={0.95}>
          <animate attributeName="r" values="1.1;1.8;1.1" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ))}

      <text x={bounds.x + bounds.w / 2} y={bounds.z} textAnchor="middle" fontSize={1.65} fill="#e2e8f0">{floorName}</text>

      <g ref={marker} data-map-player="local">
        <circle r={2.4} fill="#38bdf8" opacity={0.22} />
        <path d="M 0 -2.2 L 1.7 1.8 L 0 0.9 L -1.7 1.8 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth={0.3} />
      </g>
    </svg>
  )
}
