"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import type { Room } from "@colyseus/sdk"
import { moveTowards, PLAYER_RADIUS, distance } from "@/lib/games/collision"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality, Targets } from "../match-types"
import type { Role, Snapshot } from "../use-deducao-room"
import { OfficeWorld } from "./office-world"
import { setVision, useVisionMaterial } from "./vision-material"

const WALK_SPEED = 4.6
const SEND_EVERY_MS = 50
const TASK_RANGE = 2.2
const REPORT_RANGE = 2.6
const VENT_RANGE = 1.8

export interface InputState {
  x: number
  z: number
}

interface Props {
  map: OfficeMap
  snapshot: Snapshot
  roomRef: React.MutableRefObject<Room | null>
  me: string
  role: Role | null
  allies: string[]
  pendingTasks: string[]
  quality: Quality
  inputRef: React.MutableRefObject<InputState>
  onTargets: (targets: Targets) => void
}

export function OfficeScene(props: Props) {
  const { quality } = props
  return (
    <Canvas
      shadows={quality !== "baixo"}
      dpr={quality === "alto" ? [1, 1.75] : quality === "medio" ? [1, 1.25] : 1}
      gl={{ antialias: quality === "alto", powerPreference: "high-performance" }}
      camera={{ fov: 34, near: 1, far: 120, position: [0, 26, 18] }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}

function SceneContent({ map, snapshot, roomRef, me, role, allies, pendingTasks, quality, inputRef, onTargets }: Props) {
  const { camera } = useThree()
  const local = useRef(new THREE.Vector2())
  const started = useRef(false)
  const lastSent = useRef(0)
  const heading = useRef(0)
  const targetSignature = useRef("")
  const sun = useRef<THREE.DirectionalLight>(null)

  const walls = useMemo(() => map.walls, [map.walls])
  const myTaskSpots = useMemo(
    () => map.taskSpots.filter((spot) => pendingTasks.includes(spot.id)),
    [map.taskSpots, pendingTasks],
  )

  const alive = snapshot.players.find((player) => player.id === me)?.alive ?? true
  const inVent = snapshot.players.find((player) => player.id === me)?.inVent ?? false

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const state = roomRef.current?.state as any
    const mine = state?.players?.get?.(me)
    if (!mine) return

    if (!started.current) {
      local.current.set(mine.x, mine.z)
      started.current = true
    }

    const canWalk = snapshot.phase === "jogando" || snapshot.phase === "lobby"
    const input = inputRef.current
    const moving = canWalk && !inVent && (input.x !== 0 || input.z !== 0)

    if (moving) {
      const length = Math.hypot(input.x, input.z) || 1
      const step = WALK_SPEED * delta
      const wanted = {
        x: local.current.x + (input.x / length) * step,
        z: local.current.y + (input.z / length) * step,
      }
      // Jogador morto atravessa paredes.
      const next = alive ? moveTowards({ x: local.current.x, z: local.current.y }, wanted, walls) : wanted
      local.current.set(
        THREE.MathUtils.clamp(next.x, PLAYER_RADIUS, map.bounds.w - PLAYER_RADIUS),
        THREE.MathUtils.clamp(next.z, PLAYER_RADIUS, map.bounds.d - PLAYER_RADIUS),
      )
      heading.current = Math.atan2(input.x, input.z)
    }

    // O servidor é a verdade. Quando ele discorda muito, a tela salta; quando
    // discorda pouco, ela vai sendo puxada de volta sem ninguém perceber.
    const drift = Math.hypot(mine.x - local.current.x, mine.z - local.current.y)
    if (drift > 2.5 || !moving) local.current.set(mine.x, mine.z)
    else if (drift > 0.05) {
      local.current.x += (mine.x - local.current.x) * Math.min(1, delta * 5)
      local.current.y += (mine.z - local.current.y) * Math.min(1, delta * 5)
    }

    const now = performance.now()
    if (now - lastSent.current > SEND_EVERY_MS) {
      lastSent.current = now
      roomRef.current?.send(
        "move" as never,
        {
          x: local.current.x,
          z: local.current.y,
          dir: heading.current,
          moving,
        } as never,
      )
    }

    // Câmera isométrica presa no jogador, sem giro: quem está de frente para a
    // tela é sempre o norte do escritório, e ninguém se perde na virada.
    const wantedCamera = new THREE.Vector3(local.current.x, 24, local.current.y + 16)
    camera.position.lerp(wantedCamera, Math.min(1, delta * 4))
    camera.lookAt(local.current.x, 0.8, local.current.y - 1.2)

    const dark = snapshot.blackout
    setVision(local.current.x, local.current.y, dark ? 3.6 : 9.5, dark ? 7.5 : 18)
    if (sun.current) {
      sun.current.position.set(local.current.x - 14, 26, local.current.y - 10)
      sun.current.target.position.set(local.current.x, 0, local.current.y)
      sun.current.target.updateMatrixWorld()
      sun.current.intensity += ((dark ? 0.16 : 1.1) - sun.current.intensity) * Math.min(1, delta * 3)
    }

    reportTargets({
      state,
      me,
      map,
      myTaskSpots,
      role,
      allies,
      snapshot,
      walls,
      position: { x: local.current.x, z: local.current.y },
      onTargets,
      signature: targetSignature,
    })
  })

  return (
    <>
      <hemisphereLight args={["#cbd9ff", "#191b24", 0.55]} />
      <directionalLight
        ref={sun}
        color="#ffd8a8"
        intensity={1.1}
        castShadow={quality !== "baixo"}
        shadow-mapSize={quality === "alto" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0012}
      />

      <OfficeWorld map={map} quality={quality} />
      <Markers map={map} spots={myTaskSpots} showVents={role === "assassino"} />

      {snapshot.players.map((player) => (
        <Actor
          key={player.id}
          player={player}
          roomRef={roomRef}
          isMe={player.id === me}
          localRef={local}
          viewerAlive={alive}
          ally={allies.includes(player.id)}
          quality={quality}
        />
      ))}

      {snapshot.corpses.map((corpse) => (
        <Corpse key={corpse.id} corpse={corpse} />
      ))}
    </>
  )
}

// ── Atores ────────────────────────────────────────────────────────────────────

function Actor({
  player,
  roomRef,
  isMe,
  localRef,
  viewerAlive,
  ally,
  quality,
}: {
  player: Snapshot["players"][number]
  roomRef: React.MutableRefObject<Room | null>
  isMe: boolean
  localRef: React.MutableRefObject<THREE.Vector2>
  viewerAlive: boolean
  ally: boolean
  quality: Quality
}) {
  const group = useRef<THREE.Group>(null)
  const bob = useRef(0)
  const body = useVisionMaterial({ color: player.color, roughness: 0.55 })
  const visor = useVisionMaterial({ color: "#0e1218", emissive: "#7dd3fc", emissiveIntensity: 0.5, roughness: 0.2 })

  // Quem está vivo não vê fantasma. É a única informação que a tela esconde por
  // conta própria, e ela vale para todo mundo do mesmo jeito.
  const hidden = !player.alive && viewerAlive
  const ghost = !player.alive && !viewerAlive

  useFrame((_, rawDelta) => {
    const node = group.current
    const state = roomRef.current?.state as any
    const live = state?.players?.get?.(player.id)
    if (!node || !live) return

    const delta = Math.min(rawDelta, 0.1)
    const targetX = isMe ? localRef.current.x : live.x
    const targetZ = isMe ? localRef.current.y : live.z
    const pull = isMe ? 1 : Math.min(1, delta * 14)

    node.position.x += (targetX - node.position.x) * pull
    node.position.z += (targetZ - node.position.z) * pull
    node.visible = !hidden && !live.inVent

    const facing = Math.atan2(Math.sin(live.dir), Math.cos(live.dir))
    node.rotation.y +=
      Math.atan2(Math.sin(facing - node.rotation.y), Math.cos(facing - node.rotation.y)) * Math.min(1, delta * 12)

    // O passinho: o corpo sobe e desce quando anda, e para quando para.
    bob.current += live.moving ? delta * 11 : 0
    node.children[0].position.y = 0.62 + (live.moving ? Math.abs(Math.sin(bob.current)) * 0.07 : 0)
  })

  return (
    <group ref={group}>
      <group position={[0, 0.62, 0]}>
        <mesh castShadow={quality !== "baixo"} material={body}>
          <capsuleGeometry args={[0.34, 0.48, 4, 10]} />
        </mesh>
        <mesh position={[0, 0.52, 0]} castShadow={quality !== "baixo"} material={body}>
          <sphereGeometry args={[0.27, 14, 12]} />
        </mesh>
        <mesh position={[0, 0.54, 0.22]} material={visor}>
          <boxGeometry args={[0.3, 0.16, 0.08]} />
        </mesh>
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>

      {/* Nome no duto entregaria o assassino escondido, então a plaquinha some
          junto com o corpo. */}
      {!hidden && !player.inVent && (
        <Html position={[0, 1.85, 0]} center distanceFactor={17} pointerEvents="none" zIndexRange={[10, 0]}>
          <span
            className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[13px] font-black tracking-tight ${ghost ? "opacity-50" : ""}`}
            style={{ color: player.color, textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
          >
            {player.name}
            {ally && <span className="ml-1 text-red-400">◆</span>}
          </span>
        </Html>
      )}
    </group>
  )
}

function Corpse({ corpse }: { corpse: Snapshot["corpses"][number] }) {
  const material = useVisionMaterial({ color: corpse.color, roughness: 0.7 })
  return (
    <group position={[corpse.x, 0, corpse.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0.6]} position={[0, 0.3, 0]} material={material}>
        <capsuleGeometry args={[0.32, 0.42, 4, 8]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.95, 20]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

// ── Marcadores ────────────────────────────────────────────────────────────────

function Markers({ map, spots, showVents }: { map: OfficeMap; spots: OfficeMap["taskSpots"]; showVents: boolean }) {
  const ring = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (ring.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.08
      ring.current.children.forEach((child) => child.scale.setScalar(pulse))
    }
  })

  return (
    <>
      <group ref={ring}>
        {spots.map((spot) => (
          <mesh key={spot.id} position={[spot.x, 0.06, spot.z]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.6, 0.82, 22]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>

      <mesh position={[map.emergency.x, 0.55, map.emergency.z]}>
        <cylinderGeometry args={[0.34, 0.4, 1.1, 12]} />
        <meshStandardMaterial color="#7f1d1d" emissive="#ef4444" emissiveIntensity={0.75} roughness={0.4} />
      </mesh>

      {showVents &&
        map.vents.map((vent) => (
          <mesh key={vent.id} position={[vent.x, 0.05, vent.z]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[1.1, 1.1]} />
            <meshBasicMaterial color="#1f2937" />
          </mesh>
        ))}
    </>
  )
}

// ── O que dá para fazer daqui ─────────────────────────────────────────────────

function reportTargets({
  state,
  me,
  map,
  myTaskSpots,
  role,
  allies,
  snapshot,
  walls,
  position,
  onTargets,
  signature,
}: {
  state: any
  me: string
  map: OfficeMap
  myTaskSpots: OfficeMap["taskSpots"]
  role: Role | null
  allies: string[]
  snapshot: Snapshot
  walls: OfficeMap["walls"]
  position: { x: number; z: number }
  onTargets: (targets: Targets) => void
  signature: React.MutableRefObject<string>
}) {
  const task = myTaskSpots.find((spot) => distance(position, spot) <= TASK_RANGE) ?? null
  const corpse = snapshot.corpses.find((body) => !body.reported && distance(position, body) <= REPORT_RANGE) ?? null
  const emergency = distance(position, map.emergency) <= REPORT_RANGE
  const vent = role === "assassino" ? (map.vents.find((item) => distance(position, item) <= VENT_RANGE) ?? null) : null

  let kill: { id: string; name: string } | null = null
  if (role === "assassino") {
    let best = Number.POSITIVE_INFINITY
    snapshot.players.forEach((player) => {
      if (player.id === me || !player.alive || allies.includes(player.id)) return
      const live = state?.players?.get?.(player.id)
      if (!live) return
      const gap = distance(position, { x: live.x, z: live.z })
      if (gap <= Number(snapshot.config.killRange ?? 2.2) && gap < best) {
        best = gap
        kill = { id: player.id, name: player.name }
      }
    })
  }

  const next: Targets = { task, corpse, emergency, vent, kill }
  const stamp = JSON.stringify([task?.id, corpse?.id, emergency, vent?.id, (kill as { id: string } | null)?.id])
  if (stamp === signature.current) return
  signature.current = stamp
  onTargets(next)
}
