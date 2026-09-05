import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const directory = "app/(game)/games/deducao/[roomId]/"
const compile = (source, fileName = "test.ts") => ts.transpileModule(source, {
  fileName,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText
let now = 0
const loaded = { exports: {} }
vm.runInNewContext(compile(await readFile(`${directory}emergency-cooldown.ts`, "utf8")), {
  module: loaded, exports: loaded.exports, performance: { now: () => now },
})
const { calibrateEmergencyStatus, emergencyRemainingMs, canCallEmergency } = loaded.exports
const hookText = await readFile(`${directory}use-deducao-room.ts`, "utf8")
const hook = ts.createSourceFile("use-deducao-room.ts", hookText, ts.ScriptTarget.Latest, true)
const printer = ts.createPrinter()
const mine = { id: "me", alive: true, connected: true, inVent: false, emergenciesLeft: 1 }
const snapshot = { phase: "jogando", emergencyReadyAt: 0, players: [mine] }
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }
const plain = (value) => JSON.parse(JSON.stringify(value))

function messageHandler(name, bindings) {
  let handler
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "onMessage" && node.arguments[0]?.text === name) handler = node.arguments[1]
    ts.forEachChild(node, visit)
  }
  visit(hook)
  assert.ok(handler, `Handler real ${name} precisa existir`)
  const result = { exports: {} }
  vm.runInNewContext(compile(`module.exports = ${printer.printNode(ts.EmitHint.Unspecified, handler, hook)}`), {
    module: result, exports: result.exports, calibrateEmergencyStatus, ...bindings,
  })
  return result.exports
}

check("Emergência usa 30 segundos calibrados, não o relógio do computador", () => {
  for (const serverNow of [0, 1_800_000_000_000, 2_800_000_000_000]) {
    for (const receivedAt of [0, 123_456, 2_000_000_000]) {
      now = receivedAt
      const status = calibrateEmergencyStatus({ readyAt: serverNow + 30_000, serverNow, cooldownMs: 30_000 })
      const current = { ...snapshot, emergencyReadyAt: status.readyAt }
      assert.equal(status.receivedAt, receivedAt)
      for (const elapsed of [0, 1, 999, 1000, 29_999, 30_000, 60_000]) {
        now = receivedAt + elapsed
        assert.equal(emergencyRemainingMs(status), Math.max(0, 30_000 - elapsed))
        assert.equal(canCallEmergency(current, "me", status), elapsed >= 30_000)
        assert.equal(emergencyRemainingMs(status, receivedAt + elapsed), Math.max(0, 30_000 - elapsed))
      }
    }
  }
})

check("Status novo e snapshot precisam concordar antes de liberar o botão", () => {
  now = 5000
  const ready = calibrateEmergencyStatus({ readyAt: 0, serverNow: 100_000, cooldownMs: 30_000 })
  assert.equal(canCallEmergency(snapshot, "me", ready), true)
  const nextSnapshot = { ...snapshot, emergencyReadyAt: 130_000 }
  assert.equal(canCallEmergency(nextSnapshot, "me", ready), false, "Snapshot chegou antes do status")
  const waiting = calibrateEmergencyStatus({ readyAt: 130_000, serverNow: 100_000, cooldownMs: 30_000 })
  now += 65_000
  assert.equal(emergencyRemainingMs(waiting), 0, "Aba suspensa não acrescenta espera")
  assert.equal(canCallEmergency(snapshot, "me", waiting), false, "Status chegou antes do snapshot")
  assert.equal(canCallEmergency(nextSnapshot, "me", waiting), true)
  const resynced = calibrateEmergencyStatus({ readyAt: 160_000, serverNow: 145_000, cooldownMs: 30_000 })
  assert.equal(emergencyRemainingMs(resynced), 15_000)
  assert.equal(emergencyRemainingMs(resynced, now - 1000), 15_000, "Relógio monotônico atrasado não amplia o prazo")
  assert.equal(emergencyRemainingMs(null), Infinity)
  assert.equal(canCallEmergency(snapshot, "me", null), false)
  assert.equal(canCallEmergency({ ...snapshot, emergencyReadyAt: undefined }, "me", ready), false)
})

check("Fase, vida, conexão estrita, duto e chamadas restantes controlam elegibilidade", () => {
  const ready = calibrateEmergencyStatus({ readyAt: 0, serverNow: 10_000, cooldownMs: 30_000 })
  for (const phase of ["lobby", "reuniao", "votacao", "fim"]) {
    assert.equal(canCallEmergency({ ...snapshot, phase }, "me", ready), false)
  }
  for (const patch of [
    { alive: false }, { connected: false }, { connected: undefined }, { connected: 1 },
    { inVent: true }, { emergenciesLeft: 0 }, { emergenciesLeft: -1 }, { emergenciesLeft: undefined },
  ]) {
    assert.equal(canCallEmergency({ ...snapshot, players: [{ ...mine, ...patch }] }, "me", ready), false)
  }
  assert.equal(canCallEmergency(snapshot, "missing", ready), false)
  assert.equal(canCallEmergency({ ...snapshot, players: [] }, "me", ready), false)
  assert.equal(canCallEmergency({ ...snapshot, blackout: true }, "me", ready), true, "Apagão não bloqueia reunião")
  for (const role of ["assassino", "detetive", "funcionario"]) {
    assert.equal(canCallEmergency({ ...snapshot, players: [{ ...mine, role, emergenciesLeft: 3 }] }, "me", ready), true)
  }
})

check("Payload de emergência valida números finitos e não copia campos inesperados", () => {
  const payload = { readyAt: 30_000, serverNow: 0, cooldownMs: 30_000 }
  for (const invalid of [null, false, "status", {}, ...["readyAt", "serverNow", "cooldownMs"].flatMap((key) =>
    [undefined, NaN, Infinity, -Infinity, "30000", -1].map((value) => ({ ...payload, [key]: value })))]) {
    assert.equal(calibrateEmergencyStatus(invalid), null)
  }
  assert.equal(calibrateEmergencyStatus({ ...payload, cooldownMs: 0 }), null)
  for (const invalidTime of [NaN, Infinity, -Infinity]) assert.equal(calibrateEmergencyStatus(payload, invalidTime), null)
  const valid = calibrateEmergencyStatus(Object.freeze({ ...payload, role: "não copiar" }), 456)
  assert.deepEqual(plain(valid), { ...payload, receivedAt: 456 })
})

check("Handler real sincroniza emergência, descarta inválidos e novo papel limpa status", () => {
  let status = null
  const handle = messageHandler("emergency:status", { setEmergencyStatus(next) { status = next } })
  now = 5678
  handle({ readyAt: 130_000, serverNow: 100_000, cooldownMs: 30_000 })
  assert.equal(status.receivedAt, now)
  assert.equal(emergencyRemainingMs(status), 30_000)
  const valid = status
  handle({ readyAt: "inválido", serverNow: 100_000, cooldownMs: 30_000 })
  assert.equal(status, valid)
  let role
  const assignRole = messageHandler("papel", {
    setEmergencyStatus(next) { status = next }, setRole(next) { role = next },
    setFinalRoles() {}, setAllies() {}, setMyTasks() {}, setSabotageStatus() {},
  })
  assignRole({ role: "funcionario", tasks: [], allies: [] })
  assert.equal(status, null)
  assert.equal(role, "funcionario")
  const registration = hookText.indexOf('room.onMessage("emergency:status"')
  const request = hookText.indexOf('room.send("emergency:status")')
  assert.ok(registration >= 0 && request > registration, "Reconexão instala o handler antes de solicitar o prazo")
})

check("Snapshot real publica prazo global e configuração sem compartilhar status calibrado", () => {
  const definition = hook.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "snapshotOf")
  assert.ok(definition)
  const result = { exports: {} }
  vm.runInNewContext(compile(`${definition.getText(hook)}\nmodule.exports = snapshotOf`), { module: result })
  const state = {
    phase: "jogando", players: new Map([["me", mine]]), meeting: { voted: new Map(), tally: new Map() },
    corpses: new Map(), chat: [], config: {}, emergencyReadyAt: 130_000,
    emergencyStatus: { secret: true }, sabotageStatus: { secret: true },
  }
  const actual = result.exports(state)
  assert.equal(actual.emergencyReadyAt, 130_000)
  assert.equal(actual.config.emergencyCooldownMs, 30_000)
  assert.equal(actual.players[0].connected, true)
  assert.equal(actual.players[0].emergenciesLeft, 1)
  assert.equal(actual.emergencyStatus, undefined)
  assert.equal(actual.sabotageStatus, undefined)
  assert.equal(result.exports({ ...state, emergencyReadyAt: undefined }).emergencyReadyAt, 0)
  const configured = result.exports({ ...state, config: { emergencyCooldownMs: 45_000, emergencyPerPlayer: 0, revealRoleOnEject: false } })
  assert.equal(configured.config.emergencyCooldownMs, 45_000)
  assert.equal(configured.config.emergencyPerPlayer, 0)
  assert.equal(configured.config.revealRoleOnEject, false)
})

const lobbyText = await readFile(`${directory}lobby-rules.tsx`, "utf8")
const lobbyModule = { exports: {} }
vm.runInNewContext(compile(`${lobbyText}\nmodule.exports = { LobbyRules, RULES, TOGGLES }`, "lobby-rules.tsx"), {
  module: lobbyModule, exports: lobbyModule.exports,
  React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
})
const { LobbyRules, RULES, TOGGLES } = lobbyModule.exports
function descendants(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((node) => descendants(node, predicate))
  if (!tree || typeof tree !== "object") return []
  return [...(predicate(tree) ? [tree] : []), ...descendants(tree.props?.children, predicate)]
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join("")
  if (tree == null || typeof tree === "boolean") return ""
  if (typeof tree !== "object") return String(tree)
  return textOf(tree.props?.children)
}
function lobbyFixture({ config = {}, playerCount = 12, isHost = true } = {}) {
  const sends = []
  const tree = LobbyRules({ snapshot: { config, players: Array.from({ length: playerCount }, (_, index) => ({ id: String(index) })) },
    isHost, onSend: (...args) => sends.push(plain(args)) })
  const inputs = descendants(tree, (node) => node.type === "input")
  return { tree, sends, inputs, rule: (key) => inputs.find((input) => input.props.id === `rule-${key}`)?.props }
}

check("Lobby apresenta só regras de partida, todos os padrões e rótulos acessíveis", () => {
  const fixture = lobbyFixture()
  assert.equal(fixture.inputs.length, 10)
  assert.equal(fixture.rule("visionRange"), undefined)
  assert.equal(fixture.rule("blackoutEverySeconds"), undefined)
  assert.equal(fixture.rule("quality"), undefined)
  assert.match(textOf(fixture.tree), /qualidade gráfica é uma preferência individual/)
  assert.equal(fixture.rule("blackoutSeconds").value, 25)
  assert.equal(fixture.rule("blackoutSeconds")["aria-valuetext"], "25 s")
  assert.equal(fixture.rule("emergencyCooldownMs").value, 30_000)
  assert.equal(fixture.rule("emergencyCooldownMs")["aria-valuetext"], "30 s")
  assert.equal(fixture.rule("emergencyPerPlayer").value, 1)
  for (const rule of RULES) {
    const input = fixture.rule(rule.key)
    assert.ok(input, rule.key)
    assert.equal(input.value, rule.defaultValue)
    const label = descendants(fixture.tree, (node) => node.type === "label" && node.props.htmlFor === input.id)
    const hint = descendants(fixture.tree, (node) => node.props.id === input["aria-describedby"])
    assert.equal(label.length, 1)
    assert.ok(textOf(label[0]).includes(rule.label))
    assert.equal(textOf(hint), rule.hint)
  }
})

check("Limite de assassinos acompanha 6, 9 e 12 participantes, incluindo callbacks desabilitados", () => {
  for (const [playerCount, maximum] of [[1, 1], [6, 1], [7, 2], [9, 2], [10, 3], [12, 3]]) {
    const fixture = lobbyFixture({ playerCount, config: { killers: 3 } })
    const killers = fixture.rule("killers")
    assert.equal(killers.max, maximum)
    assert.equal(killers.value, maximum)
    assert.equal(killers.min, 1)
    assert.equal(killers.disabled, maximum === 1)
    killers.onChange({ target: { value: String(maximum) } })
    assert.deepEqual(fixture.sends, maximum === 1 ? [] : [["config", { killers: maximum }]])
  }
})

check("Sliders exibem segundos e enviam unidades corretas somente pelo anfitrião", () => {
  const fixture = lobbyFixture()
  for (const rule of RULES) {
    const value = Math.min(rule.max, rule.defaultValue + rule.step)
    fixture.rule(rule.key).onChange({ target: { value: String(value) } })
    assert.deepEqual(fixture.sends.at(-1), ["config", { [rule.key]: value }])
    const next = lobbyFixture({ config: { [rule.key]: value } }).rule(rule.key)
    assert.equal(next.value, value)
    assert.equal(next["aria-valuetext"], `${rule.key.endsWith("Ms") ? value / 1000 : value}${rule.unit ? ` ${rule.unit}` : ""}`)
  }
  const guest = lobbyFixture({ isHost: false })
  for (const input of guest.inputs) {
    assert.equal(input.props.disabled, true)
    input.props.onChange({ target: { value: "2", checked: false } })
  }
  assert.deepEqual(guest.sends, [], "Callbacks também impedem alterações de convidado")
  assert.match(textOf(guest.tree), /Quem ajusta as regras é o anfitrião/)
})

check("Zero chamadas desabilita ajuste da recarga, mantendo explicação sobre corpos", () => {
  const fixture = lobbyFixture({ config: { emergencyPerPlayer: 0, emergencyCooldownMs: 45_000 } })
  assert.equal(fixture.rule("emergencyPerPlayer").value, 0)
  assert.equal(fixture.rule("emergencyPerPlayer").disabled, false)
  assert.equal(fixture.rule("emergencyCooldownMs").disabled, true)
  assert.equal(fixture.rule("emergencyCooldownMs")["aria-valuetext"], "45 s")
  fixture.rule("emergencyCooldownMs").onChange({ target: { value: "60000" } })
  assert.deepEqual(fixture.sends, [])
  assert.match(textOf(fixture.tree), /Zero desliga o botão, mas ainda permite reportar corpos/)
  assert.match(textOf(fixture.tree), /Reportar corpos não tem essa espera/)
  assert.equal(lobbyFixture({ config: { emergencyPerPlayer: 1 } }).rule("emergencyCooldownMs").disabled, false)
})

check("Regras usam limites e padrões finitos sem converter strings recebidas", () => {
  for (const rule of RULES) {
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, "50000", true]) {
      const input = lobbyFixture({ config: { [rule.key]: invalid } }).rule(rule.key)
      assert.equal(input.value, rule.defaultValue, `${rule.key}: ${String(invalid)}`)
    }
    assert.equal(lobbyFixture({ config: { [rule.key]: -100 } }).rule(rule.key).value, rule.min)
    assert.equal(lobbyFixture({ config: { [rule.key]: 1e9 } }).rule(rule.key).value, rule.max)
  }
})

check("Detetive e revelar expulsos preservam false e enviam booleanos", () => {
  assert.deepEqual(plain(TOGGLES.map((rule) => rule.key)), ["withDetective", "revealRoleOnEject"])
  for (const value of [undefined, false, true, "false"]) {
    const fixture = lobbyFixture({ config: { withDetective: value, revealRoleOnEject: value } })
    const toggles = fixture.inputs.filter((input) => input.props.type === "checkbox")
    for (const [index, input] of toggles.entries()) {
      assert.equal(input.props.checked, typeof value === "boolean" ? value : true)
      input.props.onChange({ target: { checked: false } })
      assert.deepEqual(fixture.sends.at(-1), ["config", { [TOGGLES[index].key]: false }])
      input.props.onChange({ target: { checked: true } })
      assert.deepEqual(fixture.sends.at(-1), ["config", { [TOGGLES[index].key]: true }])
    }
  }
})

console.log(`${checks} verificações de emergência calibrada, snapshot, sincronização e regras reais do lobby passaram.`)
