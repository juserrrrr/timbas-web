import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"
import * as THREE from "three"

const scenePath = "app/(game)/games/deducao/[roomId]/scene/office-scene.tsx"
const source = ts.createSourceFile(scenePath, await readFile(scenePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const names = ["cloneCrewScene", "PlayerNameplate", "Actor", "Corpse"]
const selected = source.statements.filter(statement => ts.isFunctionDeclaration(statement)
  ? names.includes(statement.name?.text)
  : ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => names.includes(declaration.name.text)))
assert.equal(selected.length, names.length)
const printer = ts.createPrinter()
const code = ts.transpileModule(selected.map(statement => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n") + `\nmodule.exports={${names.join(",")}};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText
const map = JSON.parse(await readFile("assets/models/deducao/office-map.json", "utf8"))
const movementModule = { exports: {} }
vm.runInNewContext(ts.transpileModule(await readFile("app/(game)/games/deducao/[roomId]/scene/movement-geometry.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { module: movementModule, exports: movementModule.exports })
const movement = movementModule.exports
const model = new THREE.Group()
for (const name of ["Crew Body Color", "Crew Accent Color", "Crew Dark Uniform", "Crew Visor", "Report Beacon"]) {
  const material = new THREE.MeshStandardMaterial({ color: "#aa8855", emissive: "#110a02", emissiveIntensity: 0.12 })
  material.name = name
  model.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), material))
}

function harness() {
  let cursor = 0, frame, cloneCalls = 0
  const slots = []
  const module = { exports: {} }
  const hooks = {
    useRef(value) { return slots[cursor++] ??= { current: value } },
    useMemo(factory, deps) {
      const index = cursor++
      if (!slots[index] || deps.some((dep, at) => !Object.is(dep, slots[index].deps[at]))) slots[index] = { value: factory(), deps }
      return slots[index].value
    },
    useEffect() { cursor++ },
    useLayoutEffect(effect, deps) { hooks.useMemo(effect, deps) },
    useFrame(callback) { frame = callback },
  }
  vm.runInNewContext(code, {
    module, exports: module.exports, THREE, ...hooks, ...movement,
    CREW_MODEL: "crew", CORPSE_MODEL: "corpse", useGLTF: () => ({ scene: model }),
    patchVision(material) { cloneCalls++; return material },
    document: { createElement() { return { width: 0, height: 0, getContext() { return { measureText: text => ({ width: text.length * 29 }), fillText() {} } } } } },
    React: { createElement(type, props, ...children) {
      if (props?.ref && props.ref.current === null && type === "group") props.ref.current = new THREE.Group()
      return { type, props: { ...props, children } }
    } },
  })
  return {
    api: { ...movement, ...module.exports },
    render(name, props) { cursor = 0; return module.exports[name](props) },
    tick(count = 1) { for (let index = 0; index < count; index++) frame?.({}, 1 / 60) },
    get cloneCalls() { return cloneCalls },
    get frame() { return frame },
  }
}
function children(tree, type) {
  const result = tree?.type === type ? [tree] : []
  for (const child of tree?.props?.children?.flat(Infinity) ?? []) if (child && typeof child === "object") result.push(...children(child, type))
  return result
}
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }

check("Corpos e nomes dos jogadores permanecem no mesmo mundo nos dois pavimentos", () => {
  const h = harness()
  const player = { id: "remote", name: "Parceiro", color: "#22c55e", alive: true, x: 30, z: 10, level: 1, dir: 0, inVent: false }
  const props = { player, roomRef: { current: { state: { players: new Map([[player.id, player]]) } } }, isMe: false,
    localRef: { current: new THREE.Vector2(30, 11) }, localYRef: { current: 0 }, climbingRef: { current: false }, localHeadingRef: { current: 0 },
    viewerAlive: true, ally: false, quality: "alto", hideBody: false, seated: false, blackout: false, map }
  const tree = h.render("Actor", props)
  const node = tree.props.ref.current
  h.tick()
  assert.equal(node.visible, true)
  assert.equal(node.position.y, 4.2)
  assert.equal(children(tree, h.api.PlayerNameplate)[0].props.visible, true)
  props.localYRef.current = 4.2
  player.level = 0
  h.tick(90)
  assert.equal(node.visible, true)
  assert.ok(node.position.y < 0.001)
  player.inVent = true
  h.tick()
  assert.equal(node.visible, false, "Duto continua escondendo corpo e filhos")
  player.inVent = false
  player.alive = false
  h.render("Actor", props)
  h.tick()
  assert.equal(node.visible, false, "Vivo não vê fantasma")
  props.viewerAlive = false
  h.render("Actor", props)
  h.tick()
  assert.equal(node.visible, true, "Observador continua vendo fantasma")
  props.hideBody = true
  h.render("Actor", props)
  h.tick()
  assert.equal(node.visible, false, "O próprio corpo não invade a câmera")
})

check("Ator sobe sem salto de posição, troca de clone ou material ao cruzar o andar", () => {
  const h = harness()
  const stair = map.stairs[0]
  const player = { id: "remote", name: "Parceiro", color: "#22c55e", alive: true, x: stair.x, z: stair.z, level: 0, dir: 0, moving: true }
  const props = { player, roomRef: { current: { state: { players: new Map([[player.id, player]]) } } }, isMe: false,
    localRef: { current: new THREE.Vector2(stair.x, stair.z) }, localYRef: { current: 0 }, climbingRef: { current: false }, localHeadingRef: { current: 0 },
    viewerAlive: true, ally: false, quality: "alto", hideBody: false, seated: false, blackout: false, map }
  const initial = h.render("Actor", props)
  const clone = children(initial, "primitive")[0].props.object
  const node = initial.props.ref.current
  h.tick()
  let previous = node.position.y
  const route = [{ x: stair.x, z: stair.z }, { x: stair.turnX, z: stair.turnZ }, { x: stair.targetX, z: stair.targetZ }]
  for (let segment = 0; segment < 2; segment++) for (let step = 1; step <= 120; step++) {
    player.x = THREE.MathUtils.lerp(route[segment].x, route[segment + 1].x, step / 120)
    player.z = THREE.MathUtils.lerp(route[segment].z, route[segment + 1].z, step / 120)
    if (h.api.stairSampleAt(map, player.x, player.z).progress >= 0.52) player.level = 1
    props.blackout = step % 2 === 0
    const tree = h.render("Actor", props)
    assert.equal(children(tree, "primitive")[0].props.object, clone)
    h.tick()
    assert.equal(node.visible, true)
    assert.ok(Math.abs(node.position.y - previous) < 0.06)
    previous = node.position.y
  }
  h.tick(90)
  assert.ok(Math.abs(node.position.y - 4.2) < 0.001)
  assert.equal(h.cloneCalls, 5)
})

check("Cadáver não usa o andar do observador nem remonta ao alternar o apagão", () => {
  for (const floorY of [0, 2.1, 4.2]) {
    const h = harness()
    const props = { corpse: { id: "body", x: 30, z: 10, level: floorY > 2.1 ? 1 : 0, color: "#ef4444" }, blackout: false, quality: "alto", floorY }
    const first = h.render("Corpse", props)
    const clone = children(first, "primitive")[0].props.object
    for (let index = 0; index < 20; index++) {
      props.blackout = index % 2 === 0
      const tree = h.render("Corpse", props)
      assert.equal(tree.props.visible, undefined)
      assert.equal(tree.props.position[1], floorY)
      assert.equal(children(tree, "primitive")[0].props.object, clone)
    }
    assert.equal(h.frame, undefined, "Nenhum frame aplica filtro artificial de altura")
    assert.equal(h.cloneCalls, 5)
  }
})

check("Apagão altera apenas valores dos materiais e restaura exatamente a aparência normal", () => {
  const h = harness()
  const crew = h.api.cloneCrewScene(model, "#22c55e")
  crew.updateAppearance(false, true)
  const before = crew.materials.map(material => ({ material, version: material.version, color: material.color.clone(), emissive: material.emissive.clone(), intensity: material.emissiveIntensity }))
  for (let index = 0; index < 20; index++) {
    crew.updateAppearance(true, true)
    for (const { material, version } of before) assert.equal(material.version, version, "Uniformes não invalidam o programa de shader")
    crew.updateAppearance(false, true)
    for (const { material, color, emissive, intensity } of before) {
      assert.ok(material.color.equals(color))
      assert.ok(material.emissive.equals(emissive))
      assert.equal(material.emissiveIntensity, intensity)
    }
  }
  assert.equal(h.cloneCalls, 5)
  assert.equal(model.children[0].material.color.getHexString(), "aa8855", "GLB compartilhado não foi alterado")
})

check("Etiquetas usam depth test real sem Html ou raycast e preservam a textura durante apagão", () => {
  const h = harness()
  const props = { name: "Parceiro", color: "#22c55e", ally: true, ghost: false, visible: true }
  const tree = h.render("PlayerNameplate", props)
  assert.equal(tree.type, "sprite")
  const material = children(tree, "spriteMaterial")[0].props
  assert.equal(material.depthTest, true)
  assert.equal(material.depthWrite, false)
  assert.equal(material.toneMapped, false)
  assert.equal(h.frame, undefined)
  props.visible = false
  const hidden = h.render("PlayerNameplate", props)
  assert.equal(hidden.props.visible, false)
  assert.equal(children(hidden, "spriteMaterial")[0].props.map, material.map)
  props.ghost = true
  assert.equal(children(h.render("PlayerNameplate", props), "spriteMaterial")[0].props.opacity, 0.5)
})

const hook = await readFile("app/(game)/games/deducao/[roomId]/use-deducao-room.ts", "utf8")
assert.doesNotMatch(hook, /onMessage\("andar"|Você chegou ao 2º andar|Você voltou ao térreo/)
console.log(`${checks} verificações de atores, oclusão e apagão passaram. Aviso de troca de andar ausente.`)
