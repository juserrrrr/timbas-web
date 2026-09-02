import { API_URL } from "../api-base"
import { request } from "./http"

export interface GameSummary {
  id: string
  name: string
  tagline: string
  description: string
  players: string
  minutes: string
  enabled: boolean
  adminPreview: boolean
  href: string
}

export interface GameCatalog {
  hubEnabled: boolean
  adminPreview: boolean
  games: GameSummary[]
}

export interface MapRect { x: number; z: number; w: number; d: number }
export interface WallBox { minX: number; minZ: number; maxX: number; maxZ: number }
export interface MapRoom { id: string; name: string; rect: MapRect; floor: string; light: string }
export interface MapProp { kind: string; x: number; z: number; rot: number }
export interface MapTaskSpot { id: string; kind: string; room: string; label: string; x: number; z: number }
export interface MapVent { id: string; room: string; x: number; z: number; links: string[] }

export interface OfficeMap {
  name: string
  bounds: MapRect
  rooms: MapRoom[]
  walls: WallBox[]
  props: MapProp[]
  taskSpots: MapTaskSpot[]
  vents: MapVent[]
  emergency: { x: number; z: number }
  spawns: { x: number; z: number }[]
}

export function getGameCatalog(): Promise<GameCatalog> {
  return request<GameCatalog>("/games")
}

export interface RoomSummary {
  roomId: string
  name: string
  code: string
  host: string
  phase: string
  private: boolean
  players: number
  maxPlayers: number
  locked: boolean
}

export function listDeducaoRooms(): Promise<RoomSummary[]> {
  return request<RoomSummary[]>("/games/deducao/rooms")
}

export function getOfficeMap(): Promise<{ map: OfficeMap; minPlayers: number; maxPlayers: number }> {
  return request<{ map: OfficeMap; minPlayers: number; maxPlayers: number }>("/games/deducao/map")
}

/// O jogo fala com a mesma API, na mesma porta, só que por WebSocket. Trocar o
/// esquema é tudo que separa um endereço do outro.
export function gameServerUrl(): string {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não configurado")
  return API_URL.replace(/^http/, "ws")
}
