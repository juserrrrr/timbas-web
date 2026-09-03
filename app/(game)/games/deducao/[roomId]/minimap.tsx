"use client"

import { useEffect, useRef } from "react"
import type { MapTaskSpot, OfficeMap } from "@/lib/services/games"
import type { Role } from "./use-deducao-room"

interface Props {
  map: OfficeMap
  spots: MapTaskSpot[]
  role: Role | null
  /// Posição e direção do jogador, escritas pela cena a cada quadro. O mapa lê
  /// daqui e mexe no SVG na mão: passar isso por estado do React redesenharia
  /// a planta inteira sessenta vezes por segundo para andar dois pixels.
  poseRef: React.MutableRefObject<{ x: number; z: number; dir: number }>
  /// Mapa grande mostra nome de sala e legenda. O pequeno é só orientação.
  grande?: boolean
}

export function Minimap({ map, spots, role, poseRef, grande = false }: Props) {
  const marker = useRef<SVGGElement>(null)

  useEffect(() => {
    let frame = 0
    const seguir = () => {
      const node = marker.current
      if (node) {
        const { x, z, dir } = poseRef.current
        // O ponteiro nasce apontando para cima; girar 180 menos a direção do
        // jogo é o que alinha o norte da planta com o norte do escritório.
        const giro = 180 - (dir * 180) / Math.PI
        node.setAttribute("transform", `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${giro.toFixed(1)})`)
      }
      frame = requestAnimationFrame(seguir)
    }
    frame = requestAnimationFrame(seguir)
    return () => cancelAnimationFrame(frame)
  }, [poseRef])

  const { bounds } = map

  return (
    <svg
      viewBox={`${bounds.x - 2} ${bounds.z - 2} ${bounds.w + 4} ${bounds.d + 4}`}
      className="h-full w-full"
      role="img"
      aria-label="Planta do escritório"
    >
      {map.rooms.map((room) => (
        <rect
          key={room.id}
          x={room.rect.x}
          y={room.rect.z}
          width={room.rect.w}
          height={room.rect.d}
          rx={room.kind === "corredor" ? 0.6 : 1.4}
          fill={room.kind === "corredor" ? "#5b6780" : "#8f9cb4"}
          stroke={room.light}
          strokeWidth={room.kind === "corredor" ? 0.35 : 0.6}
          opacity={room.kind === "corredor" ? 0.75 : 0.95}
        />
      ))}

      {grande &&
        map.rooms
          .filter((room) => room.kind === "sala")
          .map((room) => (
            <text
              key={room.id}
              x={room.rect.x + room.rect.w / 2}
              y={room.rect.z + room.rect.d / 2}
              textAnchor="middle"
              fontSize={2}
              fill="#0f1520"
              opacity={0.6}
              className="font-semibold"
            >
              {room.name}
            </text>
          ))}

      {/* O botão de emergência é ponto fixo de encontro, então aparece sempre. */}
      <circle cx={map.emergency.x} cy={map.emergency.z} r={1.1} fill="#ef4444" opacity={0.9} />

      {role === "assassino" &&
        map.vents.map((vent) => (
          <rect
            key={vent.id}
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

      {spots.map((spot) => (
        <circle key={spot.id} cx={spot.x} cy={spot.z} r={1.3} fill="#fbbf24" opacity={0.95}>
          <animate attributeName="r" values="1.1;1.8;1.1" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ))}

      <g ref={marker}>
        <circle r={2.4} fill="#38bdf8" opacity={0.22} />
        <path d="M 0 -2.2 L 1.7 1.8 L 0 0.9 L -1.7 1.8 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth={0.3} />
      </g>
    </svg>
  )
}
