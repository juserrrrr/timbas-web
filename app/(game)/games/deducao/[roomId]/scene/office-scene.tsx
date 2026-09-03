"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import type { Room } from "@colyseus/sdk"
import { moveTowards, PLAYER_RADIUS, distance, hasLineOfSight } from "@/lib/games/collision"
import { playGameSound } from "@/lib/games/game-audio"
import type { OfficeMap } from "@/lib/services/games"
import { NO_TARGETS, type LookState, type Quality, type Targets, type View } from "../match-types"
import type { Role, Snapshot } from "../use-deducao-room"
import { FLOOR_HEIGHT, OfficeWorld } from "./office-world"
import { setVision, useVisionMaterial } from "./vision-material"

const VOID_COLOR = "#3b4d6c"

/// Altura dos olhos. A câmera de primeira pessoa fica aqui, e é por isso que a
/// parede precisa passar dos 2,5m: a 1,55m dava para ver o escritório inteiro
/// por cima e o jogo acabava.
const EYE_HEIGHT = 1.62
const PITCH_LIMIT = 1.05

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
  view: View
  inputRef: React.MutableRefObject<InputState>
  lookRef: React.MutableRefObject<LookState>
  poseRef: React.MutableRefObject<{ x: number; z: number; dir: number }>
  onTargets: (targets: Targets) => void
}

export function OfficeScene(props: Props) {
  const { quality } = props
  return (
    <Canvas
      shadows={quality !== "baixo"}
      dpr={quality === "alto" ? [1, 2] : quality === "medio" ? [1, 1.5] : 1}
      gl={{ antialias: quality !== "baixo", powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 40, near: 0.1, far: 130, position: [0, 14, 10.5] }}
      onCreated={({ gl }) => {
        // O vazio em volta do escritório é um azul de fim de tarde, não preto:
        // ele precisa ler como ar em volta das lajes, e não como buraco.
        gl.setClearColor(VOID_COLOR)
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.16
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}

function ProceduralEnvironment({ quality, blackout }: { quality: Quality; blackout: boolean }) {
  const { gl, scene } = useThree()
  const enabled = quality !== "baixo"

  useEffect(() => {
    const previous = scene.environment
    if (!enabled) {
      scene.environment = null
      return () => {
        scene.environment = previous
      }
    }

    const generator = new THREE.PMREMGenerator(gl)
    generator.compileCubemapShader()
    const environment = new RoomEnvironment()
    const target = generator.fromScene(environment, quality === "alto" ? 0.025 : 0.04)
    scene.environment = target.texture

    environment.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => material.dispose())
    })
    generator.dispose()

    return () => {
      if (scene.environment === target.texture) scene.environment = previous
      target.dispose()
    }
  }, [enabled, gl, quality, scene])

  useFrame((_, delta) => {
    const target = blackout ? 0.025 : quality === "alto" ? 0.58 : quality === "medio" ? 0.42 : 0
    scene.environmentIntensity +=
      (target - scene.environmentIntensity) * Math.min(1, delta * 3.5)
  })

  return null
}

function SceneContent({
  map,
  snapshot,
  roomRef,
  me,
  role,
  allies,
  pendingTasks,
  quality,
  view,
  inputRef,
  lookRef,
  poseRef,
  onTargets,
}: Props) {
  const { camera, gl } = useThree()
  const local = useRef(new THREE.Vector2())
  const visualY = useRef(0)
  const climbing = useRef(false)
  const stairTransition = useRef<{
    fromX: number
    fromZ: number
    fromY: number
    toX: number
    toZ: number
    toY: number
    startedAt: number
  } | null>(null)
  const started = useRef(false)
  const lastSent = useRef(0)
  const lastStep = useRef(0)
  const heading = useRef(0)
  const targetSignature = useRef("")
  const sun = useRef<THREE.DirectionalLight>(null)
  const sky = useRef<THREE.HemisphereLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const playerLight = useRef<THREE.PointLight>(null)
  const cameraGoal = useRef(new THREE.Vector3())
  const lastLevel = useRef(-1)

  const mineSnapshot = snapshot.players.find((player) => player.id === me)
  const currentLevel = mineSnapshot?.level ?? 0

  // Duas listas, e a diferença importa: no armário você esbarra e some atrás
  // dele; na mesa você esbarra mas continua à vista.
  const colliders = useMemo(
    () =>
      [...map.walls, ...map.obstacles].filter((box) => (box.level ?? 0) === currentLevel),
    [map.walls, map.obstacles, currentLevel],
  )
  const walls = useMemo(
    () =>
      [
        ...map.walls.filter((box) => box.style !== "guarda-corpo"),
        ...map.obstacles.filter((box) => box.tall),
      ].filter((box) => (box.level ?? 0) === currentLevel),
    [map.walls, map.obstacles, currentLevel],
  )
  const myTaskSpots = useMemo(
    () =>
      map.taskSpots.filter(
        (spot) => pendingTasks.includes(spot.id) && (spot.level ?? 0) === currentLevel,
      ),
    [map.taskSpots, pendingTasks, currentLevel],
  )

  const alive = mineSnapshot?.alive ?? true
  const inVent = mineSnapshot?.inVent ?? false
  const visionRange = Number(snapshot.config.visionRange ?? 13)
  // No apagão o assassino enxerga igual. É ele quem apagou a luz, e é essa
  // vantagem que faz valer a pena apagar.
  const blackoutForViewer = snapshot.blackout && role !== "assassino"
  const activeVision = blackoutForViewer ? Math.min(4.2, visionRange * 0.42) : visionRange

  // Olhar com o mouse. O clique tranca o ponteiro; o Esc destranca, e aí o
  // jogador volta a ter cursor para clicar nos botões do HUD.
  useEffect(() => {
    if (view !== "primeira") return
    const canvas = gl.domElement

    const pedirTrava = () => {
      if (document.pointerLockElement !== canvas) void canvas.requestPointerLock()
    }
    const mover = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      lookRef.current.yaw -= event.movementX * 0.0022
      lookRef.current.pitch = THREE.MathUtils.clamp(
        lookRef.current.pitch - event.movementY * 0.0022,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      )
    }

    canvas.addEventListener("click", pedirTrava)
    document.addEventListener("mousemove", mover)
    return () => {
      canvas.removeEventListener("click", pedirTrava)
      document.removeEventListener("mousemove", mover)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
  }, [gl, lookRef, view])

  // No celular não tem ponteiro para trancar: arrastar o dedo na metade direita
  // da tela vira o olhar, que é onde o polegar já está e onde não tem manche.
  useEffect(() => {
    if (view !== "primeira") return
    const canvas = gl.domElement
    let ultimo: { id: number; x: number; y: number } | null = null

    const comeca = (event: TouchEvent) => {
      const toque = [...event.changedTouches].find((item) => item.clientX > window.innerWidth / 2)
      if (toque && !ultimo) ultimo = { id: toque.identifier, x: toque.clientX, y: toque.clientY }
    }
    const arrasta = (event: TouchEvent) => {
      if (!ultimo) return
      const marca = ultimo
      const toque = [...event.changedTouches].find((item) => item.identifier === marca.id)
      if (!toque) return
      lookRef.current.yaw -= (toque.clientX - marca.x) * 0.006
      lookRef.current.pitch = THREE.MathUtils.clamp(
        lookRef.current.pitch - (toque.clientY - marca.y) * 0.006,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      )
      ultimo = { id: marca.id, x: toque.clientX, y: toque.clientY }
    }
    const termina = (event: TouchEvent) => {
      const marca = ultimo
      if (marca && [...event.changedTouches].some((item) => item.identifier === marca.id)) ultimo = null
    }

    canvas.addEventListener("touchstart", comeca, { passive: true })
    canvas.addEventListener("touchmove", arrasta, { passive: true })
    canvas.addEventListener("touchend", termina, { passive: true })
    canvas.addEventListener("touchcancel", termina, { passive: true })
    return () => {
      canvas.removeEventListener("touchstart", comeca)
      canvas.removeEventListener("touchmove", arrasta)
      canvas.removeEventListener("touchend", termina)
      canvas.removeEventListener("touchcancel", termina)
    }
  }, [gl, lookRef, view])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const now = performance.now()
    const state = roomRef.current?.state as any
    const mine = state?.players?.get?.(me)
    if (!mine) return

    if (!started.current) {
      local.current.set(mine.x, mine.z)
      started.current = true
      lastLevel.current = Number(mine.level ?? 0)
      visualY.current = lastLevel.current * FLOOR_HEIGHT
    }

    const liveLevel = Number(mine.level ?? 0)
    if (liveLevel !== lastLevel.current) {
      stairTransition.current = {
        fromX: local.current.x,
        fromZ: local.current.y,
        fromY: visualY.current,
        toX: mine.x,
        toZ: mine.z,
        toY: liveLevel * FLOOR_HEIGHT,
        startedAt: now,
      }
      lastLevel.current = liveLevel
      playGameSound("action")
    }

    const transition = stairTransition.current
    let onStairs = false
    if (transition) {
      const progress = THREE.MathUtils.clamp((now - transition.startedAt) / 900, 0, 1)
      const eased = progress * progress * (3 - 2 * progress)
      local.current.set(
        THREE.MathUtils.lerp(transition.fromX, transition.toX, eased),
        THREE.MathUtils.lerp(transition.fromZ, transition.toZ, eased),
      )
      visualY.current = THREE.MathUtils.lerp(transition.fromY, transition.toY, eased)
      onStairs = progress < 1
      const stairFacing = Math.atan2(transition.toX - transition.fromX, transition.toZ - transition.fromZ)
      heading.current = stairFacing
      if (view === "primeira") {
        const targetYaw = stairFacing - Math.PI
        lookRef.current.yaw +=
          Math.atan2(
            Math.sin(targetYaw - lookRef.current.yaw),
            Math.cos(targetYaw - lookRef.current.yaw),
          ) * Math.min(1, delta * 4.5)
        lookRef.current.pitch += (0 - lookRef.current.pitch) * Math.min(1, delta * 4.5)
      }
      if (!onStairs) {
        stairTransition.current = null
        local.current.set(mine.x, mine.z)
        visualY.current = liveLevel * FLOOR_HEIGHT
      }
    } else {
      visualY.current +=
        (liveLevel * FLOOR_HEIGHT - visualY.current) * Math.min(1, delta * 10)
    }
    climbing.current = onStairs

    const canWalk = (snapshot.phase === "jogando" || snapshot.phase === "lobby") && !onStairs
    const input = inputRef.current
    const moving = canWalk && !inVent && (input.x !== 0 || input.z !== 0)

    if (moving) {
      const length = Math.hypot(input.x, input.z) || 1
      const step = WALK_SPEED * delta
      // Na câmera de cima, W é o norte do escritório. Em primeira pessoa, W é
      // para onde a cabeça aponta, senão andar vira quebra-cabeça.
      let dirX = input.x / length
      let dirZ = input.z / length
      if (view === "primeira") {
        const yaw = lookRef.current.yaw
        const frente = -dirZ
        const lado = dirX
        dirX = -Math.sin(yaw) * frente + Math.cos(yaw) * lado
        dirZ = -Math.cos(yaw) * frente - Math.sin(yaw) * lado
      }
      const wanted = {
        x: local.current.x + dirX * step,
        z: local.current.y + dirZ * step,
      }
      // Jogador morto atravessa paredes.
      const next = alive ? moveTowards({ x: local.current.x, z: local.current.y }, wanted, colliders) : wanted
      local.current.set(
        THREE.MathUtils.clamp(next.x, map.bounds.x + PLAYER_RADIUS, map.bounds.x + map.bounds.w - PLAYER_RADIUS),
        THREE.MathUtils.clamp(next.z, map.bounds.z + PLAYER_RADIUS, map.bounds.z + map.bounds.d - PLAYER_RADIUS),
      )
    }

    // Quem manda no corpo é o olhar, em primeira pessoa, e o passo, na câmera de
    // cima. Só no primeiro caso dá para andar de lado continuando de frente, e
    // parado o corpo ainda gira: quem está atrás precisa ver você virar.
    if (view === "primeira") heading.current = lookRef.current.yaw + Math.PI
    else if (moving) heading.current = Math.atan2(input.x, input.z)

    // O servidor é a verdade. Quando ele discorda muito, a tela salta; quando
    // discorda pouco, ela vai sendo puxada de volta sem ninguém perceber.
    const drift = Math.hypot(mine.x - local.current.x, mine.z - local.current.y)
    if (!onStairs && drift > 1.8) local.current.set(mine.x, mine.z)
    else if (!onStairs && drift > 0.015) {
      const correction = 1 - Math.exp(-(moving ? 3.2 : 8) * delta)
      local.current.x += (mine.x - local.current.x) * correction
      local.current.y += (mine.z - local.current.y) * correction
    }

    if ((moving || onStairs) && now - lastStep.current > 330) {
      lastStep.current = now
      playGameSound("step")
    }
    if (!onStairs && now - lastSent.current > SEND_EVERY_MS) {
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

    if (view === "primeira") {
      // A câmera senta na cabeça do jogador, sem suavizar: atraso entre o passo
      // e a imagem em primeira pessoa embrulha o estômago. Dentro do duto ela
      // afunda, que é a única pista visual de que você está lá embaixo.
      camera.position.set(local.current.x, visualY.current + EYE_HEIGHT - (inVent ? 1.15 : 0), local.current.y)
      camera.rotation.order = "YXZ"
      camera.rotation.set(lookRef.current.pitch, lookRef.current.yaw, 0)
    } else {
      // Câmera isométrica presa no jogador, sem giro: quem está de frente para a
      // tela é sempre o norte do escritório, e ninguém se perde na virada.
      cameraGoal.current.set(local.current.x, visualY.current + 14, local.current.y + 10.5)
      camera.position.lerp(cameraGoal.current, 1 - Math.exp(-5 * delta))
      camera.rotation.order = "XYZ"
      camera.lookAt(local.current.x, visualY.current + 0.9, local.current.y - 1.6)
    }

    poseRef.current.x = local.current.x
    poseRef.current.z = local.current.y
    poseRef.current.dir = heading.current

    const dark = blackoutForViewer
    setVision(local.current.x, local.current.y, activeVision * 0.68, activeVision)
    if (sun.current) {
      sun.current.position.set(local.current.x - 14, visualY.current + 26, local.current.y - 10)
      sun.current.target.position.set(local.current.x, visualY.current, local.current.y)
      sun.current.target.updateMatrixWorld()
      sun.current.intensity += ((dark ? 0.025 : 2.05) - sun.current.intensity) * Math.min(1, delta * 3)
    }
    if (sky.current) {
      const skyTarget = dark ? 0.025 : quality === "baixo" ? 0.95 : 0.62
      sky.current.intensity += (skyTarget - sky.current.intensity) * Math.min(1, delta * 3)
    }
    if (ambient.current) {
      const ambientTarget = dark ? 0.018 : quality === "baixo" ? 0.52 : 0.16
      ambient.current.intensity += (ambientTarget - ambient.current.intensity) * Math.min(1, delta * 3)
    }
    if (playerLight.current) {
      playerLight.current.position.set(local.current.x, visualY.current + EYE_HEIGHT + 0.25, local.current.y)
      playerLight.current.intensity += ((dark ? 38 : 2.2) - playerLight.current.intensity) * Math.min(1, delta * 5)
      playerLight.current.distance = dark ? activeVision * 1.7 : 7
    }
    const exposure = dark ? 0.88 : 1.16
    gl.toneMappingExposure += (exposure - gl.toneMappingExposure) * Math.min(1, delta * 3)

    if (onStairs) {
      if (targetSignature.current !== "stairs") {
        targetSignature.current = "stairs"
        onTargets(NO_TARGETS)
      }
    } else {
      reportTargets({
        state,
        me,
        map,
        myTaskSpots,
        role,
        allies,
        snapshot,
        walls,
        level: currentLevel,
        position: { x: local.current.x, z: local.current.y },
        onTargets,
        signature: targetSignature,
      })
    }
  })

  return (
    <>
      <ProceduralEnvironment quality={quality} blackout={blackoutForViewer} />
      <ambientLight ref={ambient} color="#dce8ff" intensity={0.16} />
      <hemisphereLight ref={sky} args={["#f5f9ff", "#52627d", 0.62]} />
      <directionalLight
        ref={sun}
        color="#ffe7c2"
        intensity={2.05}
        castShadow={quality !== "baixo"}
        shadow-mapSize={quality === "alto" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
        shadow-radius={quality === "alto" ? 3 : 1.5}
      />
      <pointLight ref={playerLight} color="#e8f3ff" intensity={2.2} distance={7} decay={2} />

      {(view === "primeira" || currentLevel === 1 ? [0, 1] : [0]).map((floor) => (
        <OfficeWorld
          key={floor}
          map={map}
          quality={quality}
          blackout={blackoutForViewer}
          view={view}
          level={floor}
          baseY={floor * FLOOR_HEIGHT}
          active={floor === currentLevel}
        />
      ))}
      <group position-y={currentLevel * FLOOR_HEIGHT}>
        <Markers
          map={map}
          spots={myTaskSpots}
          showVents={role === "assassino"}
          localRef={local}
          walls={walls}
          visionRange={activeVision}
          level={currentLevel}
        />
      </group>

      {snapshot.players.map((player) => (
        <Actor
          key={player.id}
          player={player}
          roomRef={roomRef}
          isMe={player.id === me}
          localRef={local}
          localYRef={visualY}
          climbingRef={climbing}
          localHeadingRef={heading}
          viewerAlive={alive}
          ally={allies.includes(player.id)}
          quality={quality}
          hideBody={player.id === me && view === "primeira"}
          walls={walls}
          visionRange={activeVision}
          blackout={blackoutForViewer}
          viewerLevel={currentLevel}
        />
      ))}

      {snapshot.corpses
        .filter((corpse) => corpse.level === currentLevel)
        .map((corpse) => (
          <Corpse
            key={corpse.id}
            corpse={corpse}
            localRef={local}
            viewerAlive={alive}
            walls={walls}
            visionRange={activeVision}
            blackout={blackoutForViewer}
            floorY={currentLevel * FLOOR_HEIGHT}
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
  localYRef,
  climbingRef,
  localHeadingRef,
  viewerAlive,
  ally,
  quality,
  hideBody,
  walls,
  visionRange,
  blackout,
  viewerLevel,
}: {
  player: Snapshot["players"][number]
  roomRef: React.MutableRefObject<Room | null>
  isMe: boolean
  localRef: React.MutableRefObject<THREE.Vector2>
  localYRef: React.MutableRefObject<number>
  climbingRef: React.MutableRefObject<boolean>
  localHeadingRef: React.MutableRefObject<number>
  viewerAlive: boolean
  ally: boolean
  quality: Quality
  /// Em primeira pessoa o próprio corpo sai de cena: câmera dentro da cabeça
  /// enxerga o miolo do crânio e nada mais.
  hideBody: boolean
  walls: OfficeMap["walls"]
  visionRange: number
  blackout: boolean
  viewerLevel: number
}) {
  const group = useRef<THREE.Group>(null)
  const bodyGroup = useRef<THREE.Group>(null)
  const pernaEsquerda = useRef<THREE.Group>(null)
  const pernaDireita = useRef<THREE.Group>(null)
  const bracoEsquerdo = useRef<THREE.Group>(null)
  const bracoDireito = useRef<THREE.Group>(null)
  const label = useRef<HTMLSpanElement>(null)
  const passo = useRef(0)
  const balanco = useRef(0)
  const placed = useRef(false)
  const lastVisibleAt = useRef(0)

  const tomBase = blackout ? "#6f7c8e" : player.color
  const tomMembro = useMemo(() => `#${new THREE.Color(tomBase).multiplyScalar(0.72).getHexString()}`, [tomBase])
  const body = useVisionMaterial({ color: tomBase, roughness: 0.38, metalness: 0.06 })
  const limbs = useVisionMaterial({ color: tomMembro, roughness: 0.45, metalness: 0.04 })
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
    const targetY = isMe ? localYRef.current : Number(live.level ?? 0) * FLOOR_HEIGHT
    const pull = isMe ? 1 : 1 - Math.exp(-10 * delta)

    if (!placed.current) {
      node.position.set(targetX, targetY, targetZ)
      node.rotation.y = isMe ? localHeadingRef.current : live.dir
      placed.current = true
    }

    node.position.x += (targetX - node.position.x) * pull
    node.position.y += (targetY - node.position.y) * pull
    node.position.z += (targetZ - node.position.z) * pull
    const sameLevel = Number(live.level ?? 0) === viewerLevel
    const inSight =
      sameLevel &&
      (!viewerAlive ||
        isMe ||
        (distance({ x: localRef.current.x, z: localRef.current.y }, { x: live.x, z: live.z }) <= visionRange &&
          hasLineOfSight({ x: localRef.current.x, z: localRef.current.y }, { x: live.x, z: live.z }, walls)))
    if (inSight) lastVisibleAt.current = performance.now()
    node.visible =
      sameLevel &&
      !hideBody &&
      !hidden &&
      !live.inVent &&
      (inSight || performance.now() - lastVisibleAt.current < 120)
    if (label.current) label.current.style.visibility = node.visible ? "visible" : "hidden"
    if (!node.visible) return

    const rawFacing = isMe ? localHeadingRef.current : live.dir
    const facing = Math.atan2(Math.sin(rawFacing), Math.cos(rawFacing))
    node.rotation.y +=
      Math.atan2(Math.sin(facing - node.rotation.y), Math.cos(facing - node.rotation.y)) * (1 - Math.exp(-12 * delta))

    // Braço e perna andam em oposição, e a amplitude sobe e desce em rampa: o
    // boneco não pode travar a passada no meio quando o jogador solta a tecla.
    const walking = Boolean(live.moving) || (isMe && climbingRef.current)
    passo.current += walking ? delta * 9 : 0
    balanco.current += ((walking ? 0.62 : 0) - balanco.current) * (1 - Math.exp(-9 * delta))
    const giro = Math.sin(passo.current) * balanco.current
    if (pernaEsquerda.current) pernaEsquerda.current.rotation.x = giro
    if (pernaDireita.current) pernaDireita.current.rotation.x = -giro
    if (bracoEsquerdo.current) bracoEsquerdo.current.rotation.x = -giro * 0.8
    if (bracoDireito.current) bracoDireito.current.rotation.x = giro * 0.8

    if (bodyGroup.current) {
      const sobe = Math.abs(Math.sin(passo.current)) * balanco.current * 0.07
      bodyGroup.current.position.y += (sobe - bodyGroup.current.position.y) * (1 - Math.exp(-16 * delta))
    }
  })

  const sombras = quality !== "baixo"

  return (
    <group ref={group}>
      <group ref={bodyGroup}>
        {/* Quadril e tronco. A cápsula estreita no ombro e larga na cintura é o
            que dá silhueta de gente em vez de cápsula em pé. */}
        <mesh position={[0, 1.12, 0]} castShadow={sombras} material={body}>
          <capsuleGeometry args={[0.26, 0.36, 4, 12]} />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow={sombras} material={body}>
          <capsuleGeometry args={[0.21, 0.14, 3, 12]} />
        </mesh>
        <mesh position={[0, 1.16, -0.24]} castShadow={sombras} material={limbs}>
          <boxGeometry args={[0.34, 0.44, 0.18]} />
        </mesh>

        {/* Cabeça e viseira. */}
        <mesh position={[0, 1.62, 0]} castShadow={sombras} material={body}>
          <sphereGeometry args={[0.21, 16, 14]} />
        </mesh>
        <mesh position={[0, 1.63, 0.15]} material={visor}>
          <boxGeometry args={[0.27, 0.13, 0.1]} />
        </mesh>

        {/* Braços, presos no ombro. */}
        <group ref={bracoEsquerdo} position={[-0.31, 1.36, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow={sombras} material={limbs}>
            <capsuleGeometry args={[0.083, 0.38, 3, 8]} />
          </mesh>
        </group>
        <group ref={bracoDireito} position={[0.31, 1.36, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow={sombras} material={limbs}>
            <capsuleGeometry args={[0.083, 0.38, 3, 8]} />
          </mesh>
        </group>

        {/* Pernas, presas no quadril. */}
        <group ref={pernaEsquerda} position={[-0.13, 0.88, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow={sombras} material={limbs}>
            <capsuleGeometry args={[0.105, 0.44, 3, 8]} />
          </mesh>
          <mesh position={[0, -0.6, 0.05]} castShadow={sombras} material={visor}>
            <boxGeometry args={[0.17, 0.1, 0.28]} />
          </mesh>
        </group>
        <group ref={pernaDireita} position={[0.13, 0.88, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow={sombras} material={limbs}>
            <capsuleGeometry args={[0.105, 0.44, 3, 8]} />
          </mesh>
          <mesh position={[0, -0.6, 0.05]} castShadow={sombras} material={visor}>
            <boxGeometry args={[0.17, 0.1, 0.28]} />
          </mesh>
        </group>
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#101728" transparent opacity={0.22} />
      </mesh>

      {/* Nome no duto entregaria o assassino escondido, então a plaquinha some
          junto com o corpo. */}
      {!hidden && !player.inVent && (
        <Html position={[0, 2.1, 0]} center distanceFactor={17} pointerEvents="none" zIndexRange={[10, 0]}>
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
  floorY,
}: {
  corpse: Snapshot["corpses"][number]
  localRef: React.MutableRefObject<THREE.Vector2>
  viewerAlive: boolean
  walls: OfficeMap["walls"]
  visionRange: number
  blackout: boolean
  floorY: number
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
    <group ref={group} position={[corpse.x, floorY, corpse.z]}>
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
  level,
}: {
  map: OfficeMap
  spots: OfficeMap["taskSpots"]
  showVents: boolean
  localRef: React.MutableRefObject<THREE.Vector2>
  walls: OfficeMap["walls"]
  visionRange: number
  level: number
}) {
  const ring = useRef<THREE.Group>(null)
  const emergency = useRef<THREE.Group>(null)
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
    if (emergency.current) {
      emergency.current.visible = (map.emergency.level ?? 0) === level && visible(map.emergency)
    }
    const levelVents = map.vents.filter((vent) => (vent.level ?? 0) === level)
    vents.current?.children.forEach((child, index) => {
      child.visible = Boolean(levelVents[index] && visible(levelVents[index]))
    })
  })

  return (
    <>
      <group ref={ring}>
        {spots.map((spot) => (
          <mesh key={spot.id} position={[spot.x, 0.06, spot.z]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.5, 0.57, 32]} />
            <meshBasicMaterial color="#ffd76a" transparent opacity={0.76} depthWrite={false} />
          </mesh>
        ))}
      </group>

      <group ref={emergency} position={[map.emergency.x, 0, map.emergency.z]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.31, 0.38, 0.44, 18]} />
          <meshStandardMaterial color="#5b6575" metalness={0.35} roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.49, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.28, 0.14, 20]} />
          <meshStandardMaterial color="#ad2635" emissive="#ff334d" emissiveIntensity={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.57, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.28, 0.035, 8, 24]} />
          <meshStandardMaterial color="#e5b85e" metalness={0.55} roughness={0.32} />
        </mesh>
      </group>

      {/* O duto em si é parte do escritório e todo mundo vê, igual no Among:
          esconder a grelha não escondia nada e ainda entregava o assassino no
          instante em que ela aparecia na tela dele. O que só o assassino vê é
          este anel, que marca qual grelha dá para usar. */}
      {showVents && (
        <group ref={vents}>
          {map.vents.filter((vent) => (vent.level ?? 0) === level).map((vent) => (
            <mesh key={vent.id} position={[vent.x, 0.225, vent.z]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.82, 0.88, 28]} />
              <meshBasicMaterial color="#69d6ff" transparent opacity={0.5} depthWrite={false} />
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
  level,
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
  level: number
  position: { x: number; z: number }
  onTargets: (targets: Targets) => void
  signature: React.MutableRefObject<string>
}) {
  const task = myTaskSpots.find((spot) => distance(position, spot) <= TASK_RANGE) ?? null
  const corpse =
    snapshot.corpses.find(
      (body) => body.level === level && !body.reported && distance(position, body) <= REPORT_RANGE,
    ) ?? null
  const emergency = (map.emergency.level ?? 0) === level && distance(position, map.emergency) <= REPORT_RANGE
  const vent =
    role === "assassino"
      ? (map.vents.find((item) => (item.level ?? 0) === level && distance(position, item) <= VENT_RANGE) ?? null)
      : null

  let kill: { id: string; name: string } | null = null
  if (role === "assassino") {
    let best = Number.POSITIVE_INFINITY
    snapshot.players.forEach((player) => {
      if (player.id === me || !player.alive || allies.includes(player.id)) return
      const live = state?.players?.get?.(player.id)
      if (!live) return
      if (Number(live.level ?? 0) !== level) return
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
