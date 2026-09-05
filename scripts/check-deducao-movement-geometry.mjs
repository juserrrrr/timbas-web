import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const module = { exports: {} }
const path = "app/(game)/games/deducao/[roomId]/scene/movement-geometry.ts"
vm.runInNewContext(ts.transpileModule(await readFile(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { module, exports: module.exports })
const { collidersAtHeight, surfaceHeightAt, stairSampleAt, FLOOR_HEIGHT } = module.exports
const map = JSON.parse(await readFile("assets/models/deducao/office-map.json", "utf8"))
const before = JSON.stringify(map)
let checks = 0

for (const level of [0, 1, 2]) for (const feet of [-0.1, 0, 0.2, 0.46, 0.86, 1.2, 2.1]) {
  const expected = [...map.walls.filter(box => (box.level ?? 0) === level), ...map.obstacles.filter(box => (box.level ?? 0) === level && (box.height === undefined || box.height > feet + 0.06))]
  const actual = collidersAtHeight(map, level, feet)
  assert.deepEqual(Array.from(actual), expected, "Colisores e ordem preservados para cada piso/altura")
  for (let index = 0; index < 120; index++) assert.equal(collidersAtHeight(map, level, feet), actual, "Caminhada não aloca outra lista")
  checks++
}

for (const level of [0, 1]) for (const maxHeight of [0, 0.08, 0.46, 0.86, 1.2, 3]) {
  for (const box of map.obstacles) for (const [x, z] of [
    [box.minX, box.minZ], [box.maxX, box.maxZ], [(box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2],
    [box.minX - 0.001, box.minZ], [box.maxX + 0.001, box.maxZ],
  ]) {
    const expected = map.obstacles.reduce((height, candidate) => (candidate.level ?? 0) !== level || candidate.height === undefined || candidate.height > maxHeight || x < candidate.minX || x > candidate.maxX || z < candidate.minZ || z > candidate.maxZ ? height : Math.max(height, candidate.height), 0)
    assert.equal(surfaceHeightAt(map, level, x, z, maxHeight), expected, "Apoio no móvel mantém bordas e altura")
    checks++
  }
}

const stair = map.stairs[0]
const a = { x: stair.x, z: stair.z }, b = { x: stair.turnX, z: stair.turnZ }, c = { x: stair.targetX, z: stair.targetZ }
const firstLength = Math.hypot(b.x - a.x, b.z - a.z), lastLength = Math.hypot(c.x - b.x, c.z - b.z)
const half = Math.min(1.21, firstLength * 0.4, lastLength * 0.4)
const climb = firstLength + lastLength - half * 2
for (const reverse of [false, true]) for (let step = 0; step <= 1000; step++) {
  const position = (reverse ? 1000 - step : step) * (firstLength + lastLength) / 1000
  const segment = position <= firstLength ? [a, b, position / firstLength] : [b, c, (position - firstLength) / lastLength]
  const x = segment[0].x + (segment[1].x - segment[0].x) * segment[2]
  const z = segment[0].z + (segment[1].z - segment[0].z) * segment[2]
  const distance = position <= firstLength - half ? position : position <= firstLength + half ? firstLength - half : position - half * 2
  const sample = stairSampleAt(map, x, z)
  assert.ok(sample)
  assert.ok(Math.abs(sample.y - (stair.level * FLOOR_HEIGHT + distance / climb * FLOOR_HEIGHT)) < 1e-10, "Lances e patamar mantêm a mesma altura contínua")
  checks++
}
assert.equal(stairSampleAt(map, stair.x + 3, stair.z), null)
assert.equal(stairSampleAt({ ...map, stairs: [] }, stair.x, stair.z), null, "Outro mapa não reutiliza a escada anterior")
const replacement = { ...map, obstacles: [] }
assert.equal(surfaceHeightAt(replacement, 0, map.props[0].x, map.props[0].z, 5), 0)
assert.equal(JSON.stringify(map), before, "Cache não modifica a planta")
assert.doesNotMatch(await readFile("app/(game)/games/deducao/[roomId]/hud.tsx", "utf8"), /backdrop-blur/, "HUD não refiltra o Canvas vivo por trás dos painéis")
console.log(`${checks} verificações de geometria e cache passaram; mesmos colisores, apoios, escada e planta imutável. HUD sem backdrop blur.`)
