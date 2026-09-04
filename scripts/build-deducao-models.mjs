import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import * as THREE from "three"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js"

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

function physicalMaterial(name, color, roughness, metalness, extra = {}) {
  const value = new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra })
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
  carPaint: physicalMaterial("timbas-wine-paint", "#781f32", 0.28, 0.06, {
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
  }),
  carTrim: material("satin-black-trim", "#151a21", 0.3, 0.32),
  carGlass: material("smoked-car-glass", "#35556d", 0.08, 0.08, {
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  tire: material("performance-tire", "#111317", 0.86, 0.02),
  rim: material("machined-wheel", "#9ba7b5", 0.2, 0.82),
  brake: material("brake-caliper", "#d84a39", 0.34, 0.58),
  interior: material("charcoal-interior", "#252b34", 0.72, 0.03),
  headlight: material("led-headlight", "#d9f4ff", 0.12, 0.08, {
    emissive: "#9adfff",
    emissiveIntensity: 3.2,
  }),
  tailLight: material("led-tail-light", "#b6122d", 0.18, 0.12, {
    emissive: "#ff173d",
    emissiveIntensity: 2.6,
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

function loft(group, sections, finish, radialSegments = 16) {
  const positions = []
  const uvs = []
  const indices = []

  sections.forEach((section, sectionIndex) => {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2
      positions.push(
        Math.cos(angle) * section.halfWidth,
        section.centerY + Math.sin(angle) * section.halfHeight,
        section.z,
      )
      uvs.push(segment / radialSegments, sectionIndex / (sections.length - 1))
    }
  })

  for (let section = 0; section < sections.length - 1; section += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments
      const currentRing = section * radialSegments
      const nextRing = (section + 1) * radialSegments
      indices.push(
        currentRing + segment,
        currentRing + next,
        nextRing + next,
        currentRing + segment,
        nextRing + next,
        nextRing + segment,
      )
    }
  }

  const backCenter = positions.length / 3
  positions.push(0, sections[0].centerY, sections[0].z)
  uvs.push(0.5, 0)
  const frontCenter = positions.length / 3
  const last = sections.at(-1)
  positions.push(0, last.centerY, last.z)
  uvs.push(0.5, 1)
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments
    indices.push(backCenter, next, segment)
    const lastRing = (sections.length - 1) * radialSegments
    indices.push(frontCenter, lastRing + segment, lastRing + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, finish)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function sidePanel(group, points, x, finish) {
  const shape = new THREE.Shape()
  points.forEach(([z, y], index) => {
    const method = index === 0 ? "moveTo" : "lineTo"
    shape[method](-z, y)
  })
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateY(Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, finish)
  mesh.position.x = x
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

function coupeSuv() {
  const group = new THREE.Group()

  loft(
    group,
    [
      { z: -2.18, halfWidth: 0.68, centerY: 0.63, halfHeight: 0.24 },
      { z: -2.03, halfWidth: 0.88, centerY: 0.65, halfHeight: 0.32 },
      { z: -1.36, halfWidth: 0.97, centerY: 0.68, halfHeight: 0.38 },
      { z: 0.45, halfWidth: 0.99, centerY: 0.7, halfHeight: 0.4 },
      { z: 1.48, halfWidth: 0.94, centerY: 0.67, halfHeight: 0.35 },
      { z: 2.08, halfWidth: 0.8, centerY: 0.62, halfHeight: 0.28 },
      { z: 2.2, halfWidth: 0.56, centerY: 0.59, halfHeight: 0.2 },
    ],
    finishes.carPaint,
    18,
  )

  rounded(group, [1.82, 0.2, 3.82], [0, 0.35, -0.02], finishes.carTrim, 0.08)
  rounded(group, [1.83, 0.1, 3.7], [0, 0.25, -0.05], finishes.carTrim, 0.045)
  rounded(group, [1.7, 0.13, 1.12], [0, 0.91, 1.47], finishes.carPaint, 0.07, [0.08, 0, 0])
  rounded(group, [1.65, 0.09, 0.48], [0, 1.0, -1.72], finishes.carPaint, 0.055, [0.04, 0, 0])

  for (const z of [-1.35, 1.35]) {
    for (const side of [-1, 1]) {
      const x = side * 0.96
      cylinder(group, 0.38, 0.38, 0.2, [x, 0.43, z], finishes.tire, [0, 0, Math.PI / 2], 28)
      cylinder(group, 0.235, 0.235, 0.215, [x, 0.43, z], finishes.rim, [0, 0, Math.PI / 2], 20)
      cylinder(group, 0.105, 0.105, 0.225, [x, 0.43, z], finishes.brake, [0, 0, Math.PI / 2], 16)
      torus(group, 0.41, 0.034, [side * 0.975, 0.43, z], finishes.carPaint, [0, Math.PI / 2, 0])
      for (let spoke = 0; spoke < 5; spoke += 1) {
        rounded(
          group,
          [0.024, 0.045, 0.3],
          [side * 1.07, 0.43, z],
          finishes.rim,
          0.01,
          [(spoke / 5) * Math.PI * 2, 0, 0],
        )
      }
    }
  }

  for (const z of [-0.52, 0.56]) {
    for (const side of [-1, 1]) {
      rounded(group, [0.42, 0.48, 0.5], [side * 0.38, 0.95, z], finishes.interior, 0.08)
      rounded(group, [0.38, 0.42, 0.13], [side * 0.38, 1.23, z - 0.13], finishes.interior, 0.065, [-0.12, 0, 0])
    }
  }

  rounded(group, [1.46, 0.55, 0.055], [0, 1.25, 0.93], finishes.carGlass, 0.025, [-0.62, 0, 0])
  rounded(group, [1.34, 0.55, 0.055], [0, 1.2, -1.13], finishes.carGlass, 0.025, [0.72, 0, 0])
  for (const side of [-1, 1]) {
    sidePanel(
      group,
      [
        [0.08, 1.03],
        [1.02, 1.03],
        [0.68, 1.47],
        [0.08, 1.5],
      ],
      side * 0.79,
      finishes.carGlass,
    )
    sidePanel(
      group,
      [
        [-1.08, 1.03],
        [0.01, 1.03],
        [0.01, 1.5],
        [-0.7, 1.4],
      ],
      side * 0.79,
      finishes.carGlass,
    )
  }

  rounded(group, [1.48, 0.11, 1.55], [0, 1.53, -0.08], finishes.carPaint, 0.045, [-0.06, 0, 0])
  rounded(group, [0.72, 0.02, 0.96], [0, 1.59, -0.02], finishes.carGlass, 0.012, [-0.06, 0, 0])
  for (const side of [-1, 1]) {
    const x = side * 0.805
    rounded(group, [0.07, 0.61, 0.09], [x, 1.23, -0.9], finishes.carTrim, 0.022, [0.66, 0, 0])
    rounded(group, [0.07, 0.62, 0.09], [x, 1.24, 0.82], finishes.carTrim, 0.022, [-0.56, 0, 0])
    rounded(group, [0.065, 0.62, 0.09], [x, 1.23, 0.04], finishes.carTrim, 0.02)
    rounded(group, [0.035, 0.03, 1.34], [side * 0.58, 1.61, -0.08], finishes.carTrim, 0.012, [-0.06, 0, 0])
    rounded(group, [0.04, 0.5, 0.96], [side * 0.982, 0.81, 0.49], finishes.carPaint, 0.022)
    rounded(group, [0.04, 0.5, 1.0], [side * 0.982, 0.81, -0.58], finishes.carPaint, 0.022)
    rounded(group, [0.025, 0.025, 0.82], [side * 1.005, 0.58, 0.46], finishes.carTrim, 0.009)
    rounded(group, [0.025, 0.025, 0.86], [side * 1.005, 0.58, -0.59], finishes.carTrim, 0.009)
    rounded(group, [0.035, 0.075, 2.18], [side * 0.988, 1.02, -0.03], finishes.carPaint, 0.015)
    rounded(group, [0.2, 0.12, 0.34], [side * 1.04, 1.14, 0.72], finishes.carPaint, 0.055, [0, 0, side * 0.08])
    rounded(group, [0.025, 0.035, 0.28], [side * 0.992, 0.92, -0.5], finishes.rim, 0.012)
    rounded(group, [0.025, 0.035, 0.28], [side * 0.992, 0.92, 0.54], finishes.rim, 0.012)
  }

  rounded(group, [1.38, 0.22, 0.055], [0, 0.64, 2.195], finishes.carTrim, 0.035)
  rounded(group, [0.48, 0.13, 0.065], [-0.56, 0.82, 2.2], finishes.headlight, 0.035, [0, 0, 0.07])
  rounded(group, [0.48, 0.13, 0.065], [0.56, 0.82, 2.2], finishes.headlight, 0.035, [0, 0, -0.07])
  rounded(group, [0.56, 0.09, 0.05], [0, 0.5, 2.225], finishes.rim, 0.025)
  for (let slat = -3; slat <= 3; slat += 1) {
    rounded(group, [0.025, 0.18, 0.035], [slat * 0.105, 0.65, 2.23], finishes.rim, 0.009)
  }

  rounded(group, [1.46, 0.075, 0.06], [0, 0.91, -2.17], finishes.tailLight, 0.025)
  rounded(group, [1.28, 0.2, 0.055], [0, 0.57, -2.19], finishes.carTrim, 0.035)
  rounded(group, [0.45, 0.08, 0.045], [0, 0.45, -2.225], finishes.rim, 0.018)
  rounded(group, [1.43, 0.06, 0.24], [0, 1.07, -1.9], finishes.carPaint, 0.028, [-0.04, 0, 0])
  rounded(group, [1.48, 0.04, 0.14], [0, 1.12, -1.96], finishes.carTrim, 0.02)

  return group
}

async function exportModel(name, build, keepIndices = false) {
  const scene = new THREE.Scene()
  const source = build()
  source.updateMatrixWorld(true)
  const buckets = new Map()

  source.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return
    let geometry = child.geometry.clone()
    if (keepIndices && !geometry.index) {
      const indexed = mergeVertices(geometry)
      geometry.dispose()
      geometry = indexed
    }
    if (!keepIndices && geometry.index) {
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
  exportModel("timbas-coupe-suv", coupeSuv, true),
])

console.log("Dedução GLB kit generated")
