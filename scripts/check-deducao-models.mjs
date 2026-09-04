import { readFile } from "node:fs/promises"
import path from "node:path"

const directory = path.join("public", "models", "games", "deducao")
const files = [
  "timbas-coupe-suv.glb",
  "desk-blender.glb",
  "office-chair-blender.glb",
  "computer-blender.glb",
  "plant-blender.glb",
  "timbas-blue-sofa.glb",
  "reception-counter.glb",
  "meeting-table-blender.glb",
  "cafe-table.glb",
  "server-rack.glb",
  "locker.glb",
  "office-shelf.glb",
  "coffee-machine.glb",
  "wooden-crate.glb",
  "office-printer.glb",
  "whiteboard.glb",
  "traffic-cone.glb",
  "utility-sink.glb",
  "vending-machine.glb",
  "office-kitchen.glb",
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

let totalBytes = 0
let totalDrawCalls = 0

for (const filename of files) {
  const buffer = await readFile(path.join(directory, filename))
  const gltf = parseGlb(buffer, filename)
  const drawCalls = (gltf.meshes ?? []).reduce((total, mesh) => total + mesh.primitives.length, 0)
  const materialCount = gltf.materials?.length ?? 0
  const hasLights = Boolean(gltf.extensions?.KHR_lights_punctual?.lights?.length)
  if (gltf.cameras?.length || gltf.animations?.length || hasLights) {
    throw new Error(`${filename}: contém câmera, animação ou luz de apresentação`)
  }
  const maxBytes = filename === "timbas-coupe-suv.glb" ? 3 * 1024 * 1024 : 320 * 1024
  if (buffer.length > maxBytes) throw new Error(`${filename}: excede o orçamento de tamanho`)
  if (drawCalls > 12 || materialCount > 12) throw new Error(`${filename}: excede o orçamento de materiais`)
  totalBytes += buffer.length
  totalDrawCalls += drawCalls
  console.log(`${filename.padEnd(29)} ${String(drawCalls).padStart(2)} draw calls  ${(buffer.length / 1024).toFixed(1).padStart(7)} KB`)
}

console.log(`Kit Blender validado: ${files.length} arquivos, ${totalDrawCalls} draw calls e ${(totalBytes / 1024 / 1024).toFixed(2)} MB.`)
