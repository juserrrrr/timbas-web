import { readFile } from "node:fs/promises"
import path from "node:path"

const directory = path.join("public", "models", "games", "deducao")
const files = [
  "timbas-office-building.glb",
  "timbas-coupe-suv.glb",
  "timbas-crew-character.glb",
  "timbas-crew-corpse.glb",
  "desk-blender.glb",
  "office-chair-blender.glb",
  "computer-blender.glb",
  "plant-blender.glb",
  "timbas-blue-sofa.glb",
  "reception-counter.glb",
  "meeting-table-blender.glb",
  "cafe-table.glb",
  "dining-table.glb",
  "dining-chair.glb",
  "server-rack.glb",
  "locker.glb",
  "office-shelf.glb",
  "coffee-machine.glb",
  "wooden-crate.glb",
  "office-printer.glb",
  "whiteboard.glb",
  "traffic-cone.glb",
  "utility-sink.glb",
  "bathroom-vanity.glb",
  "modern-toilet.glb",
  "vending-machine.glb",
  "office-kitchen.glb",
  "lounge-game-table.glb",
  "arcade-cabinet.glb",
  "courtyard-tree.glb",
  "street-lamp.glb",
  "courtyard-bench.glb",
  "ceiling-light.glb",
  "emergency-light.glb",
]

function parseGlb(buffer, filename) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error(`${filename}: cabeçalho GLB inválido`)
  const jsonLength = buffer.readUInt32LE(12)
  const jsonType = buffer.readUInt32LE(16)
  if (jsonType !== 0x4e4f534a) throw new Error(`${filename}: bloco JSON ausente`)
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"))
}

function limits(filename) {
  if (filename === "timbas-office-building.glb") {
    return { bytes: 16 * 1024 * 1024, drawCalls: 72, materials: 72 }
  }
  if (filename === "timbas-coupe-suv.glb") {
    return { bytes: 3 * 1024 * 1024, drawCalls: 14, materials: 14 }
  }
  if (filename === "vending-machine.glb") {
    return { bytes: 700 * 1024, drawCalls: 14, materials: 14 }
  }
  return { bytes: 420 * 1024, drawCalls: 14, materials: 14 }
}

let totalBytes = 0
let totalDrawCalls = 0

for (const filename of files) {
  const buffer = await readFile(path.join(directory, filename))
  const gltf = parseGlb(buffer, filename)
  const drawCalls = (gltf.meshes ?? []).reduce((total, mesh) => total + mesh.primitives.length, 0)
  const materialCount = gltf.materials?.length ?? 0
  if (filename === "timbas-office-building.glb") {
    const removedGarageMaterials = new Set(["ToyCar", "Timbas steel blue paint", "Performance tire"])
    if (gltf.materials?.some((material) => removedGarageMaterials.has(material.name))) {
      throw new Error(`${filename}: ainda contém materiais dos carros da garagem removida`)
    }
  }
  const hasLights = Boolean(gltf.extensions?.KHR_lights_punctual?.lights?.length)
  if (gltf.cameras?.length || gltf.animations?.length || hasLights) {
    throw new Error(`${filename}: contém câmera, animação ou luz de apresentação`)
  }
  const budget = limits(filename)
  if (buffer.length > budget.bytes) throw new Error(`${filename}: excede o orçamento de tamanho`)
  if (drawCalls > budget.drawCalls || materialCount > budget.materials) {
    throw new Error(`${filename}: excede o orçamento de materiais`)
  }
  totalBytes += buffer.length
  totalDrawCalls += drawCalls
  console.log(`${filename.padEnd(29)} ${String(drawCalls).padStart(2)} draw calls  ${(buffer.length / 1024).toFixed(1).padStart(7)} KB`)
}

console.log(`Kit Blender validado: ${files.length} arquivos, ${totalDrawCalls} draw calls e ${(totalBytes / 1024 / 1024).toFixed(2)} MB.`)
