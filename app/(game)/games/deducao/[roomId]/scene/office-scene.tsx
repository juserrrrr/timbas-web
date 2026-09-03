"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import type { Room } from "@colyseus/sdk"
import { moveTowards, PLAYER_RADIUS, distance, hasLineOfSight } from "@/lib/games/collision"
import { playGameSound } from "@/lib/games/game-audio"
import type { OfficeMap } from "@/lib/services/games"
import type { Quality, Targets } from "../match-types"
import type { Role, Snapshot } from "../use-deducao-room"
import { OfficeWorld } from "./office-world"
import { setVision, useVisionMaterial } from "./vision-material"

const VOID_COLOR = "#2a3450"

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
      camera={{ fov: 40, near: 0.1, far: 130, position: [0, 14, 10.5] }}
      onCreated={({ gl }) => {
        // O vazio em volta do escritório é um azul de fim de tarde, não preto:
        // ele precisa ler como ar em volta das lajes, e não como buraco.
        gl.setClearColor(VOID_COLOR)
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
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
  const lastStep = useRef(0)
  const heading = useRef(0)
  const targetSignature = useRef("")
  const sun = useRef<THREE.DirectionalLight>(null)
  const sky = useRef<THREE.HemisphereLight>(null)
  const playerLight = useRef<THREE.PointLight>(null)
  const cameraGoal = useRef(new THREE.Vector3())

  const walls = useMemo(() => map.walls, [map.walls])
  const myTaskSpots = useMemo(
    () => map.taskSpots.filter((spot) => pendingTasks.includes(spot.id)),
    [map.taskSpots, pendingTasks],
  )

  const alive = snapshot.players.find((player) => player.id === me)?.alive ?? true
  const inVent = snapshot.players.find((player) => player.id === me)?.inVent ?? false
  const visionRange = Number(snapshot.config.visionRange ?? 13)

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
        THREE.MathUtils.clamp(next.x, map.bounds.x + PLAYER_RADIUS, map.bounds.x + map.bounds.w - PLAYER_RADIUS),
        THREE.MathUtils.clamp(next.z, map.bounds.z + PLAYER_RADIUS, map.bounds.z + map.bounds.d - PLAYER_RADIUS),
      )
      heading.current = Math.atan2(input.x, input.z)
    }

    // O servidor é a verdade. Quando ele discorda muito, a tela salta; quando
    // discorda pouco, ela vai sendo puxada de volta sem ninguém perceber.
    const drift = Math.hypot(mine.x - local.current.x, mine.z - local.current.y)
    if (drift > 1.8) local.current.set(mine.x, mine.z)
    else if (drift > 0.015) {
      const correction = 1 - Math.exp(-(moving ? 3.2 : 8) * delta)
      local.current.x += (mine.x - local.current.x) * correction
      local.current.y += (mine.z - local.current.y) * correction
    }

    const now = performance.now()
    if (moving && now - lastStep.current > 330) {
      lastStep.current = now
      playGameSound("step")
    }
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
    cameraGoal.current.set(local.current.x, 14, local.current.y + 10.5)
    camera.position.lerp(cameraGoal.current, 1 - Math.exp(-5 * delta))
    camera.lookAt(local.current.x, 0.9, local.current.y - 1.6)

    const dark = snapshot.blackout
    const activeVision = dark ? Math.min(4.2, visionRange * 0.42) : visionRange
    setVision(local.current.x, local.current.y, activeVision * 0.68, activeVision)
    if (sun.current) {
      sun.current.position.set(local.current.x - 14, 26, local.current.y - 10)
      sun.current.target.position.set(local.current.x, 0, local.current.y)
      sun.current.target.updateMatrixWorld()
      sun.current.intensity += ((dark ? 0.06 : 1.3) - sun.current.intensity) * Math.min(1, delta * 3)
    }
    if (sky.current) {
      sky.current.intensity += ((dark ? 0.05 : 1.15) - sky.current.intensity) * Math.min(1, delta * 3)
    }
    if (playerLight.current) {
      playerLight.current.position.set(local.current.x, 3.2, local.current.y)
      playerLight.current.intensity += ((dark ? 3.1 : 0.45) - playerLight.current.intensity) * Math.min(1, delta * 5)
      playerLight.current.distance = dark ? activeVision * 1.55 : 8
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
      <fog attach="fog" args={[VOID_COLOR, 34, 92]} />
      <ambientLight color="#d5def2" intensity={0.38} />
      <hemisphereLight ref={sky} args={["#ffffff", "#61708f", 1.15]} />
      <directionalLight
        ref={sun}
        color="#fff2df"
        intensity={1.3}
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
      <pointLight ref={playerLight} color="#e8f1ff" intensity={0.45} distance={8} decay={1.7} />

      <OfficeWorld map={map} quality={quality} blackout={snapshot.blackout} />
      <Markers
        map={map}
        spots={myTaskSpots}
        showVents={role === "assassino"}
        localRef={local}
        walls={walls}
        visionRange={snapshot.blackout ? Math.min(4.2, visionRange * 0.42) : visionRange}
      />

      {snapshot.players.map((player) => (
        <Actor
          key={player.id}
          player={player}
          roomRef={roomRef}
          isMe={player.id === me}
          localRef={local}
          localHeadingRef={heading}
          viewerAlive={alive}
          ally={allies.includes(player.id)}
          quality={quality}
          walls={walls}
          visionRange={snapshot.blackout ? Math.min(4.2, visionRange * 0.42) : visionRange}
          blackout={snapshot.blackout}
        />
      ))}

      {snapshot.corpses.map((corpse) => (
        <Corpse
          key={corpse.id}
          corpse={corpse}
          localRef={local}
          viewerAlive={alive}
          walls={walls}
          visionRange={snapshot.blackout ? Math.min(4.2, visionRange * 0.42) : visionRange}
          blackout={snapshot.blackout}
        />
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
  localHeadingRef,
  viewerAlive,
  ally,
  quality,
  walls,
  visionRange,
  blackout,
}: {
  player: Snapshot["players"][number]
  roomRef: React.MutableRefObject<Room | null>
  isMe: boolean
  localRef: React.MutableRefObject<THREE.Vector2>
  localHeadingRef: React.MutableRefObject<number>
  viewerAlive: boolean
  ally: boolean
  quality: Quality
  walls: OfficeMap["walls"]
  visionRange: number
  blackout: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const bodyGroup = useRef<THREE.Group>(null)
  const label = useRef<HTMLSpanElement>(null)
  const bob = useRef(0)
  const placed = useRef(false)
  const lastVisibleAt = useRef(0)
  const body = useVisionMaterial({ color: blackout ? "#6f7c8e" : player.color, roughness: 0.38, metalness: 0.06 })
  const visor = useVisionMaterial({ color: "#121a26", emissive: "#9fdcff", emissiveIntensity: 0.7, roughness: 0.15 })

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
    const pull = isMe ? 1 : 1 - Math.exp(-10 * delta)

    if (!placed.current) {
      node.position.set(targetX, 0, targetZ)
      node.rotation.y = isMe ? localHeadingRef.current : live.dir
      placed.current = true
    }

    node.position.x += (targetX - node.position.x) * pull
    node.position.z += (targetZ - node.position.z) * pull
    const inSight =
      !viewerAlive ||
      isMe ||
      (distance({ x: localRef.current.x, z: localRef.current.y }, { x: live.x, z: live.z }) <= visionRange &&
        hasLineOfSight({ x: localRef.current.x, z: localRef.current.y }, { x: live.x, z: live.z }, walls))
    if (inSight) lastVisibleAt.current = performance.now()
    node.visible = !hidden && !live.inVent && (inSight || performance.now() - lastVisibleAt.current < 120)
    if (label.current) label.current.style.visibility = node.visible ? "visible" : "hidden"

    const rawFacing = isMe ? localHeadingRef.current : live.dir
    const facing = Math.atan2(Math.sin(rawFacing), Math.cos(rawFacing))
    node.rotation.y +=
      Math.atan2(Math.sin(facing - node.rotation.y), Math.cos(facing - node.rotation.y)) * (1 - Math.exp(-12 * delta))

    bob.current += live.moving ? delta * 11 : 0
    const wantedBob = live.moving ? Math.abs(Math.sin(bob.current)) * 0.065 : 0
    if (bodyGroup.current) {
      bodyGroup.current.position.y += (0.62 + wantedBob - bodyGroup.current.position.y) * (1 - Math.exp(-16 * delta))
    }
  })

  return (
    <group ref={group}>
      <group ref={bodyGroup} position={[0, 0.62, 0]}>
        <mesh castShadow={quality !== "baixo"} material={body}>
          <capsuleGeometry args={[0.34, 0.48, 4, 10]} />
        </mesh>
        <mesh position={[0, 0.52, 0]} castShadow={quality !== "baixo"} material={body}>
          <sphereGeometry args={[0.27, 14, 12]} />
        </mesh>
        <mesh position={[0, 0.54, 0.22]} material={visor}>
          <boxGeometry args={[0.3, 0.16, 0.08]} />
        </mesh>
        <mesh position={[0, 0.05, -0.31]} castShadow={quality !== "baixo"} material={body}>
          <boxGeometry args={[0.5, 0.62, 0.22]} />
        </mesh>
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#101728" transparent opacity={0.22} />
      </mesh>

      {/* Nome no duto entregaria o assassino escondido, então a plaquinha some
          junto com o corpo. */}
      {!hidden && !player.inVent && (
        <Html position={[0, 1.85, 0]} center distanceFactor={17} pointerEvents="none" zIndexRange={[10, 0]}>
          <span
            ref={label}
            className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[13px] font-black tracking-tight ${ghost ? "opacity-50" : ""}`}
            style={{ color: blackout ? "#cbd5e1" : player.color, textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
          >
            {player.name}
            {ally && !blackout && <span className="ml-1 text-red-400">◆</span>}
          </span>
        </Html>
      )}
    </group>
  )
}

function Corpse({
  corpse,
  localRef,
  viewerAlive,
  walls,
  visionRange,
  blackout,
}: {
  corpse: Snapshot["corpses"][number]
  localRef: React.MutableRefObject<THREE.Vector2>
  viewerAlive: boolean
  walls: OfficeMap["walls"]
  visionRange: number
  blackout: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const material = useVisionMaterial({ color: blackout ? "#657180" : corpse.color, roughness: 0.7 })

  useFrame(() => {
    if (!group.current) return
    group.current.visible =
      !viewerAlive ||
      (distance({ x: localRef.current.x, z: localRef.current.y }, corpse) <= visionRange &&
        hasLineOfSight({ x: localRef.current.x, z: localRef.current.y }, corpse, walls))
  })

  return (
    <group ref={group} position={[corpse.x, 0, corpse.z]}>
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

function Markers({
  map,
  spots,
  showVents,
  localRef,
  walls,
  visionRange,
}: {
  map: OfficeMap
  spots: OfficeMap["taskSpots"]
  showVents: boolean
  localRef: React.MutableRefObject<THREE.Vector2>
  walls: OfficeMap["walls"]
  visionRange: number
}) {
  const ring = useRef<THREE.Group>(null)
  const emergency = useRef<THREE.Mesh>(null)
  const vents = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const origin = { x: localRef.current.x, z: localRef.current.y }
    const visible = (point: { x: number; z: number }) =>
      distance(origin, point) <= visionRange && hasLineOfSight(origin, point, walls)

    if (ring.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.08
      ring.current.children.forEach((child, index) => {
        child.scale.setScalar(pulse)
        child.visible = Boolean(spots[index] && visible(spots[index]))
      })
    }
    if (emergency.current) emergency.current.visible = visible(map.emergency)
    vents.current?.children.forEach((child, index) => {
      child.visible = Boolean(map.vents[index] && visible(map.vents[index]))
    })
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

      <mesh ref={emergency} position={[map.emergency.x, 0.55, map.emergency.z]}>
        <cylinderGeometry args={[0.34, 0.4, 1.1, 12]} />
        <meshStandardMaterial color="#7f1d1d" emissive="#ef4444" emissiveIntensity={0.75} roughness={0.4} />
      </mesh>

      {showVents && (
        <group ref={vents}>
          {map.vents.map((vent) => (
            <mesh key={vent.id} position={[vent.x, 0.05, vent.z]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[1.1, 1.1]} />
              <meshBasicMaterial color="#263548" />
            </mesh>
          ))}
        </group>
      )}
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
      if (
        gap <= Number(snapshot.config.killRange ?? 2.2) &&
        gap < best &&
        hasLineOfSight(position, { x: live.x, z: live.z }, walls)
      ) {
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
