import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"
import * as THREE from "three"

const scenePath = "app/(game)/games/deducao/[roomId]/scene"
const map = JSON.parse(await readFile("assets/models/deducao/office-map.json", "utf8"))
const lobbyLayout = JSON.parse(await readFile("assets/models/deducao/online-lobby-layout.json", "utf8"))
const lobbyMap = {
  ...map, id: "lobby-test", name: "Sala de testes", floors: 1,
  bounds: { x: lobbyLayout.bounds.minX, z: lobbyLayout.bounds.minZ,
    w: lobbyLayout.bounds.maxX - lobbyLayout.bounds.minX, d: lobbyLayout.bounds.maxZ - lobbyLayout.bounds.minZ },
  rooms: [{ id: "lobby", level: 0 }], walls: [], obstacles: lobbyLayout.colliders.map((box) => ({ ...box,
    minX: box.x - box.w / 2, maxX: box.x + box.w / 2, minZ: box.z - box.d / 2, maxZ: box.z + box.d / 2,
    level: 0, tall: box.height > 1.2 })),
  taskSpots: [], vents: [], stairs: [], doors: [], spawns: lobbyLayout.spawns,
}
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
const movement = evaluate(await compiled(`${scenePath}/movement-geometry.ts`))
const { viewerLighting, FIXTURE_INTENSITY } = evaluate(await compiled(`${scenePath}/lighting-profile.ts`))
const { LOBBY_LIGHT_SOURCES } = evaluate(await compiled(`${scenePath}/lobby-world.tsx`, ["LOBBY_LIGHT_SOURCES"]), { layout: lobbyLayout, FIXTURE_INTENSITY })
const { BIBAO_ARTWORK_PLACEMENTS } = evaluate(await compiled(`${scenePath}/framed-artwork.tsx`, ["BIBAO_ARTWORK_PLACEMENTS"]))
const sceneCode = await compiled(`${scenePath}/office-scene.tsx`, [
  "EYE_HEIGHT", "PITCH_LIMIT", "WALK_SPEED", "RUN_SPEED", "JUMP_SPEED", "GRAVITY", "SEND_EVERY_MS", "TASK_RANGE", "REPORT_RANGE", "VENT_RANGE",
  "SceneContent", "reportTargets",
])

class Surface extends EventTarget {
  control = false
  closest() { return this.control ? this : null }
  blur() {}
}
function harness({ quality = "alto", blackout = false, role = "funcionario", lobby = false, sceneMap = map,
  position = sceneMap.spawns[0], controlsEnabled = true, latency = 0 } = {}) {
  const document = Object.assign(new EventTarget(), { activeElement: null, pointerLockElement: null, hidden: false })
  const window = Object.assign(new EventTarget(), { innerWidth: 1280 })
  const canvas = new Surface()
  const camera = new THREE.PerspectiveCamera()
  const gl = { domElement: canvas, toneMappingExposure: viewerLighting(blackout, role === "assassino").exposure }
  const lights = {}
  const effects = []
  let frame, now = 0, targets, targetUpdates = 0, blackoutValue
  const mine = { id: "local", name: "Teste", color: "#38bdf8", alive: true, connected: true, ready: true, inVent: false, dir: 0, ...position }
  const state = { players: new Map([[mine.id, mine]]) }
  const sent = []
  const pending = []
  const acknowledge = payload => {
    if (snapshot.phase !== "jogando" && snapshot.phase !== "lobby") return
    Object.assign(mine, payload, { moveSequence: payload.sequence })
    const sample = api.stairSampleAt(sceneMap, mine.x, mine.z)
    if (sample) mine.level = sample.progress >= 0.5 ? sample.targetLevel : sample.level
  }
  const snapshot = { players: [mine], phase: lobby ? "lobby" : "jogando", config: {}, blackout, corpses: [] }
  const props = {
    map: sceneMap, lobby, snapshot, me: mine.id, role, allies: [], pendingTasks: [], quality, controlsEnabled,
    inputRef: { current: { x: 0, z: 0, sprint: false, crouch: false, jumpSerial: 0 } },
    lookRef: { current: { yaw: 0, pitch: 0 } }, poseRef: { current: { x: 0, z: 0, dir: 0 } },
    onTargets: value => { targets = value; targetUpdates++ }, onReady: () => {},
    roomRef: { current: { state, send(type, payload) {
      sent.push({ type, ...payload })
      if (latency) pending.push({ at: now + latency, payload })
      else acknowledge(payload)
    } } },
  }
  const noop = () => null
  const api = evaluate(sceneCode, {
    ...collision, ...movement, viewerLighting, NO_TARGETS: { task: null, corpse: null, emergency: false, vent: null, kill: null },
    document, window, AbortController, Element: Surface, HTMLElement: Surface, performance: { now: () => now },
    isGameControlTarget: target => target instanceof Surface && target.control,
    playGameSound: () => {}, prepareGameAudio: () => {}, setBlackout: value => { blackoutValue = value }, prepareScene: () => Promise.resolve(),
    useThree: () => ({ camera, gl }), useRef: current => ({ current }), useMemo: factory => factory(),
    useEffect: effect => effects.push(effect), useFrame: callback => { frame = callback },
    AdaptiveResolution: noop, OfficeLightGrid: "OfficeLightGrid", ProceduralEnvironment: noop, CinematicEffects: noop,
    NightSky: "NightSky", OfficeBuilding: "OfficeBuilding", OfficeWorld: "OfficeWorld", Markers: "Markers", Actor: "Actor", Corpse: "Corpse",
    LobbyWorld: "LobbyWorld", LOBBY_LIGHT_SOURCES, FramedArtwork: "FramedArtwork", BIBAO_ARTWORK_PLACEMENTS,
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
  Object.assign(api, movement)
  const tree = api.SceneContent(props)
  const cleanup = effects.map(effect => effect()).filter(Boolean)
  function tick(count = 1, delta = 1 / 60) {
    for (let index = 0; index < count; index++) {
      now += delta * 1000
      while (pending[0]?.at <= now) acknowledge(pending.shift().payload)
      frame({}, delta)
    }
  }
  tick()
  return { ...api, props, tree, camera, gl, lights, sent, mine, canvas, document, window, tick,
    get targets() { return targets }, get blackoutValue() { return blackoutValue },
    get targetUpdates() { return targetUpdates },
    dispose() { cleanup.reverse().forEach(callback => callback()) },
  }
}
function near(actual, expected, message, tolerance = 0.002) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual} != ${expected}`)
}
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }
function find(tree, type) {
  if (tree?.type === type) return tree
  for (const child of tree?.props?.children?.flat(Infinity) ?? []) {
    const result = child && typeof child === "object" ? find(child, type) : null
    if (result) return result
  }
  return null
}

check("Camera e luzes reais da cena usam o mesmo perfil nas três qualidades e papéis", () => {
  for (const quality of ["baixo", "medio", "alto"]) for (const blackout of [false, true]) for (const role of ["funcionario", "assassino"]) {
    const h = harness({ quality, blackout, role })
    h.tick(120)
    const profile = viewerLighting(blackout, role === "assassino")
    near(h.gl.toneMappingExposure, profile.exposure, "Exposição")
    for (const [name, key] of [["directionalLight", "sun"], ["hemisphereLight", "sky"], ["ambientLight", "ambient"]]) near(h.lights[name].intensity, profile[key], key)
    assert.equal(h.blackoutValue, blackout && role !== "assassino")
    near(h.camera.position.y, 1.62, "Altura dos olhos")
    assert.ok(h.sent.length >= 7 && h.sent.length <= 9, "Parado mantém heartbeat de 4Hz, sem 20 pacotes iguais por segundo")
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

check("Parada não volta para ecos atrasados da rede e transmite o último movimento", () => {
  for (const fps of [30, 60, 120]) for (const latency of [50, 150, 300]) {
    const h = harness({ latency, position: { x: 25, z: 23, level: 0 } })
    h.props.inputRef.current.x = 1
    h.tick(fps, 1 / fps)
    h.props.inputRef.current.x = 0
    let previous = h.camera.position.x
    const stop = previous
    for (let frame = 0; frame < fps * 2; frame++) {
      h.tick(1, 1 / fps)
      assert.ok(h.camera.position.x >= previous - 0.0001, `${fps}fps/${latency}ms: eco puxou a câmera para trás`)
      previous = h.camera.position.x
    }
    assert.ok(previous - stop < 0.3, "Desaceleração curta, sem deslizar pelo mapa")
    assert.equal(h.sent.at(-1).moving, false)
    assert.ok(h.sent.every((packet, index) => !index || packet.sequence > h.sent[index - 1].sequence))
    near(h.mine.x, h.camera.position.x, "Posição final aceita pelo servidor", 0.01)
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

check("Servidor ainda pode corrigir uma posição rejeitada ou teleportar", () => {
  const h = harness({ position: { x: 25, z: 23, level: 0 } })
  h.tick(30)
  h.mine.x = 20
  h.tick()
  near(h.camera.position.x, 20, "Teleporte autoritativo não é ignorado pela confirmação")
  h.props.lookRef.current.yaw = 1
  h.tick(5)
  near(h.sent.at(-1).dir, 1 + Math.PI, "Olhar parado não espera o heartbeat lento")
  h.dispose()
})

check("Reunião aceita teleporte curto mesmo com movimento sem confirmação", () => {
  const h = harness({ latency: 300, position: { x: 25, z: 23, level: 0 } })
  h.props.inputRef.current.x = 1
  h.tick(60)
  const meetingX = h.camera.position.x - 1
  h.props.inputRef.current.x = 0
  h.props.snapshot.phase = "reuniao"
  Object.assign(h.mine, { x: meetingX, moving: false })
  h.tick()
  near(h.camera.position.x, meetingX, "Reunião não espera ack de movimento descartado")
  h.tick(120)
  near(h.camera.position.x, meetingX, "Ecos antigos não tiram o jogador do assento")
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

check("Cena de lobby escolhe sua sala e seis fontes reais sem prédio, céu ou marcadores da partida", () => {
  for (const quality of ["baixo", "medio", "alto"]) {
    const h = harness({ lobby: true, sceneMap: lobbyMap, quality, role: null })
    assert.equal(find(h.tree, "LobbyWorld").props.quality, quality)
    for (const excluded of ["OfficeBuilding", "OfficeWorld", "NightSky", "Markers"]) assert.equal(find(h.tree, excluded), null)
    assert.ok(find(h.tree, "Actor"), "Avatares continuam no mesmo mundo online")
    const grid = find(h.tree, "OfficeLightGrid").props
    assert.equal(grid.map, lobbyMap)
    assert.equal(grid.sources, LOBBY_LIGHT_SOURCES)
    assert.equal(grid.sources.length, 6)
    assert.equal(new Set(grid.sources.map((source) => source.color)).size, 5)
    for (const source of grid.sources) assert.ok(source.intensity > 0 && source.range > 0)
    near(h.camera.position.y, 1.62, "Câmera do lobby apoiada no piso")
    h.dispose()
  }
})

check("Movimento previsto do lobby não volta para a posição antiga a cada quadro ou eco de rede", () => {
  for (const fps of [30, 60, 120]) for (const latency of [50, 150, 300]) {
    const h = harness({ lobby: true, sceneMap: lobbyMap, latency })
    const start = h.camera.position.x
    h.props.inputRef.current.x = 1
    let previous = start
    for (let frame = 0; frame < fps; frame++) {
      h.tick(1, 1 / fps)
      assert.ok(h.camera.position.x >= previous - 0.0001, `Lobby ${fps}fps/${latency}ms: movimento regrediu`)
      previous = h.camera.position.x
    }
    assert.ok(previous - start > 4, "Lobby realmente anda, não só anima parado")
    h.props.inputRef.current.x = 0
    const stop = previous
    for (let frame = 0; frame < fps * 2; frame++) {
      h.tick(1, 1 / fps)
      assert.ok(h.camera.position.x >= previous - 0.0001, `Lobby ${fps}fps/${latency}ms: eco puxou para trás`)
      previous = h.camera.position.x
    }
    assert.ok(previous - stop < 0.3)
    assert.equal(h.sent.at(-1).moving, false)
    assert.ok(h.sent.every((packet, index) => !index || packet.sequence > h.sent[index - 1].sequence))
    near(h.mine.x, h.camera.position.x, "Confirmação final do lobby", 0.01)
    h.dispose()
  }
})

check("Lobby não publica alvos de partida e não repete a limpeza em cada quadro", () => {
  const h = harness({ lobby: true, sceneMap: lobbyMap, role: "assassino" })
  h.props.snapshot.corpses.push({ id: "stale-body", playerId: "old", x: h.mine.x, z: h.mine.z, level: 0, reported: false })
  h.props.inputRef.current.x = 1
  h.tick(180)
  assert.deepEqual(Object.keys(h.targets).sort(), ["corpse", "emergency", "kill", "task", "vent"])
  for (const value of Object.values(h.targets)) assert.ok(value === null || value === false)
  assert.equal(h.targetUpdates, 1, "Sem spam de setState dos alvos durante exploração")
  h.dispose()
})

check("Sala respeita colisores do mobiliário e preparação impede andar ou pular", () => {
  const h = harness({ lobby: true, sceneMap: lobbyMap, position: { x: 0, z: 0, level: 0 } })
  h.props.inputRef.current.x = 1
  h.tick(240)
  const cabinet = lobbyLayout.colliders.find((box) => box.id === "lobby-east-cabinet")
  assert.ok(h.camera.position.x > 4)
  assert.ok(h.camera.position.x <= cabinet.x - cabinet.w / 2 - collision.PLAYER_RADIUS + 0.02)
  h.dispose()
  const paused = harness({ lobby: true, sceneMap: lobbyMap, controlsEnabled: false })
  const start = paused.camera.position.clone()
  Object.assign(paused.props.inputRef.current, { x: 1, z: -1, sprint: true, jumpSerial: 1 })
  paused.tick(120)
  near(paused.camera.position.distanceTo(start), 0, "Preparação não deixa input residual atravessar")
  paused.dispose()
})

console.log(`${checks} verificações integradas da cena passaram. Transporte é local; não substitui uma partida multiplayer real.`)
