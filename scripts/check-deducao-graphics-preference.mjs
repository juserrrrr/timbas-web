import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const path = "app/(game)/games/deducao/[roomId]/match.tsx"
const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const names = ["QUALITY_KEY", "initialQuality", "Match"]
const selected = source.statements.filter((statement) => ts.isFunctionDeclaration(statement)
  ? names.includes(statement.name?.text)
  : ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => names.includes(declaration.name.text)))
assert.equal(selected.length, names.length)
const printer = ts.createPrinter()
const code = ts.transpileModule(selected.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n") + `\nmodule.exports={${names.join(",")}}`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText
const key = "timbas.deducao.graphics-quality"
function browser(saved = null, { readError = false, writeError = false, blocked = false } = {}) {
  const values = new Map(saved === null ? [] : [[key, saved]])
  const stats = { reads: 0, writes: 0 }
  return { values, stats, window: {
    get localStorage() {
      if (blocked) throw new Error("Storage bloqueado")
      return {
        getItem(name) { stats.reads++; if (readError) throw new Error("Leitura bloqueada"); return values.get(name) ?? null },
        setItem(name, value) { stats.writes++; if (writeError) throw new Error("Quota indisponível"); values.set(name, value) },
      }
    },
  } }
}
function find(tree, type) {
  if (tree?.type === type) return tree
  for (const child of tree?.props?.children?.flat(Infinity) ?? []) if (child && typeof child === "object") {
    const match = find(child, type)
    if (match) return match
  }
}
function mount(environment) {
  const module = { exports: {} }, slots = []
  let cursor = 0, tree
  const useState = (initial) => {
    const index = cursor++
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial
    return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next }]
  }
  const useMemo = (factory, deps) => {
    const index = cursor++
    if (!slots[index] || deps.some((value, at) => !Object.is(value, slots[index].deps[at]))) slots[index] = { value: factory(), deps }
    return slots[index].value
  }
  vm.runInNewContext(code, {
    module, exports: module.exports, ...(environment ? { window: environment.window } : {}),
    useState, useMemo, useCallback: (callback, deps) => useMemo(() => callback, deps),
    useRef: (value) => slots[cursor++] ??= { current: value }, useEffect() { cursor++ },
    NO_TARGETS: { task: null, kill: null, vent: null, corpse: null, emergency: false },
    OfficeScene: "OfficeScene", Hud: "Hud", Meeting: "Meeting", EndScreen: "EndScreen", TaskOverlay: "TaskOverlay",
    LoaderCircle: "LoaderCircle",
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
  })
  assert.equal(module.exports.QUALITY_KEY, key, "Preferências existentes usam a mesma chave")
  let props = { map: { taskSpots: [] }, snapshot: { phase: "jogando", blackout: false, players: [{ id: "me", alive: true }] },
    roomRef: { current: null }, me: "me", role: null, sabotageStatus: null, allies: [], myTasks: [], finalRoles: {}, notices: [],
    poseRef: { current: { x: 0, z: 0, dir: 0 } }, voice: { configured: true }, onSend() {}, onLeave() {} }
  const render = (patch = {}) => { props = { ...props, ...patch }; cursor = 0; tree = module.exports.Match(props); return tree }
  render()
  return { render, scene: () => find(tree, "OfficeScene").props, hud: () => find(tree, "Hud").props,
    phase: (phase) => render({ snapshot: { ...props.snapshot, phase } }), initialQuality: module.exports.initialQuality }
}
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }

check("Primeira visita começa em Leve no primeiro Canvas, sem escrever preferência automática", () => {
  const environment = browser(), fixture = mount(environment)
  assert.equal(fixture.scene().quality, "baixo")
  assert.equal(fixture.hud().quality, "baixo")
  assert.equal(typeof fixture.scene().key, "string", "Canvas tem identidade estável para a preferência inicial")
  assert.equal(environment.stats.reads, 1)
  assert.equal(environment.stats.writes, 0)
})

check("Leve, Médio e Alto já salvos entram diretamente na primeira renderização", () => {
  const sceneKeys = new Set()
  for (const quality of ["baixo", "medio", "alto"]) {
    const environment = browser(quality), fixture = mount(environment)
    assert.equal(fixture.scene().quality, quality)
    assert.equal(fixture.hud().quality, quality)
    const sceneKey = fixture.scene().key
    sceneKeys.add(sceneKey)
    fixture.render()
    assert.equal(fixture.scene().key, sceneKey)
    assert.equal(environment.stats.reads, 1, "Rerender não relê nem troca o Canvas por um efeito tardio")
    assert.equal(environment.stats.writes, 0)
  }
  assert.equal(sceneKeys.size, 3, "Cada qualidade recria os recursos do Canvas sem impor formato à chave")
})

check("Valores ausentes ou inválidos caem em Leve sem apagar os dados salvos", () => {
  for (const invalid of [null, "", "ALTO", "ultra", "undefined", '{"quality":"alto"}']) {
    const environment = browser(invalid), fixture = mount(environment)
    assert.equal(fixture.scene().quality, "baixo")
    assert.equal(environment.values.get(key) ?? null, invalid)
    assert.equal(environment.stats.writes, 0)
  }
})

check("Escolha manual é persistida e restaurada nas próximas partidas e recargas", () => {
  const environment = browser()
  let fixture = mount(environment)
  for (const quality of ["medio", "alto", "baixo"]) {
    fixture.hud().onQuality(quality)
    fixture.render()
    assert.equal(fixture.scene().quality, quality)
    assert.equal(environment.values.get(key), quality)
    fixture = mount(environment)
    assert.equal(fixture.scene().quality, quality)
  }
})

check("Troca real limpa movimento e alvos, pausa controles e conserva a voz compartilhada", () => {
  const fixture = mount(browser())
  fixture.scene().onReady(); fixture.render()
  const voice = fixture.hud().voice, pose = fixture.scene().poseRef
  const sceneKey = fixture.scene().key
  fixture.scene().inputRef.current.x = 1
  fixture.scene().inputRef.current.sprint = true
  fixture.scene().onTargets({ task: { id: "task" } }); fixture.render()
  assert.equal(fixture.scene().controlsEnabled, true)
  fixture.hud().onQuality("alto"); fixture.render()
  assert.equal(fixture.scene().inputRef.current.x, 0)
  assert.equal(fixture.scene().inputRef.current.sprint, false)
  assert.equal(fixture.hud().targets.task, null)
  assert.equal(fixture.scene().controlsEnabled, false)
  assert.notEqual(fixture.scene().key, sceneKey)
  assert.equal(fixture.hud().voice, voice)
  assert.equal(fixture.scene().poseRef, pose)
  fixture.scene().onReady(); fixture.render()
  assert.equal(fixture.scene().controlsEnabled, true)
})

check("Repetir a qualidade atual salva a escolha sem reiniciar Canvas ou controles", () => {
  const environment = browser(), fixture = mount(environment)
  fixture.scene().onReady(); fixture.render()
  const sceneKey = fixture.scene().key
  fixture.scene().inputRef.current.x = 1
  fixture.hud().onQuality("baixo"); fixture.render()
  assert.equal(environment.values.get(key), "baixo")
  assert.equal(fixture.scene().key, sceneKey)
  assert.equal(fixture.scene().controlsEnabled, true)
  assert.equal(fixture.scene().inputRef.current.x, 1)
})

check("Lobby, jogo, reunião e nova rodada conservam a escolha sem novas leituras", () => {
  const environment = browser("medio"), fixture = mount(environment)
  for (const phase of ["lobby", "jogando", "reuniao", "votacao", "fim", "lobby", "jogando"]) {
    fixture.render({ lobby: phase === "lobby" })
    fixture.phase(phase)
    assert.equal(fixture.scene().quality, "medio")
  }
  assert.equal(environment.stats.reads, 1)
  assert.equal(environment.stats.writes, 0)
})

check("SSR, armazenamento bloqueado e falha de gravação preservam um fallback utilizável", () => {
  assert.equal(mount().scene().quality, "baixo")
  for (const options of [{ readError: true }, { blocked: true }]) assert.equal(mount(browser("alto", options)).scene().quality, "baixo")
  for (const options of [{ writeError: true }, { blocked: true }]) {
    const environment = browser(null, options), fixture = mount(environment)
    fixture.hud().onQuality("alto"); fixture.render()
    assert.equal(fixture.scene().quality, "alto", "Seleção funciona na sessão mesmo sem armazenamento")
    assert.equal(mount(environment).scene().quality, "baixo", "Sem gravação não se promete persistência")
  }
})

console.log(`${checks} verificações de preferência gráfica passaram. Padrão Leve e escolhas manuais persistentes.`)
