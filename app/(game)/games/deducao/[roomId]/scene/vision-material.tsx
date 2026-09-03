"use client"

import { useEffect, useMemo } from "react"
import * as THREE from "three"

export const visionUniforms = {
  uFocus: { value: new THREE.Vector3() },
  uInner: { value: 9 },
  uOuter: { value: 17 },
}

export function setVision(x: number, z: number, inner: number, outer: number) {
  visionUniforms.uFocus.value.set(x, 0, z)
  visionUniforms.uInner.value += (inner - visionUniforms.uInner.value) * 0.08
  visionUniforms.uOuter.value += (outer - visionUniforms.uOuter.value) * 0.08
}

export function patchVision(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFocus = visionUniforms.uFocus
    shader.uniforms.uInner = visionUniforms.uInner
    shader.uniforms.uOuter = visionUniforms.uOuter

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

    // Fora do alcance o cenário não apaga: ele afunda numa penumbra azulada e
    // continua legível como silhueta. Quem some de verdade é gente, e disso
    // quem cuida é a cena, escondendo o boneco. Apagar o escritório inteiro só
    // fazia o jogador andar às cegas sem esconder informação nenhuma.
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `varying vec3 vVisionPos;
        uniform vec3 uFocus;
        uniform float uInner;
        uniform float uOuter;
        void main() {`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        float visionDist = distance(vVisionPos.xz, uFocus.xz);
        float visible = 1.0 - smoothstep(uInner, uOuter, visionDist);
        vec3 penumbra = gl_FragColor.rgb * 0.16 + vec3(0.055, 0.068, 0.098);
        gl_FragColor.rgb = mix(penumbra, gl_FragColor.rgb, visible);`,
      )
  }
  // Materiais com onBeforeCompile diferente precisam de programas diferentes, e
  // o three só percebe isso pela chave de cache.
  material.customProgramCacheKey = () => "timbas-vision"
  return material
}

interface Params {
  color: string
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
}

export function useVisionMaterial({
  color,
  emissive,
  emissiveIntensity = 0,
  roughness = 0.85,
  metalness = 0,
  vertexColors = false,
  unlit = false,
}: Params) {
  const material = useMemo(() => {
    const created = unlit
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color), vertexColors })
      : new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness,
          metalness,
          vertexColors,
          ...(emissive ? { emissive: new THREE.Color(emissive), emissiveIntensity } : {}),
        })
    return patchVision(created)
  }, [color, emissive, emissiveIntensity, roughness, metalness, vertexColors, unlit])

  useEffect(() => () => material.dispose(), [material])
  return material
}
