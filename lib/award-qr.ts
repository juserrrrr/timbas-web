import QRCode from "qrcode"

export function compactTournamentUrl(value: string) {
  return value.trim()
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

export async function createCenteredAwardQr(value: string, color: string, width = 384) {
  const source = await QRCode.toDataURL(compactTournamentUrl(value), {
    errorCorrectionLevel: "L",
    margin: 2,
    width,
    color: { dark: color, light: "#00000000" },
  })
  const image = await loadImage(source)
  const sourceCanvas = document.createElement("canvas")
  sourceCanvas.width = width
  sourceCanvas.height = width
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true })
  if (!sourceContext) return source
  sourceContext.drawImage(image, 0, 0, width, width)
  const pixels = sourceContext.getImageData(0, 0, width, width).data
  let minX = width
  let minY = width
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < 0 || maxY < 0) return source
  const offsetX = Math.round(width / 2 - (minX + maxX + 1) / 2)
  const offsetY = Math.round(width / 2 - (minY + maxY + 1) / 2)
  sourceContext.clearRect(0, 0, width, width)
  sourceContext.drawImage(image, offsetX, offsetY, width, width)
  return sourceCanvas.toDataURL("image/png")
}
