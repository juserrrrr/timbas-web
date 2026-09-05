import * as THREE from "three"

export async function prepareScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, postprocessing = false, signal?: AbortSignal) {
  if (signal?.aborted) return
  // Inclui materiais fora da câmera para não compilar um piso ao chegar nele.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
  const previous = renderer.getRenderTarget()
  try {
    let compilation: Promise<THREE.Object3D>
    try {
      if (postprocessing) renderer.setRenderTarget(target)
      compilation = renderer.compileAsync(scene, camera)
    } finally {
      if (postprocessing) renderer.setRenderTarget(previous)
    }
    await compilation
    // A compilação pode terminar depois de sair da sala ou trocar a qualidade.
    if (signal?.aborted) return
    const textures = new Set<THREE.Texture>()
    const culling = new Map<THREE.Object3D, boolean>()
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite || object instanceof THREE.Points)) return
      culling.set(object, object.frustumCulled)
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
      }
    })
    textures.forEach((texture) => renderer.initTexture(texture))
    // Um render de 1 pixel envia também os buffers das malhas fora da câmera.
    const destination = renderer.getRenderTarget()
    try {
      culling.forEach((_, object) => { object.frustumCulled = false })
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
    } finally {
      culling.forEach((value, object) => { object.frustumCulled = value })
      renderer.setRenderTarget(destination)
    }
  } finally {
    target.dispose()
  }
}
