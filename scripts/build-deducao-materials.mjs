import path from "node:path"
import sharp from "sharp"

const directory = path.resolve("public/images/games/deducao/textures")

const materials = [
  { name: "carpet", source: "carpet.png", normal: 2.2, roughness: 224 },
  { name: "concrete", source: "concrete.png", normal: 1.7, roughness: 204 },
  { name: "corridor-vinyl-v2", source: "corridor-vinyl-v2.webp", normal: 1.65, roughness: 196 },
  { name: "executive-parquet-v2", source: "executive-parquet-v2.webp", normal: 1.5, roughness: 168 },
  { name: "lounge-carpet-v2", source: "lounge-carpet-v2.webp", normal: 2.25, roughness: 226 },
  { name: "pantry-tile", source: "pantry-tile.png", normal: 2.5, roughness: 172 },
  { name: "server-floor", source: "server-floor.png", normal: 2.0, roughness: 148 },
  { name: "terrazzo", source: "terrazzo.png", normal: 1.45, roughness: 194 },
  { name: "wood", source: "wood.png", normal: 1.65, roughness: 174 },
  { name: "wall-plaster", source: "wall-plaster.webp", normal: 1.15, roughness: 218 },
  { name: "upholstery-v2", source: "upholstery-v2.webp", normal: 2.7, roughness: 232 },
  { name: "ceiling-acoustic", source: "ceiling-acoustic.webp", normal: 1.8, roughness: 224 },
  { name: "grass-v1", source: "grass-v1.webp", normal: 2.3, roughness: 230 },
  { name: "pool-water-v1", source: "pool-water-v1.webp", normal: 0.8, roughness: 80 },
  { name: "sport-court-v1", source: "sport-court-v1.webp", normal: 1.2, roughness: 180 },
  { name: "asphalt-road-v1", source: "asphalt-road-v1.webp", normal: 2.15, roughness: 218 },
]

async function sourcePixels(source) {
  return sharp(path.join(directory, source))
    .resize(512, 512, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

function pixel(buffer, width, height, x, y) {
  const wrappedX = (x + width) % width
  const wrappedY = (y + height) % height
  return buffer[wrappedY * width + wrappedX] / 255
}

async function buildMaterial({ name, source, normal, roughness }) {
  const { data, info } = await sourcePixels(source)
  const normalPixels = Buffer.alloc(info.width * info.height * 3)
  const roughnessPixels = Buffer.alloc(info.width * info.height)

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const dx = (pixel(data, info.width, info.height, x + 1, y) - pixel(data, info.width, info.height, x - 1, y)) * normal
      const dy = (pixel(data, info.width, info.height, x, y + 1) - pixel(data, info.width, info.height, x, y - 1)) * normal
      const inverseLength = 1 / Math.hypot(dx, dy, 1)
      const offset = (y * info.width + x) * 3
      normalPixels[offset] = Math.round((-dx * inverseLength * 0.5 + 0.5) * 255)
      normalPixels[offset + 1] = Math.round((dy * inverseLength * 0.5 + 0.5) * 255)
      normalPixels[offset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255)

      const grain = data[y * info.width + x] - 128
      roughnessPixels[y * info.width + x] = Math.max(24, Math.min(248, Math.round(roughness + grain * 0.12)))
    }
  }

  await Promise.all([
    sharp(normalPixels, { raw: { width: info.width, height: info.height, channels: 3 } })
      .webp({ quality: 88 })
      .toFile(path.join(directory, `${name}-normal.webp`)),
    sharp(roughnessPixels, { raw: { width: info.width, height: info.height, channels: 1 } })
      .webp({ quality: 84 })
      .toFile(path.join(directory, `${name}-roughness.webp`)),
  ])
}

await Promise.all(materials.map(buildMaterial))
console.log("Dedução PBR maps generated")
