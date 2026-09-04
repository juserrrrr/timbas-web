import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"

const candidates = [
  process.env.BLENDER_BIN,
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe",
  "/Applications/Blender.app/Contents/MacOS/Blender",
  "blender",
].filter(Boolean)

const executable = candidates.find((candidate) => candidate === "blender" || existsSync(candidate))
if (!executable) {
  throw new Error("Blender não encontrado. Instale o Blender ou defina BLENDER_BIN com o caminho do executável.")
}

for (const script of [
  "build-coupe-suv-blender.py",
  "build-office-kit-blender.py",
  "build-crew-character-blender.py",
  "build-office-building-blender.py",
]) {
  const source = path.join("scripts", script)
  const result = spawnSync(executable, ["--background", "--factory-startup", "--python", source], {
    cwd: process.cwd(),
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
