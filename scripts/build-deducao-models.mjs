import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import * as THREE from "three"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

globalThis.FileReader = class FileReader {
  result = null
  onloadend = null

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result
      this.onloadend?.()
    })
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`
      this.onloadend?.()
    })
  }
}

const outputDirectory = path.resolve("public/models/games/deducao")

function material(name, color, roughness = 0.65, metalness = 0.02, extra = {}) {
  const value = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })
  value.name = name
  return value
}

const finishes = {
  wood: material("warm-oak", "#c79358", 0.52),
  woodEdge: material("oak-edge", "#93663d", 0.62),
  darkMetal: material("powder-coated-metal", "#445166", 0.35, 0.62),
  lightMetal: material("brushed-aluminum", "#aab6c6", 0.28, 0.72),
  plastic: material("soft-touch-plastic", "#34465e", 0.48, 0.05),
  fabric: material("fabric", "#54a9b2", 0.92),
  glass: material("smoked-glass", "#9bc9de", 0.12, 0.08, { transparent: true, opacity: 0.72 }),
  cable: material("rubber", "#222a36", 0.8),
  screen: material("screen", "#6ac7ff", 0.2, 0.05, {
    emissive: "#287db8",
    emissiveIntensity: 1.25,
  }),
}

function rounded(group, size, position, finish, radius = 0.04, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), finish)
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function cylinder(group, radiusTop, radiusBottom, height, position, finish, rotation = [0, 0, 0], segments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), finish)
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function torus(group, radius, tube, position, finish, rotation = [Math.PI / 2, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 28), finish)
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.castShadow = true
  group.add(mesh)
  return mesh
}

function desk() {
  const group = new THREE.Group()
  rounded(group, [1.82, 0.09, 0.9], [0, 0.78, 0], finishes.wood, 0.055)
  rounded(group, [1.72, 0.055, 0.82], [0, 0.715, 0], finishes.woodEdge, 0.028)
  for (const x of [-0.76, 0.76]) {
    rounded(group, [0.075, 0.71, 0.72], [x, 0.37, 0], finishes.darkMetal, 0.025)
    rounded(group, [0.22, 0.045, 0.82], [x, 0.04, 0], finishes.darkMetal, 0.018)
  }
  rounded(group, [0.68, 0.58, 0.58], [-0.45, 0.36, 0.04], finishes.lightMetal, 0.05)
  for (let drawer = 0; drawer < 3; drawer += 1) {
    rounded(group, [0.58, 0.135, 0.025], [-0.45, 0.2 + drawer * 0.17, 0.345], finishes.lightMetal, 0.012)
    cylinder(group, 0.012, 0.012, 0.12, [-0.45, 0.2 + drawer * 0.17, 0.37], finishes.darkMetal, [Math.PI / 2, 0, 0], 10)
  }
  rounded(group, [0.78, 0.025, 0.35], [0.26, 0.84, 0.12], finishes.plastic, 0.018, [-0.03, 0, 0])
  for (let key = 0; key < 9; key += 1) {
    rounded(group, [0.052, 0.012, 0.045], [-0.01 + key * 0.067, 0.858, 0.13], finishes.lightMetal, 0.006)
  }
  cylinder(group, 0.065, 0.065, 0.025, [0.64, 0.85, -0.19], finishes.plastic, [0, 0, 0], 18)
  return group
}

function chair() {
  const group = new THREE.Group()
  rounded(group, [0.58, 0.13, 0.55], [0, 0.5, 0.02], finishes.fabric, 0.095)
  rounded(group, [0.53, 0.64, 0.12], [0, 0.87, -0.23], finishes.fabric, 0.1, [-0.1, 0, 0])
  rounded(group, [0.38, 0.15, 0.08], [0, 1.15, -0.2], finishes.fabric, 0.065, [-0.1, 0, 0])
  cylinder(group, 0.065, 0.065, 0.34, [0, 0.27, 0], finishes.lightMetal, [0, 0, 0], 16)
  torus(group, 0.18, 0.025, [0, 0.13, 0], finishes.darkMetal)
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2
    const x = Math.cos(angle) * 0.27
    const z = Math.sin(angle) * 0.27
    rounded(group, [0.43, 0.045, 0.065], [x * 0.55, 0.1, z * 0.55], finishes.darkMetal, 0.018, [0, -angle, 0])
    torus(group, 0.055, 0.022, [Math.cos(angle) * 0.4, 0.065, Math.sin(angle) * 0.4], finishes.cable, [0, Math.PI / 2 - angle, 0])
  }
  for (const x of [-0.32, 0.32]) {
    rounded(group, [0.045, 0.34, 0.045], [x, 0.68, 0], finishes.lightMetal, 0.014)
    rounded(group, [0.23, 0.055, 0.07], [x, 0.84, 0.035], finishes.plastic, 0.025)
  }
  return group
}

function computer() {
  const group = new THREE.Group()
  rounded(group, [0.7, 0.46, 0.065], [0, 1.08, 0], finishes.plastic, 0.045)
  rounded(group, [0.61, 0.355, 0.014], [0, 1.08, 0.041], finishes.screen, 0.018)
  rounded(group, [0.16, 0.19, 0.055], [0, 0.81, 0], finishes.lightMetal, 0.022)
  rounded(group, [0.42, 0.035, 0.25], [0, 0.72, 0.08], finishes.lightMetal, 0.025)
  rounded(group, [0.1, 0.022, 0.014], [0, 0.875, 0.043], finishes.darkMetal, 0.006)
  cylinder(group, 0.018, 0.018, 0.012, [0, 1.285, 0.043], finishes.screen, [Math.PI / 2, 0, 0], 12)
  return group
}

function meetingTable() {
  const group = new THREE.Group()
  rounded(group, [6.65, 0.16, 2.5], [0, 0.78, 0], finishes.wood, 0.12)
  rounded(group, [6.42, 0.065, 2.26], [0, 0.68, 0], finishes.woodEdge, 0.07)
  for (const x of [-2.4, 2.4]) {
    rounded(group, [0.25, 0.69, 1.82], [x, 0.37, 0], finishes.darkMetal, 0.045)
  }
  rounded(group, [4.8, 0.12, 0.14], [0, 0.29, 0], finishes.darkMetal, 0.03)
  for (const x of [-1.7, 0, 1.7]) {
    cylinder(group, 0.11, 0.11, 0.035, [x, 0.88, 0], finishes.cable, [0, 0, 0], 24)
    torus(group, 0.15, 0.018, [x, 0.9, 0], finishes.lightMetal)
    rounded(group, [0.52, 0.035, 0.16], [x, 0.885, -0.42], finishes.plastic, 0.022)
  }
  return group
}

async function exportModel(name, build) {
  const scene = new THREE.Scene()
  const source = build()
  source.updateMatrixWorld(true)
  const buckets = new Map()

  source.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return
    let geometry = child.geometry.clone()
    if (geometry.index) {
      const flat = geometry.toNonIndexed()
      geometry.dispose()
      geometry = flat
    }
    geometry.applyMatrix4(child.matrixWorld)
    const bucket = buckets.get(child.material.uuid) ?? { material: child.material, geometries: [] }
    bucket.geometries.push(geometry)
    buckets.set(child.material.uuid, bucket)
  })

  const model = new THREE.Group()
  for (const { material: finish, geometries } of buckets.values()) {
    const geometry = mergeGeometries(geometries, false)
    geometries.forEach((item) => item.dispose())
    if (!geometry) throw new Error(`Não foi possível unir as geometrias de ${name}.`)
    const mesh = new THREE.Mesh(geometry, finish)
    mesh.name = finish.name
    mesh.castShadow = true
    mesh.receiveShadow = true
    model.add(mesh)
  }
  model.name = name
  scene.add(model)
  scene.updateMatrixWorld(true)

  const data = await new GLTFExporter().parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    truncateDrawRange: true,
  })
  await writeFile(path.join(outputDirectory, `${name}.glb`), Buffer.from(data))
}

await mkdir(outputDirectory, { recursive: true })
await Promise.all([
  exportModel("desk", desk),
  exportModel("office-chair", chair),
  exportModel("computer", computer),
  exportModel("meeting-table", meetingTable),
])

console.log("Dedução GLB kit generated")
