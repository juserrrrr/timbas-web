const MAX_DIMENSION = 1600
const TARGET_BYTES = 900_000
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5]

export interface PreparedImage {
  base64: string
  mimeType: string
  previewUrl: string
  bytes: number
}

export async function prepareScoreboardImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.")
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Não foi possível processar a imagem neste navegador.")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let blob: Blob | null = null
  for (const quality of QUALITY_STEPS) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
    if (blob && blob.size <= TARGET_BYTES) break
  }
  if (!blob) throw new Error("Não foi possível comprimir a imagem.")

  const buffer = await blob.arrayBuffer()
  return {
    base64: bufferToBase64(buffer),
    mimeType: "image/jpeg",
    previewUrl: URL.createObjectURL(blob),
    bytes: blob.size,
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return btoa(binary)
}
