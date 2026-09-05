import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const path = "app/(game)/games/deducao/[roomId]/scene/render-budget.tsx"
const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const selected = source.statements.filter((node) => !ts.isImportDeclaration(node) && !(ts.isFunctionDeclaration(node) && node.name.text === "AdaptiveResolution"))
const printer = ts.createPrinter()
const code = ts.transpileModule(selected.map((node) => printer.printNode(ts.EmitHint.Unspecified, node, source)).join("\n"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const module = { exports: {} }
vm.runInNewContext(code, { module, exports: module.exports })
for (const [quality, min, max] of [["baixo", 0.6, 1], ["medio", 0.65, 1.15], ["alto", 0.7, 1.25]]) {
  const budget = module.exports.createRenderBudget(quality, 3)
  assert.equal(budget.ratio, max)
  for (let i = 0; i < 500; i++) budget.sample(1 / 60)
  assert.equal(budget.ratio, max, "Não reduz qualidade se já sustenta 60fps")
  for (let i = 0; i < 100; i++) budget.sample(1)
  assert.equal(budget.ratio, max, "Aba oculta não altera a resolução")
  for (let i = 0; i < 33; i++) budget.sample(1 / 30)
  assert.ok(budget.ratio <= max * 0.8 + 0.005, "Sobrecarga reage em uma janela de 1s e elimina pelo menos 35% dos pixels")
  for (let i = 0; i < 600; i++) budget.sample(1 / 30)
  assert.equal(budget.ratio, min, "Carga sustentada reduz pixels até o piso de cada qualidade")
  for (let i = 0; i < 7500; i++) budget.sample(1 / 60)
  assert.equal(budget.ratio, max, "Recupera definição gradualmente com folga")
  for (let i = 0; i < 300; i++) budget.sample(i % 4 ? 1 / 60 : 1 / 55)
  assert.equal(budget.ratio, max, "Histerese evita oscilar com jitter pequeno")
  for (let i = 0; i < 1600; i++) budget.sample(1 / 50)
  assert.equal(budget.ratio, min, "50fps sustentados também pedem redução para mirar 60")
  for (let i = 0; i < 7500; i++) budget.sample([2, 2, 3, 2, 3][i % 5] / 144)
  assert.equal(budget.ratio, max, "Cadência média de 60fps em monitor 144Hz também recupera resolução")
}
console.log("Resolução adaptativa: 3 qualidades, 60fps, sobrecarga, pausa, recuperação e histerese passaram.")
const scene = await readFile("app/(game)/games/deducao/[roomId]/scene/office-scene.tsx", "utf8")
assert.ok(!scene.includes('frameloop="never"') && !scene.includes("CappedFrameLoop"), "O Canvas acompanha o RAF nativo sem descartar quadros em telas de alta frequência")
