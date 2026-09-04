"use client"

import { useEffect, useMemo } from "react"
import * as THREE from "three"

export const visionUniforms = {
  uBlackout: { value: 0 },
}

export function setBlackout(blackout: boolean) {
  visionUniforms.uBlackout.value += ((blackout ? 1 : 0) - visionUniforms.uBlackout.value) * 0.12
}

/// Nenhuma superfície, piso ou parede. O desenho sai de conta feita em cima da
/// posição no mundo, não de imagem: nada para baixar, nada para esticar quando a
/// mesma peça é usada num tamanho diferente, e a emenda entre duas lajes cai
/// sempre na mesma grade.
export type Surface = "nenhuma" | "piso" | "parede"

const SURFACE_CODE: Record<Surface, number> = {
  nenhuma: 0,
  piso: 1,
  parede: 2,
}

export function patchVision(material: THREE.Material, surface: Surface = "nenhuma") {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBlackout = visionUniforms.uBlackout
    // Este vai por material, não compartilhado: é ele que diz se a peça é chão
    // ou parede.
    shader.uniforms.uSurface = { value: SURFACE_CODE[surface] }

    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec3 vVisionPos;\nvoid main() {")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        #ifdef USE_INSTANCING
          vVisionPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vVisionPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`,
      )

    // O cenário inteiro permanece legível. Alcance e paredes limitam ações,
    // sem apagar jogadores nem pintar o prédio de preto. No apagão a
    // escuridão vem das luzes físicas desligadas.
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `varying vec3 vVisionPos;
        uniform float uBlackout;
        uniform float uSurface;

        float timbasHash(vec2 cell) {
          return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>

        // Piso: junta de placa a cada dois metros e um grão fino por cima, para
        // a superfície parar de ser plástico liso. Parede: emenda de painel em
        // pé e uma faixa de sujeira perto do rodapé.
        if (uSurface > 0.5) {
          vec2 cell = uSurface < 1.5 ? vVisionPos.xz : vec2(vVisionPos.x + vVisionPos.z, vVisionPos.y);
          float tile = uSurface < 1.5 ? 2.0 : 1.6;
          vec2 edge = abs(fract(cell / tile) - 0.5);
          float groove = smoothstep(0.455, 0.5, max(edge.x, edge.y));
          gl_FragColor.rgb *= 1.0 - groove * (uSurface < 1.5 ? 0.13 : 0.08);

          float grain = timbasHash(floor(cell * 5.0));
          gl_FragColor.rgb *= 0.965 + grain * 0.07;

          if (uSurface > 1.5) {
            float sujeira = 1.0 - smoothstep(0.0, 0.7, vVisionPos.y);
            gl_FragColor.rgb *= 1.0 - sujeira * 0.12;
          }
        }

        // O apagão desliga as fontes de luz, mas não cria uma parede preta ao
        // redor do jogador. O cenário inteiro continua legível em tom reduzido.
        if (uBlackout > 0.001) {
          float darkness = mix(1.0, 0.42, uBlackout);
          gl_FragColor.rgb *= darkness;
        }

        gl_FragColor.rgb = max(gl_FragColor.rgb, vec3(0.012));`,
      )
  }
  // Materiais com onBeforeCompile diferente precisam de programas diferentes, e
  // o three só percebe isso pela chave de cache.
  material.customProgramCacheKey = () => "timbas-vision"
  return material
}

interface Params {
  color: string
  map?: THREE.Texture
  normalMap?: THREE.Texture
  normalScale?: number
  roughnessMap?: THREE.Texture
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  /// Cor por vértice: é assim que um móvel inteiro cabe num material só, com o
  /// tampo claro e o pé escuro, sem virar uma peça de cor chapada.
  vertexColors?: boolean
  /// Sem iluminação. Serve para o friso das salas, que precisa acender igual
  /// esteja onde estiver o sol.
  unlit?: boolean
  /// Que desenho de superfície o shader aplica por cima da cor.
  surface?: Surface
  transparent?: boolean
  opacity?: number
}

export function useVisionMaterial({
  color,
  map,
  normalMap,
  normalScale = 1,
  roughnessMap,
  emissive,
  emissiveIntensity = 0,
  roughness = 0.85,
  metalness = 0,
  vertexColors = false,
  unlit = false,
  surface = "nenhuma",
  transparent = false,
  opacity = 1,
}: Params) {
  const material = useMemo(() => {
    const shared = {
      color: new THREE.Color(color),
      map,
      vertexColors,
      transparent,
      opacity,
      depthWrite: !transparent,
    }
    const created = unlit
      ? new THREE.MeshBasicMaterial(shared)
      : new THREE.MeshStandardMaterial({
          ...shared,
          roughness,
          roughnessMap,
          metalness,
          normalMap,
          normalScale: new THREE.Vector2(normalScale, normalScale),
          ...(emissive ? { emissive: new THREE.Color(emissive), emissiveIntensity } : {}),
        })
    return patchVision(created, surface)
  }, [
    color,
    map,
    normalMap,
    normalScale,
    roughnessMap,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
    vertexColors,
    unlit,
    surface,
    transparent,
    opacity,
  ])

  useEffect(() => () => material.dispose(), [material])
  return material
}
