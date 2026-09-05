import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"

const root = new URL("../", import.meta.url)
const filename = "app/(game)/games/deducao/[roomId]/minimap.tsx"
const source = readFileSync(new URL(filename, root), "utf8")
const map = JSON.parse(readFileSync(new URL("assets/models/deducao/office-map.json", root), "utf8"))
const output = ts.transpileModule(source + "\nexport { roomLabelLines, doorLine }", {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  fileName: filename,
}).outputText
const effects = []
const frames = new Map()
let frameId = 0
const jsx = (type, props) => ({ type, props })
const module = { exports: {} }
vm.runInNewContext(output, {
  module, exports: module.exports,
  require: (id) => {
    if (id === "react") return { useRef: (value) => ({ current: value }), useEffect: (callback) => effects.push(callback) }
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx }
    throw new Error(`Unexpected runtime import: ${id}`)
  },
  requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId },
  cancelAnimationFrame: (id) => frames.delete(id),
}, { filename })
const { Minimap, roomLabelLines, doorLine } = module.exports

function nodes(tree) {
  if (Array.isArray(tree)) return Array.from(tree).flatMap(nodes)
  if (!tree || typeof tree !== "object") return []
  return [tree, ...nodes(tree.props?.children)]
}
const tagged = (tree, name) => nodes(tree).filter((node) => node.props?.[name] !== undefined)
const ids = (tree, name) => tagged(tree, name).map((node) => node.props[name]).sort()
const text = (tree) => Array.isArray(tree)
  ? Array.from(tree).map(text).join("")
  : tree && typeof tree === "object" ? text(tree.props?.children) : typeof tree === "string" ? tree : ""
const plain = (value) => JSON.parse(JSON.stringify(value))
const poseRef = { current: { x: 31.56, z: 30, dir: Math.PI } }
const render = (level, role = "assassino", grande = true, customMap = map) => Minimap({
  map: customMap, spots: customMap.taskSpots, level, role, grande, poseRef,
})
let checks = 0

for (const level of [0, 1]) {
  for (const grande of [false, true]) {
    const svg = render(level, "assassino", grande)
    const rooms = map.rooms.filter((room) => (room.level ?? 0) === level)
    assert.deepEqual(ids(svg, "data-map-room"), rooms.map((room) => room.id).sort(), `Only floor ${level} rooms`)
    assert.deepEqual(ids(svg, "data-map-label"), grande
      ? rooms.filter((room) => room.kind !== "corredor" && room.kind !== "externa").map((room) => room.id).sort() : [])
    assert.deepEqual(ids(svg, "data-map-task"), map.taskSpots.filter((spot) => (spot.level ?? 0) === level).map((spot) => spot.id).sort())
    assert.deepEqual(ids(svg, "data-map-vent"), map.vents.filter((vent) => (vent.level ?? 0) === level).map((vent) => vent.id).sort())
    assert.equal(tagged(svg, "data-map-emergency").length, Number((map.emergency.level ?? 0) === level))
    assert.equal(tagged(svg, "data-map-door").length, rooms.reduce((count, room) => count + (room.doors?.length ?? 0), 0))
    assert.ok(tagged(svg, "data-map-door").every((door) => rooms.some((room) => room.id === door.props["data-map-door"])))
    assert.deepEqual(ids(svg, "data-map-player"), ["local"], "Only the local player marker is exposed")
    assert.equal(tagged(svg, "data-map-prop").length, 0, "No previously hidden prop details are added")
    assert.equal(tagged(svg, "data-map-corpse").length, 0, "Corpses are not revealed on the map")
    assert.ok(svg.props["aria-label"].includes(level === 0 ? "Térreo" : "2º andar"))
    assert.equal(svg.props.className.includes("max-h-[calc(100dvh-12rem)]"), grande)
    const stair = tagged(svg, "data-map-stair")[0]
    assert.ok(stair, "The connection between floors stays visible")
    assert.ok(text(stair).includes(level === 0 ? "↑" : "↓"))
    const origin = nodes(stair).find((node) => node.type === "circle")
    assert.equal(origin.props.cx, level === 0 ? map.stairs[0].x : map.stairs[0].targetX)
    assert.equal(origin.props.cy, level === 0 ? map.stairs[0].z : map.stairs[0].targetZ)
    checks++
  }
}

for (const [ground, upper] of [["servidores", "arquivo"], ["hall-central", "hall-superior"], ["apoio", "conselho"]]) {
  assert.ok(ids(render(0), "data-map-label").includes(ground))
  assert.ok(!ids(render(0), "data-map-label").includes(upper))
  assert.ok(ids(render(1), "data-map-label").includes(upper))
  assert.ok(!ids(render(1), "data-map-label").includes(ground))
  checks++
}

for (const role of ["funcionario", "detetive", null]) {
  assert.equal(tagged(render(0, role), "data-map-vent").length, 0)
  assert.equal(tagged(render(1, role), "data-map-vent").length, 0)
  checks++
}

const rectangularRoom = { rect: { x: 10, z: 20, w: 12, d: 8 } }
for (const [side, expected] of [
  ["north", { x1: 12, y1: 20, x2: 15, y2: 20 }],
  ["south", { x1: 12, y1: 28, x2: 15, y2: 28 }],
  ["west", { x1: 10, y1: 22, x2: 10, y2: 25 }],
  ["east", { x1: 22, y1: 22, x2: 22, y2: 25 }],
]) {
  assert.deepEqual(plain(doorLine(rectangularRoom, { side, at: 2, width: 3 })), expected)
  checks++
}

const label = roomLabelLines({ name: "Sala de manutenção administrativa", rect: { w: 10 } })
assert.ok(label.length > 1, "Long room names wrap")
assert.equal(label.join(" "), "Sala de manutenção administrativa")
assert.ok(label.every((line) => line.length <= 11 || !line.includes(" ")))
const narrowRoom = { ...map.rooms[0], name: "Sala de manutenção administrativa", rect: { ...map.rooms[0].rect, w: 10 } }
const narrowLabel = tagged(render(0, "assassino", true, { ...map, rooms: [narrowRoom] }), "data-map-label")[0]
const longWord = nodes(narrowLabel).find((node) => node.type === "tspan" && text(node) === "administrativa")
assert.equal(longWord.props.textLength, 8.6, "Unbreakable labels are fitted inside the room width")
checks++

const distantStair = { id: "other-floor", level: 2, targetLevel: 3, x: 5, z: 5, targetX: 8, targetZ: 8 }
assert.ok(!ids(render(0, "assassino", true, { ...map, stairs: [...map.stairs, distantStair] }), "data-map-stair").includes("other-floor"))
assert.ok(!ids(render(1, "assassino", true, { ...map, stairs: [...map.stairs, distantStair] }), "data-map-stair").includes("other-floor"))
checks++

effects.length = 0
const svg = render(1)
const marker = tagged(svg, "data-map-player")[0]
const attributes = new Map()
marker.props.ref.current = { setAttribute: (name, value) => attributes.set(name, value) }
const cleanup = effects[0]()
const advance = () => {
  const [id, callback] = [...frames][0]
  frames.delete(id)
  callback()
}
advance()
assert.equal(attributes.get("transform"), "translate(31.56 30.00) rotate(0.0)")
poseRef.current = { x: 34.1, z: 32.2, dir: Math.PI / 2 }
advance()
assert.equal(attributes.get("transform"), "translate(34.10 32.20) rotate(90.0)")
cleanup()
assert.equal(frames.size, 0, "Animation callbacks are removed on unmount")
checks++

console.log(`Dedução minimap: ${checks}/${checks} checks passed.`)
console.log("Real SVG component, both floors/sizes, markers, doors, stair direction, labels and animation cleanup.")
