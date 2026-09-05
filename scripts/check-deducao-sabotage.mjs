import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const directory = "app/(game)/games/deducao/[roomId]/"
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
let now = 0
const module = { exports: {} }
vm.runInNewContext(compile(await readFile(`${directory}sabotage-cooldown.ts`, "utf8")), {
  module, exports: module.exports, performance: { now: () => now },
})
const { calibrateSabotageStatus, sabotageRemainingMs, canSabotage } = module.exports
const hookText = await readFile(`${directory}use-deducao-room.ts`, "utf8")
const lobbyText = await readFile(`${directory}lobby.tsx`, "utf8")
const hook = ts.createSourceFile("use-deducao-room.ts", hookText, ts.ScriptTarget.Latest, true)
const printer = ts.createPrinter()
const snapshot = { phase: "jogando", blackout: false, players: [{ id: "me", alive: true, inVent: false }] }
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }

function messageHandler(name, bindings) {
  let handler
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "onMessage" && node.arguments[0]?.text === name) handler = node.arguments[1]
    ts.forEachChild(node, visit)
  }
  visit(hook)
  assert.ok(handler, `Handler real ${name} precisa existir`)
  const loaded = { exports: {} }
  vm.runInNewContext(compile(`module.exports = ${printer.printNode(ts.EmitHint.Unspecified, handler, hook)}`), {
    module: loaded, exports: loaded.exports, calibrateSabotageStatus, ...bindings,
  })
  return loaded.exports
}

check("Recarga de 40 segundos independe do relógio local e é liberada somente no prazo calibrado", () => {
  for (const serverNow of [0, 1_800_000_000_000, 2_800_000_000_000]) {
    for (const receivedAt of [0, 123_456, 2_000_000_000]) {
      now = receivedAt
      const status = calibrateSabotageStatus({ readyAt: serverNow + 40_000, serverNow, cooldownMs: 40_000 })
      for (const elapsed of [0, 1, 1000, 39_999, 40_000, 60_000]) {
        now = receivedAt + elapsed
        assert.equal(sabotageRemainingMs(status), Math.max(0, 40_000 - elapsed))
        assert.equal(canSabotage(snapshot, "me", "assassino", status), elapsed >= 40_000)
      }
    }
  }
})

check("Estado pronto, ressincronização e retomada após aba suspensa respeitam o servidor", () => {
  now = 1000
  const ready = calibrateSabotageStatus({ readyAt: 0, serverNow: 900_000, cooldownMs: 40_000 })
  assert.equal(sabotageRemainingMs(ready), 0)
  let status = calibrateSabotageStatus({ readyAt: 940_000, serverNow: 900_000, cooldownMs: 40_000 })
  now += 65_000
  assert.equal(sabotageRemainingMs(status), 0, "Tempo oculto não prolonga a recarga")
  status = calibrateSabotageStatus({ readyAt: 980_000, serverNow: 955_000, cooldownMs: 40_000 })
  assert.equal(sabotageRemainingMs(status), 25_000, "Nova resposta substitui a previsão anterior")
  assert.equal(sabotageRemainingMs(null), Infinity)
  assert.equal(canSabotage(snapshot, "me", "assassino", null), false)
})

check("Papel, vida, conexão, fase e apagão bloqueiam sem criar nova restrição no duto", () => {
  const ready = calibrateSabotageStatus({ readyAt: 0, serverNow: 10_000, cooldownMs: 40_000 })
  for (const role of [null, "detetive", "funcionario"]) assert.equal(canSabotage(snapshot, "me", role, ready), false)
  for (const phase of ["lobby", "reuniao", "votacao", "fim"]) {
    assert.equal(canSabotage({ ...snapshot, phase }, "me", "assassino", ready), false)
  }
  assert.equal(canSabotage({ ...snapshot, blackout: true }, "me", "assassino", ready), false)
  for (const player of [{ id: "me", alive: false }, { id: "me", alive: true, connected: false }]) {
    assert.equal(canSabotage({ ...snapshot, players: [player] }, "me", "assassino", ready), false)
  }
  assert.equal(canSabotage(snapshot, "missing", "assassino", ready), false)
  assert.equal(canSabotage({ ...snapshot, players: [{ id: "me", alive: true, inVent: true }] }, "me", "assassino", ready), true)
})

check("Payload privado valida números finitos e não propaga campos estranhos", () => {
  const payload = { readyAt: 40_000, serverNow: 0, cooldownMs: 40_000 }
  for (const invalid of [null, false, "status", {}, ...["readyAt", "serverNow", "cooldownMs"].flatMap((key) =>
    [undefined, NaN, Infinity, "40000", -1].map((value) => ({ ...payload, [key]: value })))]) {
    assert.equal(calibrateSabotageStatus(invalid), null)
  }
  assert.equal(calibrateSabotageStatus({ ...payload, cooldownMs: 0 }), null)
  const valid = calibrateSabotageStatus(Object.freeze({ ...payload, otherPlayerSecret: "não copiar" }))
  assert.deepEqual(Object.keys(valid).sort(), ["cooldownMs", "readyAt", "receivedAt", "serverNow"])
})

check("Handler privado real recebe status, ignora payload inválido e novo papel limpa a recarga anterior", () => {
  let status = null
  const handle = messageHandler("sabotage:status", { setSabotageStatus(next) { status = next } })
  now = 5000
  handle({ readyAt: 140_000, serverNow: 100_000, cooldownMs: 40_000 })
  assert.equal(status.receivedAt, now)
  assert.equal(sabotageRemainingMs(status), 40_000)
  const valid = status
  handle({ readyAt: "inválido", serverNow: 100_000, cooldownMs: 40_000 })
  assert.equal(status, valid)
  let role
  const assignRole = messageHandler("papel", {
    setSabotageStatus(next) { status = next }, setRole(next) { role = next },
    setFinalRoles() {}, setAllies() {}, setMyTasks() {},
  })
  assignRole({ role: "funcionario", tasks: [], allies: [] })
  assert.equal(status, null)
  assert.equal(role, "funcionario")
  assert.ok(hookText.indexOf('room.onMessage("sabotage:status"') < hookText.indexOf('room.send("sabotage:status")'),
    "Conexão e reconexão só pedem status depois de instalar o handler")
})

check("Snapshot público e configuração do lobby não incluem estado privado nem apagão automático", () => {
  const snapshotDefinition = hook.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "snapshotOf")
  assert.ok(snapshotDefinition)
  assert.doesNotMatch(snapshotDefinition.getText(hook), /sabotage|readyAt|blackoutEverySeconds/)
  assert.doesNotMatch(lobbyText, /blackoutEverySeconds|Apagão a cada/)
  assert.match(lobbyText, /key: "blackoutSeconds"[\s\S]*?min: 10,[\s\S]*?max: 60,[\s\S]*?step: 5,/)
  assert.match(lobbyText, /rule.key === "blackoutSeconds" \? 25 : 0/)
})

console.log(`${checks} verificações de sabotagem privada, recarga calibrada e regras de elegibilidade passaram.`)
