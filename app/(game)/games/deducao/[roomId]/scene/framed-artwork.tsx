"use client"

import { useEffect, useLayoutEffect, useMemo } from "react"
import { useTexture } from "@react-three/drei"
import { MeshStandardMaterial, SRGBColorSpace } from "three"
import { patchVision } from "./vision-material"

export const BIBAO_ARTWORK_URL = "/images/games/deducao/timbas-bibao.png"
export const BIBAO_ARTWORK_ASPECT = 1448 / 1086

type FramedArtworkProps = {
  position: [number, number, number]
  rotation?: [number, number, number]
  width?: number
}

export const BIBAO_ARTWORK_PLACEMENTS = {
  lobby: { position: [5.83, 2.28, 0], rotation: [0, -Math.PI / 2, 0], width: 2.8 },
  reception: { position: [8.92, 2.26, 26.42], rotation: [0, Math.PI, 0], width: 2.8 },
} satisfies Record<string, FramedArtworkProps>

export function FramedArtwork({ position, rotation, width = 2.8 }: FramedArtworkProps) {
  const texture = useTexture(BIBAO_ARTWORK_URL)
  useLayoutEffect(() => {
    if (texture.colorSpace === SRGBColorSpace) return
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])

  const materials = useMemo(() => [
    patchVision(new MeshStandardMaterial({ color: "#242a31", roughness: 0.88 })),
    patchVision(new MeshStandardMaterial({ color: "#e5ded0", roughness: 0.95 })),
    patchVision(new MeshStandardMaterial({ color: "#ffffff", map: texture, roughness: 0.88 })),
  ], [texture])
  useEffect(() => () => { for (const material of materials) material.dispose() }, [materials])
  const [frame, mat, print] = materials
  const height = width / BIBAO_ARTWORK_ASPECT

  // A textura pertence ao cache compartilhado; o cleanup descarta só os materiais locais.
  return (
    <group name="Bibao framed artwork" position={position} rotation={rotation}>
      <mesh name="Bibao matte frame" material={frame} receiveShadow>
        <boxGeometry args={[width + 0.19, height + 0.19, 0.06]} />
      </mesh>
      <mesh name="Bibao paper mat" position={[0, 0, 0.031]} material={mat} receiveShadow>
        <planeGeometry args={[width + 0.07, height + 0.07]} />
      </mesh>
      <mesh name="Bibao original print" position={[0, 0, 0.033]} material={print} receiveShadow>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  )
}
