import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"
import * as THREE from "three"

const scenePath = "app/(game)/games/deducao/[roomId]/scene"
const map = JSON.parse(await readFile("assets/models/deducao/office-map.json", "utf8"))
async function compiled(path, names) {
  const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const printer = ts.createPrinter()
  const statements = names ? source.statements.filter(statement => ts.isFunctionDeclaration(statement)
    ? names.includes(statement.name?.text)
    : ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => names.includes(declaration.name.text))) : source.statements
  if (names) assert.equal(statements.length, names.length, "Todas as declarações reais devem ser carregadas")
  const text = statements.map(statement => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n")
  return ts.transpileModule(text + (names ? `\nmodule.exports={${names.join(",")}};` : ""), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText
}
function evaluate(code, bindings = {}) {
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, THREE, ...bindings }, { timeout: 2000 })
  return module.exports
}
const collision = evaluate(await compiled("lib/games/collision.ts"))
const { viewerLighting } = evaluate(await compiled(`${scenePath}/lighting-profile.ts`))
const sceneCode = await compiled(`${scenePath}/office-scene.tsx`, [
  "EYE_HEIGHT", "PITCH_LIMIT", "WALK_SPEED", "RUN_SPEED", "JUMP_SPEED", "GRAVITY", "SEND_EVERY_MS", "TASK_RANGE", "REPORT_RANGE", "VENT_RANGE", "STAIR_LANDING_SIZE",
  "stairSampleAt", "collidersAtHeight", "surfaceHeightAt", "SceneContent", "reportTargets",
])

class Surface extends EventTarget {
  control = false
  closest() { return this.control ? this : null }
  blur() {}
}
function harness({ quality = "alto", blackout = false, role = "funcionario", position = map.spawns[0], controlsEnabled = true } = {}) {
  const document = Object.assign(new EventTarget(), { activeElement: null, pointerLockElement: null, hidden: false })
  const window = Object.assign(new EventTarget(), { innerWidth: 1280 })
  const canvas = new Surface()
  const camera = new THREE.PerspectiveCamera()
  const gl = { domElement: canvas, toneMappingExposure: viewerLighting(blackout, role === "assassino").exposure }
  const lights = {}
  const effects = []
  let frame, now = 0, targets, blackoutValue
  const mine = { id: "local", name: "Teste", color: "#38bdf8", alive: true, connected: true, ready: true, inVent: false, dir: 0, ...position }
  const state = { players: new Map([[mine.id, mine]]) }
  const sent = []
  const snapshot = { players: [mine], phase: "jogando", config: {}, blackout, corpses: [] }
  const props = {
    map, snapshot, me: mine.id, role, allies: [], pendingTasks: [], quality, controlsEnabled,
    inputRef: { current: { x: 0, z: 0, sprint: false, crouch: false, jumpSerial: 0 } },
    lookRef: { current: { yaw: 0, pitch: 0 } }, poseRef: { current: { x: 0, z: 0, dir: 0 } },
    onTargets: value => { targets = value }, onReady: () => {},
    roomRef: { current: { state, send(type, payload) {
      sent.push({ type, ...payload })
      Object.assign(mine, payload)
      const sample = api.stairSampleAt(map, mine.x, mine.z)
      if (sample) mine.level = sample.progress >= 0.5 ? sample.targetLevel : sample.level
    } } },
  }
  const noop = () => null
  const api = evaluate(sceneCode, {
    ...collision, viewerLighting, FLOOR_HEIGHT: 4.2, NO_TARGETS: { task: null, corpse: null, emergency: false, vent: null, kill: null },
    document, window, AbortController, Element: Surface, HTMLElement: Surface, performance: { now: () => now },
    isGameControlTarget: target => target instanceof Surface && target.control,
    playGameSound: () => {}, setBlackout: value => { blackoutValue = value }, prepareScene: () => Promise.resolve(),
    useThree: () => ({ camera, gl }), useRef: current => ({ current }), useMemo: factory => factory(),
    useEffect: effect => effects.push(effect), useFrame: callback => { frame = callback },
    ProceduralEnvironment: noop, CinematicEffects: noop, NightSky: noop, OfficeBuilding: noop, OfficeWorld: noop, Markers: noop, Actor: noop, Corpse: noop,
    React: { createElement(type, attributes, ...children) {
      if (attributes?.ref && ["ambientLight", "hemisphereLight", "directionalLight", "spotLight", "object3D"].includes(type)) {
        const constructors = { ambientLight: THREE.AmbientLight, hemisphereLight: THREE.HemisphereLight, directionalLight: THREE.DirectionalLight, spotLight: THREE.SpotLight, object3D: THREE.Object3D }
        const item = new constructors[type](...(attributes.args ?? []))
        if (attributes.intensity !== undefined) item.intensity = attributes.intensity
        if (attributes.color) item.color.set(attributes.color)
        attributes.ref.current = item
        lights[type] = item
      }
      return { type, props: { ...attributes, children } }
    } },
  })
  api.SceneContent(props)
  const cleanup = effects.map(effect => effect()).filter(Boolean)
  function tick(count = 1, delta = 1 / 60) {
    for (let index = 0; index < count; index++) { now += delta * 1000; frame({}, delta) }
  }
  tick()
  return { ...api, props, camera, gl, lights, sent, mine, canvas, document, window, tick,
    get targets() { return targets }, get blackoutValue() { return blackoutValue },
    dispose() { cleanup.reverse().forEach(callback => callback()) },
  }
}
function near(actual, expected, message, tolerance = 0.002) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual} != ${expected}`)
}
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }

check("Camera e luzes reais da cena usam o mesmo perfil nas três qualidades e papéis", () => {
  for (const quality of ["baixo", "medio", "alto"]) for (const blackout of [false, true]) for (const role of ["funcionario", "assassino"]) {
    const h = harness({ quality, blackout, role })
    h.tick(120)
    const profile = viewerLighting(blackout, role === "assassino")
    near(h.gl.toneMappingExposure, profile.exposure, "Exposição")
    for (const [name, key] of [["directionalLight", "sun"], ["hemisphereLight", "sky"], ["ambientLight", "ambient"]]) near(h.lights[name].intensity, profile[key], key)
    assert.equal(h.blackoutValue, blackout && role !== "assassino")
    near(h.camera.position.y, 1.62, "Altura dos olhos")
    assert.ok(h.sent.length >= 25, "Loop real envia movimento")
    h.dispose()
  }
})

check("Percorre os dois lances e patamar da escada com câmera contínua nos dois sentidos", () => {
  const stair = map.stairs[0]
  const route = [{ x: stair.x, z: stair.z }, { x: stair.turnX, z: stair.turnZ }, { x: stair.targetX, z: stair.targetZ }]
  for (const reverse of [false, true]) {
    const points = reverse ? route.toReversed() : route
    const h = harness({ position: { ...points[0], level: reverse ? 1 : 0 } })
    let previous = h.camera.position.y
    for (const destination of points.slice(1)) {
      for (let frame = 0; frame < 300; frame++) {
        const dx = destination.x - h.props.poseRef.current.x, dz = destination.z - h.props.poseRef.current.z
        if (Math.hypot(dx, dz) < 0.025) break
        h.props.inputRef.current.x = Math.abs(dx) > 0.02 ? Math.sign(dx) : 0
        h.props.inputRef.current.z = Math.abs(dz) > 0.02 ? Math.sign(dz) : 0
        h.tick(1, 1 / 120)
        const height = h.camera.position.y
        assert.ok(Math.abs(height - previous) < 0.06, `Salto de câmera na escada: ${height - previous}`)
        previous = height
      }
      near(h.props.poseRef.current.x, destination.x, "Escada X", 0.08)
      near(h.props.poseRef.current.z, destination.z, "Escada Z", 0.08)
    }
    near(h.camera.position.y, (reverse ? 0 : 4.2) + 1.62, "Desembarque", 0.08)
    h.dispose()
  }
})

check("Interação fica bloqueada na escada e volta no desembarque", () => {
  const stair = map.stairs[0]
  const h = harness({ position: { x: stair.turnX, z: stair.turnZ, level: 0 } })
  assert.equal(h.targets.task, null)
  assert.equal(h.targets.vent, null)
  near(h.camera.position.y, 3.72, "Patamar plano")
  h.dispose()
})

check("Controles desabilitados ou campo focado não movem nem pulam", () => {
  for (const focused of [false, true]) {
    const h = harness({ controlsEnabled: focused })
    if (focused) h.document.activeElement = Object.assign(new Surface(), { control: true })
    const start = h.camera.position.clone()
    Object.assign(h.props.inputRef.current, { x: 1, z: -1, jumpSerial: 1 })
    h.tick(60)
    near(h.camera.position.distanceTo(start), 0, "Câmera parada")
    h.dispose()
  }
})

check("Lanterna acompanha a câmera ao agachar e pular", () => {
  const h = harness({ blackout: true })
  h.props.inputRef.current.crouch = true
  h.tick(60)
  near(h.camera.position.y, 1.08, "Agachado")
  near(h.lights.spotLight.position.distanceTo(h.camera.position), 0, "Lanterna agachada")
  h.props.inputRef.current.crouch = false
  h.props.inputRef.current.jumpSerial++
  h.tick(12)
  assert.ok(h.camera.position.y > 1.9, "Pulo eleva câmera")
  near(h.lights.spotLight.position.distanceTo(h.camera.position), 0, "Lanterna no pulo")
  h.dispose()
})

function touch(target, type, id, x, y) {
  const event = new Event(type, { cancelable: true })
  event.changedTouches = [{ identifier: id, clientX: x, clientY: y }]
  target.dispatchEvent(event)
}
check("Olhar touch limpa o dedo antigo ao perder foco, ocultar página ou focar um controle", () => {
  for (const reset of ["hidden", "blur", "focus"]) {
    const h = harness()
    touch(h.canvas, "touchstart", 1, 900, 300)
    touch(h.canvas, "touchmove", 1, 910, 300)
    const previous = h.props.lookRef.current.yaw
    assert.notEqual(previous, 0)
    if (reset === "hidden") { h.document.hidden = true; h.document.dispatchEvent(new Event("visibilitychange")); h.document.hidden = false }
    else if (reset === "focus") {
      const event = new Event("focusin")
      Object.defineProperty(event, "target", { value: Object.assign(new Surface(), { control: true }) })
      h.document.dispatchEvent(event)
    } else h.window.dispatchEvent(new Event("blur"))
    touch(h.canvas, "touchmove", 1, 1000, 300)
    near(h.props.lookRef.current.yaw, previous, "Dedo obsoleto não gira")
    touch(h.canvas, "touchstart", 2, 920, 300)
    touch(h.canvas, "touchmove", 2, 930, 300)
    assert.notEqual(h.props.lookRef.current.yaw, previous, "Novo toque retoma o olhar")
    h.dispose()
  }
})

console.log(`${checks} verificações integradas da cena passaram. Transporte é local; não substitui uma partida multiplayer real.`)
