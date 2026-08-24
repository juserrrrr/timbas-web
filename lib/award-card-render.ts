import type { AwardCardConfig, AwardFontKey } from "@/lib/award-card-config"
import { AWARD_FONT_FAMILY } from "@/lib/award-card-config"
import { createCenteredAwardQr } from "@/lib/award-qr"

export const AWARD_FONT_WEIGHT: Record<AwardFontKey, number> = {
  anton: 400,
  tourney: 600,
  cinzel: 700,
  "black-ops": 400,
  graduate: 400,
  teko: 600,
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, maxWidth: number, initialSize: number, enabled: boolean) {
  if (!enabled) {
    ctx.font = `${weight} ${initialSize}px "${family}", Impact, sans-serif`
    return initialSize
  }
  let size = initialSize
  do {
    ctx.font = `${weight} ${size}px "${family}", Impact, sans-serif`
    if (ctx.measureText(text).width <= maxWidth) return size
    size -= 2
  } while (size > 28)
  return size
}

export async function renderAwardCard(
  canvas: HTMLCanvasElement,
  award: AwardCardConfig,
  nickname: string,
  achievement: string,
  qrUrl: string,
) {
  const family = AWARD_FONT_FAMILY[award.font]
  const weight = AWARD_FONT_WEIGHT[award.font]
  await document.fonts.load(`${weight} 100px "${family}"`)
  const background = await loadImage(award.image)
  canvas.width = background.naturalWidth
  canvas.height = background.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.drawImage(background, 0, 0)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const nick = (nickname.trim() || "Jogador").toUpperCase().slice(0, 28)
  const value = (achievement.trim() || "0").toUpperCase().slice(0, 34)
  const nickSize = fitText(ctx, nick, family, weight, canvas.width * award.textWidth, canvas.width * award.nickSize, award.nickAutoFit)
  ctx.fillStyle = "#f4f6f8"
  ctx.fillText(nick, canvas.width * award.nickX, canvas.height * award.nickY)
  const statSize = fitText(ctx, value, family, weight, canvas.width * award.textWidth, canvas.width * award.statSize, award.statAutoFit)
  ctx.fillStyle = award.highlight
  ctx.fillText(value, canvas.width * award.statX, canvas.height * award.statY)

  if (qrUrl.trim()) {
    const qr = await loadImage(await createCenteredAwardQr(qrUrl.trim(), award.color))
    const size = canvas.width * award.qrSize
    ctx.drawImage(qr, canvas.width * award.qrX, canvas.height * award.qrY, size, size)
  }
}
