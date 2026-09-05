import * as THREE from "three"

export async function prepareScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, postprocessing = false, signal?: AbortSignal) {
  if (signal?.aborted) return
  // Inclui materiais fora da câmera para não compilar um piso ao chegar nele.
  const target = postprocessing ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null
  const previous = renderer.getRenderTarget()
  try {
    let compilation: Promise<THREE.Object3D>
    try {
      if (target) renderer.setRenderTarget(target)
      compilation = renderer.compileAsync(scene, camera)
    } finally {
      if (target) renderer.setRenderTarget(previous)
    }
    await compilation
  } finally {
    target?.dispose()
  }
  // A compilação pode terminar depois de sair da sala ou trocar a qualidade.
  if (signal?.aborted) return
  const textures = new Set<THREE.Texture>()
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite || object instanceof THREE.Points)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  textures.forEach((texture) => renderer.initTexture(texture))
}
