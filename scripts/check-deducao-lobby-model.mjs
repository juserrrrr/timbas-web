import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Box3, Matrix4, Quaternion, Vector3 } from "three"

const root = new URL("../", import.meta.url)
const layout = JSON.parse(readFileSync(new URL("assets/models/deducao/online-lobby-layout.json", root), "utf8"))
const buffer = readFileSync(new URL("public/models/games/deducao/timbas-online-lobby.glb", root))
assert.equal(buffer.readUInt32LE(0), 0x46546c67)
assert.equal(buffer.readUInt32LE(4), 2)
assert.equal(buffer.readUInt32LE(8), buffer.length)
const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString("utf8"))
const nodes = new Map()
function visit(index, parent = new Matrix4()) {
  const node = gltf.nodes[index]
  const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
    new Vector3(...(node.translation ?? [0, 0, 0])), new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
    new Vector3(...(node.scale ?? [1, 1, 1])),
  )
  const matrix = parent.clone().multiply(local)
  const bounds = new Box3()
  for (const primitive of gltf.meshes[node.mesh]?.primitives ?? []) {
    const accessor = gltf.accessors[primitive.attributes.POSITION]
    bounds.union(new Box3(new Vector3(...accessor.min), new Vector3(...accessor.max)).applyMatrix4(matrix))
  }
  nodes.set(node.name, { node, bounds })
  for (const child of node.children ?? []) visit(child, matrix)
}
for (const node of gltf.scenes[gltf.scene ?? 0].nodes) visit(node)

const checks = []
const test = (name, run) => checks.push({ name, run })
const close = (actual, expected, tolerance = 0.003) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`)

test("GLB estático leve, sem luzes de estúdio, texturas, câmeras ou animações", () => {
  const primitives = gltf.meshes.flatMap((mesh) => mesh.primitives)
  const triangles = primitives.reduce((total, primitive) => total + gltf.accessors[primitive.indices].count / 3, 0)
  assert.ok(primitives.length <= 25)
  assert.ok(triangles < 25000)
  assert.ok(buffer.length < 400 * 1024)
  assert.equal(layout.budget.drawCalls, primitives.length)
  assert.equal(layout.budget.triangles, triangles)
  assert.ok(primitives.every((primitive) => primitive.extensions?.KHR_draco_mesh_compression))
  assert.equal(gltf.images?.length ?? 0, 0)
  assert.equal(gltf.cameras?.length ?? 0, 0)
  assert.equal(gltf.animations?.length ?? 0, 0)
  assert.equal(gltf.extensions?.KHR_lights_punctual?.lights?.length ?? 0, 0)
  assert.ok(gltf.materials.every((material) => !material.alphaMode || material.alphaMode === "OPAQUE"))
})

test("Piso y0, teto y3.6 e paredes respeitam os limites interiores da API", () => {
  assert.deepEqual(layout.bounds, { minX: -6, maxX: 6, minZ: -5, maxZ: 5 })
  assert.equal(layout.wallThickness, 0.24)
  close(nodes.get("LobbyFloor").bounds.max.y, layout.floorY)
  close(nodes.get("LobbyCeiling").bounds.min.y, layout.ceilingY)
  const walls = nodes.get("LobbySurface_Plaster").bounds
  close(walls.min.x, -6.24); close(walls.max.x, 6.24)
  close(walls.min.z, -5.24); close(walls.max.z, 5.24)
  close(walls.min.y, 0); close(walls.max.y, 3.6)
})

test("Quatro barras coloridas separadas batem com endpoints e emissão cadastrados", () => {
  assert.equal(layout.leds.length, 4)
  assert.equal(new Set(layout.leds.map((light) => light.mesh)).size, 4)
  assert.equal([...nodes.keys()].filter((name) => name.startsWith("LobbyLED_")).length, 4)
  for (const light of layout.leds) {
    const entry = nodes.get(light.mesh)
    assert.ok(entry, light.mesh)
    const center = entry.bounds.getCenter(new Vector3()).toArray()
    for (let axis = 0; axis < 3; axis++) {
      close(center[axis], light.position[axis])
      close(center[axis], (light.from[axis] + light.to[axis]) / 2)
    }
    const dimensions = entry.bounds.getSize(new Vector3()).toArray()
    const axis = light.from.findIndex((value, index) => value !== light.to[index])
    close(dimensions[axis], Math.abs(light.to[axis] - light.from[axis]))
    assert.ok(light.range >= 4 && light.range <= 8)
    assert.ok(light.strength > 0)
    const primitive = gltf.meshes[entry.node.mesh].primitives[0]
    const material = gltf.materials[primitive.material]
    assert.ok(material.emissiveFactor.some((value) => value > 0.1))
  }
  assert.equal(layout.lamps.length, 2)
  assert.ok(nodes.has("LobbyLamp_Diffusers"))
})

test("Oito colliders fiéis e doze spawns mantêm o centro da sala livre", () => {
  assert.equal(layout.colliders.length, 8)
  assert.equal(layout.spawns.length, 12)
  const expected = [
    [-2, 3.95, 2.4, 1.3, 0.9], [2, 3.95, 2.4, 1.3, 0.9],
    [-5.25, 0, 1.1, 3, 1.1], [5.25, 0, 1.1, 3, 1.1],
    ...[-5.2, 5.2].flatMap((x) => [-4.2, 4.2].map((z) => [x, z, 0.8, 0.8, 1.65])),
  ]
  assert.deepEqual(layout.colliders.map(({ x, z, w, d, height }) => [x, z, w, d, height]), expected)
  assert.equal(new Set(layout.spawns.map(({ x, z }) => `${x}:${z}`)).size, 12)
  for (const spawn of layout.spawns) {
    assert.ok([-2.4, -0.8, 0.8, 2.4].includes(spawn.x))
    assert.ok([-1.8, 0, 1.8].includes(spawn.z))
    assert.equal(spawn.level, 0)
    for (const collider of layout.colliders) {
      assert.ok(!(Math.abs(spawn.x - collider.x) <= collider.w / 2 + 0.45
        && Math.abs(spawn.z - collider.z) <= collider.d / 2 + 0.45), `${JSON.stringify(spawn)}: ${collider.id}`)
    }
  }
})

for (const { name, run } of checks) { run(); console.log(`PASS ${name}`) }
console.log(`${checks.length}/${checks.length} verificações do modelo de lobby passaram. ${layout.budget.drawCalls} draws, ${layout.budget.triangles} triângulos, ${(buffer.length / 1024).toFixed(1)} KB.`)
