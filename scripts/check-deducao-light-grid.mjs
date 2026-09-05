import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"
import * as THREE from "three"

const root = "app/(game)/games/deducao/[roomId]/scene"
const code = ts.transpileModule(await readFile(`${root}/light-grid.ts`, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const module = { exports: {} }
vm.runInNewContext(code, { module, exports: module.exports, require: () => THREE })
const { buildLightGrid, officeLightFragment } = module.exports
const lights = [
  { start: [0, 0.66, 0], end: [0, 2.84, 0], color: "#38bfff", intensity: 4.8, range: 3.2, radius: 0.12 },
  { start: [0, 6.69, -3.6], end: [0, 6.69, 3.6], color: "#ffc18a", intensity: 20, range: 10.5, radius: 0.1 },
  { start: [4, 3.86, 0], end: [5.06, 3.86, 0], color: "#ff2038", intensity: 16.4, range: 8, radius: 0.1, emergency: true },
  { start: [9, 1, 0], end: [9, 1, 0], color: "#46ff87", intensity: 5, range: 5, radius: 0.1 },
]
const grid = buildLightGrid(lights)
function localIds(position, emergency) {
  const cell = new THREE.Vector3(...position).sub(grid.origin).divideScalar(grid.cellSize).floor()
  if (cell.toArray().some((value, index) => value < 0 || value >= grid.dimensions.getComponent(index))) return []
  const index = cell.x + grid.dimensions.x * (cell.y + grid.dimensions.y * cell.z)
  const header = grid.headers.image.data
  const offset = header[index * 4 + (emergency ? 2 : 0)]
  return Array.from(grid.indices.image.data.slice(offset, offset + header[index * 4 + (emergency ? 3 : 1)]))
}
function reaches(light, position) {
  const a = new THREE.Vector3(...light.start), b = new THREE.Vector3(...light.end)
  const closest = new THREE.Line3(a, b).closestPointToPoint(new THREE.Vector3(...position), true, new THREE.Vector3())
  return closest.distanceTo(new THREE.Vector3(...position)) < light.range
}
// Varredura dos dois pisos e fronteiras das células, sem depender de câmera.
for (let x = -5; x <= 14; x += 0.37) for (let y = -1; y < 10; y += 0.43) for (let z = -6; z < 6; z += 0.79) {
  for (const emergency of [false, true]) {
    const ids = localIds([x, y, z], emergency)
    lights.forEach((light, id) => {
      if (Boolean(light.emergency) === emergency && reaches(light, [x, y, z])) assert.ok(ids.includes(id), "Nenhuma luz que alcança a superfície pode faltar na célula")
    })
    assert.ok(ids.every((id) => Boolean(lights[id].emergency) === emergency), "Apagão não mistura fontes normais")
  }
}
const green = new THREE.Color("#46ff87").multiplyScalar(5)
assert.ok(Math.abs(grid.records.image.data[3 * 12 + 9] - green.g) < 0.00001, "Qualquer cor, inclusive verde, entra em espaço linear")
const initialRecords = grid.records
for (let index = 0; index < 240; index++) localIds([0, index % 2 ? 1.6 : 5.8, 0], index % 2 === 0)
assert.equal(grid.records, initialRecords, "Mover e alternar não recria os dados")
assert.ok(officeLightFragment.includes("if (i >= count) break"), "Shader percorre somente fontes locais")
assert.ok(!officeLightFragment.includes("cameraPosition"), "Não existe pool de luz que segue a câmera")
let disposed = 0
for (const texture of [grid.headers, grid.indices, grid.records]) texture.addEventListener("dispose", () => disposed++)
grid.dispose()
assert.equal(disposed, 3)
assert.throws(() => buildLightGrid([{ ...lights[0], range: 0 }]))
assert.throws(() => buildLightGrid(Array.from({ length: 65 }, () => lights[0])), /capacidade/)
const empty = buildLightGrid([])
assert.equal(empty.stats.sources, 0)
empty.dispose()
console.log("Grade de luz: cobertura espacial completa, LEDs lineares, cores RGB, dois pisos, apagão e descarte passaram.")
console.log(grid.stats)
