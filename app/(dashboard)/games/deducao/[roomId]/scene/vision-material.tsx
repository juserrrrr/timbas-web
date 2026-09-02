"use client"

import { useEffect, useMemo } from "react"
import * as THREE from "three"

/**
 * A visão do jogador, feita no material em vez de no HTML por cima.
 *
 * O escritório inteiro é desenhado, mas cada fragmento escurece conforme se
 * afasta de quem está jogando. É isso que dá o clima e o que faz o apagão
 * doer: em vez de trocar cor de tudo, a gente encolhe dois números e a sala
 * some ao redor. Uma névoa comum não serviria, porque ela mede distância até a
 * câmera, e a câmera está lá em cima olhando o andar de fora.
 */

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
        gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.05, gl_FragColor.rgb, visible);`,
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
}

export function useVisionMaterial({ color, emissive, emissiveIntensity = 0, roughness = 0.85, metalness = 0 }: Params) {
  const material = useMemo(() => {
    const created = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness,
      ...(emissive ? { emissive: new THREE.Color(emissive), emissiveIntensity } : {}),
    })
    return patchVision(created)
  }, [color, emissive, emissiveIntensity, roughness, metalness])

  useEffect(() => () => material.dispose(), [material])
  return material
}
