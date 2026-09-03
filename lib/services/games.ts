import { API_URL } from "../api-base"
import { post, request } from "./http"

export interface GameSummary {
  id: string
  name: string
  tagline: string
  description: string
  players: string
  minutes: string
  href: string
}

export interface GameCatalog {
  games: GameSummary[]
}

export interface MapRect {
  x: number
  z: number
  w: number
  d: number
}
export interface WallBox {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
  accent?: string
  /// Chega na altura dos olhos, então além de barrar o corpo também corta a
  /// linha de visão. Mesa e sofá não.
  tall?: boolean
  level?: number
  style?: "parede" | "guarda-corpo"
}
export interface MapRoom {
  id: string
  name: string
  rect: MapRect
  kind: "sala" | "corredor" | "terraco"
  level?: number
  floor: string
  finish?:
    | "carpet"
    | "patternedCarpet"
    | "wood"
    | "parquet"
    | "server"
    | "terrazzo"
    | "vinyl"
    | "pantry"
    | "concrete"
  light: string
  doors?: Array<{
    side: "north" | "south" | "east" | "west"
    at: number
    width: number
  }>
}
export interface MapProp {
  kind: string
  x: number
  z: number
  rot: number
  level?: number
}
export interface MapTaskSpot {
  id: string
  kind: string
  room: string
  label: string
  x: number
  z: number
  level?: number
}
export interface MapVent {
  id: string
  room: string
  x: number
  z: number
  links: string[]
  level?: number
}
export interface MapStair {
  id: string
  level: number
  x: number
  z: number
  rot: number
  targetLevel: number
  targetX: number
  targetZ: number
}

export interface OfficeMap {
  name: string
  bounds: MapRect
  rooms: MapRoom[]
  walls: WallBox[]
  /// A pegada dos móveis no chão. Separada das paredes porque nem todo móvel
  /// corta a visão.
  obstacles: WallBox[]
  props: MapProp[]
  taskSpots: MapTaskSpot[]
  vents: MapVent[]
  stairs: MapStair[]
  emergency: { x: number; z: number; level?: number }
  spawns: { x: number; z: number; level?: number }[]
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

/// Entrada de uso único para abrir a conexão da sala. O WebSocket não leva o
/// cookie de sessão, então é este bilhete que diz para a API quem está entrando.
export function createGameTicket(): Promise<{ ticket: string }> {
  return post<{ ticket: string }>("/games/deducao/ticket")
}

const roomPasswordKey = (roomId: string) => `timbas_deducao_password_${roomId}`

export function saveDeducaoRoomPassword(roomId: string, password: string) {
  try {
    window.sessionStorage.setItem(roomPasswordKey(roomId), password)
  } catch {
    // O navegador pode bloquear o armazenamento em sessões privadas restritas.
  }
}

export function getDeducaoRoomPassword(roomId: string): string | undefined {
  try {
    return window.sessionStorage.getItem(roomPasswordKey(roomId)) ?? undefined
  } catch {
    return undefined
  }
}

export function clearDeducaoRoomPassword(roomId: string) {
  try {
    window.sessionStorage.removeItem(roomPasswordKey(roomId))
  } catch {
    // Nenhuma senha foi guardada neste navegador.
  }
}

export function listDeducaoRooms(): Promise<RoomSummary[]> {
  return request<RoomSummary[]>("/games/deducao/rooms")
}

export function getOfficeMap(): Promise<{
  map: OfficeMap
  minPlayers: number
  maxPlayers: number
}> {
  return request<{ map: OfficeMap; minPlayers: number; maxPlayers: number }>("/games/deducao/map")
}

/// O jogo fala com a mesma API, na mesma porta, só que por WebSocket. Trocar o
/// esquema é tudo que separa um endereço do outro.
export function gameServerUrl(): string {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não configurado")
  return API_URL.replace(/^http/, "ws")
}
