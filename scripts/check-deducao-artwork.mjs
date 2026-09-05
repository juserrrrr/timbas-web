import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as THREE from "three"

const root = new URL("../", import.meta.url)
const scene = new URL("app/(game)/games/deducao/[roomId]/scene/", root)
const png = readFileSync(new URL("public/images/games/deducao/timbas-bibao.png", root))
const layout = JSON.parse(readFileSync(new URL("assets/models/deducao/online-lobby-layout.json", root), "utf8"))
const office = JSON.parse(readFileSync(new URL("assets/models/deducao/office-map.json", root), "utf8"))
let activeHooks
const react = {
  useMemo(factory, deps) {
    const index = activeHooks.index++, previous = activeHooks.slots[index]
    if (!previous || deps.some((value, at) => !Object.is(value, previous.deps[at]))) activeHooks.slots[index] = { value: factory(), deps }
    return activeHooks.slots[index].value
  },
  useEffect(effect, deps) {
    const owner = activeHooks, index = owner.index++, previous = owner.slots[index]
    if (!previous || deps.some((value, at) => !Object.is(value, previous.deps[at]))) owner.effects.push(() => {
      previous?.cleanup?.()
      owner.slots[index] = { deps, cleanup: effect() }
    })
  },
  useLayoutEffect(effect, deps) { react.useEffect(effect, deps) },
}
const jsx = (type, props) => ({ type, props })
const texture = new THREE.Texture()
let textureRequests = 0, textureDisposals = 0
texture.addEventListener("dispose", () => textureDisposals++)
const lightUniforms = { uArtworkTestLight: { value: 1 } }
function load(name, dependencies) {
  const module = { exports: {} }
  const code = ts.transpileModule(readFileSync(new URL(name, scene), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    assert.ok(name in dependencies, `Dependência inesperada: ${name}`)
    return dependencies[name]
  } })
  return module.exports
}
const vision = load("vision-material.tsx", {
  react, three: THREE,
  "./light-grid": { officeLightDeclarations: "uniform float uArtworkTestLight;", officeLightFragment: "// artwork test lights", officeLightUniforms: lightUniforms },
})
const api = load("framed-artwork.tsx", {
  react, three: THREE, "react/jsx-runtime": { jsx, jsxs: jsx }, "./vision-material": vision,
  "@react-three/drei": { useTexture(url) { assert.equal(url, "/images/games/deducao/timbas-bibao.png"); textureRequests++; return texture } },
})
function mount() {
  const owner = { slots: [], effects: [], index: 0 }
  return {
    render(props) {
      activeHooks = owner; owner.index = 0
      const tree = api.FramedArtwork(props)
      for (const effect of owner.effects.splice(0)) effect()
      return tree
    },
    unmount() { for (const slot of owner.slots) { slot?.cleanup?.(); if (slot) slot.cleanup = undefined } },
  }
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
let passed = 0
function check(name, run) { run(); passed++; console.log(`OK ${name}`) }

check("PNG original preservado byte a byte, 1448×1086 e proporção 4:3", () => {
  assert.equal(png.length, 2859651)
  assert.equal(createHash("sha256").update(png).digest("hex"), "d70787b220de8589372579d24e6e7fcf7429fb3e7af1211aca54b6739799f381")
  assert.equal(png.subarray(1, 4).toString(), "PNG")
  assert.equal(png.readUInt32BE(16), 1448)
  assert.equal(png.readUInt32BE(20), 1086)
  assert.equal(api.BIBAO_ARTWORK_ASPECT, 4 / 3)
})

check("Quadro de três meshes preserva aspecto em qualquer largura, sem crop ou luz própria", () => {
  const instance = mount()
  for (const width of [1.4, 2.8, 4]) {
    const tree = instance.render({ position: [0, 2, 0], width })
    const meshes = tree.props.children
    assert.equal(meshes.length, 3)
    assert.ok(meshes.every((mesh) => mesh.type === "mesh"))
    for (const mesh of meshes) {
      const material = mesh.props.material
      assert.ok(material instanceof THREE.MeshStandardMaterial)
      assert.equal(material.emissive.getHex(), 0)
      assert.equal(material.metalness, 0)
      assert.ok(material.roughness >= 0.85)
      assert.equal(material.depthTest, true)
      assert.equal(material.transparent, false)
    }
    const frame = meshes[0].props.children.props.args
    const print = meshes[2].props.children.props.args
    close(frame[0], width + 0.19); close(frame[1], width * 0.75 + 0.19)
    close(print[0], width); close(print[1], width * 0.75)
    assert.equal(meshes[2].props.material.map, texture)
    assert.deepEqual(texture.repeat.toArray(), [1, 1])
    assert.deepEqual(texture.offset.toArray(), [0, 0])
  }
  instance.unmount()
})

check("Textura compartilhada sRGB só invalida uma vez e não é destruída ao trocar de mundo", () => {
  const version = texture.version
  const lobby = mount(), office = mount()
  const first = lobby.render(api.BIBAO_ARTWORK_PLACEMENTS.lobby)
  const second = office.render(api.BIBAO_ARTWORK_PLACEMENTS.reception)
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace)
  assert.ok(version > 0)
  assert.equal(texture.version, version)
  assert.equal(first.props.children[2].props.material.map, second.props.children[2].props.material.map)
  const materials = first.props.children.map((child) => child.props.material)
  let disposals = 0
  for (const material of materials) material.addEventListener("dispose", () => disposals++)
  const repeat = lobby.render(api.BIBAO_ARTWORK_PLACEMENTS.lobby)
  repeat.props.children.forEach((child, index) => assert.equal(child.props.material, materials[index]))
  lobby.unmount()
  assert.equal(disposals, 3)
  assert.equal(textureDisposals, 0)
  assert.equal(texture.version, version)
  office.unmount()
  assert.equal(textureDisposals, 0)
  assert.ok(textureRequests >= 3)
})

check("Pintura recebe grade de iluminação e apagão sem recompilar materiais", () => {
  const instance = mount(), tree = instance.render(api.BIBAO_ARTWORK_PLACEMENTS.lobby)
  for (const mesh of tree.props.children) {
    const material = mesh.props.material, version = material.version
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} }
    material.onBeforeCompile(shader)
    assert.equal(shader.uniforms.uBlackout, vision.visionUniforms.uBlackout)
    assert.equal(shader.uniforms.uArtworkTestLight, lightUniforms.uArtworkTestLight)
    assert.equal(shader.uniforms.uSurface.value, 0)
    assert.ok(shader.fragmentShader.includes("artwork test lights"))
    vision.setBlackout(true, 1)
    assert.ok(shader.uniforms.uBlackout.value > 0.99)
    assert.equal(material.version, version)
  }
  instance.unmount()
})

check("Posições ficam em paredes sólidas e acima de armário/lambri, sem alcançar teto", () => {
  const { lobby, reception } = api.BIBAO_ARTWORK_PLACEMENTS
  const halfHeight = (lobby.width / api.BIBAO_ARTWORK_ASPECT + 0.19) / 2
  const cabinet = layout.colliders.find((item) => item.id === "lobby-east-cabinet")
  assert.ok(lobby.position[1] - halfHeight > cabinet.height)
  assert.ok(lobby.position[1] + halfHeight < layout.ceilingY)
  assert.ok(lobby.position[0] < layout.bounds.maxX)
  close(lobby.rotation[1], -Math.PI / 2)
  const room = office.rooms.find((room) => room.id === "recepcao")
  const wall = office.walls.find((wall) => (wall.level ?? 0) === 0 && wall.minX <= reception.position[0] - 1.5 && wall.maxX >= reception.position[0] + 1.5 && Math.abs(wall.minZ - (room.rect.z + room.rect.d - 0.2)) < 1e-8)
  assert.ok(wall, "A moldura inteira precisa de uma parede sólida, sem abertura de porta")
  assert.ok(reception.position[1] - halfHeight > 1.045)
  assert.ok(reception.position[1] + halfHeight < 3.8)
  assert.ok(reception.position[2] + 0.03 < wall.minZ)
  assert.ok(wall.minZ - reception.position[2] < 0.1)
  close(reception.rotation[1], Math.PI)
})

console.log(`\n${passed} verificações do quadro passaram.`)
