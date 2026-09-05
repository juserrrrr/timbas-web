"use client"

import { useEffect, useMemo } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import layout from "@/assets/models/deducao/online-lobby-layout.json"
import type { Quality } from "../match-types"
import type { OfficeLightSource } from "./light-grid"
import { patchVision } from "./vision-material"
import { FIXTURE_INTENSITY } from "./lighting-profile"
import { FramedArtwork, BIBAO_ARTWORK_PLACEMENTS } from "./framed-artwork"

export const LOBBY_LIGHT_SOURCES: OfficeLightSource[] = [
  ...layout.leds.map((led) => ({
    start: led.from as [number, number, number], end: led.to as [number, number, number],
    color: led.color, intensity: led.strength * FIXTURE_INTENSITY.accent, range: led.range, radius: 0.12,
  })),
  ...layout.lamps.map((lamp) => ({
    start: [lamp.position[0] - 0.6, lamp.position[1], lamp.position[2]] as [number, number, number],
    end: [lamp.position[0] + 0.6, lamp.position[1], lamp.position[2]] as [number, number, number],
    color: lamp.color, intensity: lamp.strength * FIXTURE_INTENSITY.ceiling, range: lamp.range, radius: 0.5,
  })),
]

useGLTF.preload(layout.model, true, false)

export function LobbyWorld({ quality }: { quality: Quality }) {
  const { scene } = useGLTF(layout.model, true, false)
  const { model, materials } = useMemo(() => {
    const model = scene.clone(true)
    const materials = new Map<THREE.Material, THREE.Material>()
    const copy = (source: THREE.Material) => {
      if (!materials.has(source)) materials.set(source, patchVision(source.clone()))
      return materials.get(source)!
    }
    model.traverse((object) => {
      object.updateMatrix()
      object.matrixAutoUpdate = false
      if (!(object instanceof THREE.Mesh)) return
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material)
      object.receiveShadow = true
      object.castShadow = quality === "alto" && !object.name.startsWith("LobbyLED") && object.name !== "LobbyCeiling"
    })
    return { model, materials }
  }, [scene, quality])
  useEffect(() => () => { materials.forEach((material) => material.dispose()) }, [materials])
  return <><primitive object={model} dispose={null} /><FramedArtwork {...BIBAO_ARTWORK_PLACEMENTS.lobby} /></>
}
