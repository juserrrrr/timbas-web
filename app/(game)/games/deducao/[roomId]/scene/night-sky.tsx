"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Stars } from "@react-three/drei"
import * as THREE from "three"
import type { Quality } from "../match-types"

const VERTEX_SHADER = `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 dusk;
  varying vec3 vDirection;
  void main() {
    vec3 direction = normalize(vDirection);
    float height = max(direction.y, 0.0);
    vec3 color = mix(horizon, zenith, smoothstep(0.0, 0.55, height));
    vec2 bearing = normalize(direction.xz + vec2(0.00001));
    float sunsetBearing = pow(max(dot(bearing, normalize(vec2(18.0, 32.0))), 0.0), 6.0);
    float sunsetHeight = exp(-pow((height - 0.035) / 0.14, 2.0));
    color = mix(color, dusk, sunsetBearing * sunsetHeight * 0.66);
    color *= mix(0.45, 1.0, smoothstep(-0.18, 0.02, direction.y));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

export function NightSky({ quality }: { quality: Quality }) {
  const sky = useRef<THREE.Group>(null)
  const uniforms = useMemo(() => ({
    zenith: { value: new THREE.Color("#070f20") },
    horizon: { value: new THREE.Color("#26324c") },
    dusk: { value: new THREE.Color("#a4512e") },
  }), [])

  // O céu acompanha a câmera e cabe no far plane, inclusive no terraço.
  useFrame(({ camera }) => sky.current?.position.copy(camera.position))

  return (
    <group ref={sky}>
      <mesh renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[100, 32, 16]} />
        <shaderMaterial
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {quality !== "baixo" && (
        <Stars radius={94} depth={4} count={quality === "alto" ? 900 : 450} factor={1.2} saturation={0.1} fade speed={0.08} />
      )}
    </group>
  )
}
