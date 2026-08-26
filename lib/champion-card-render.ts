import { AWARD_FONT_FAMILY } from "@/lib/award-card-config"
import { AWARD_FONT_WEIGHT } from "@/lib/award-card-render"
import { createCenteredAwardQr } from "@/lib/award-qr"
import { DEFAULT_CHAMPION_CARD_LAYOUT, type ChampionCardLayout } from "@/lib/champion-card-config"

export interface ChampionCardData {
  tournamentName: string
  team: { id: string; name: string; logoUrl: string | null }
  players: Array<{ playerName: string; appearances: number }>
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, maxWidth: number, initialSize: number, minimumSize: number) {
  let size = initialSize
  do {
    ctx.font = `${weight} ${size}px "${family}", Impact, sans-serif`
    if (ctx.measureText(text).width <= maxWidth) return
    size -= 2
  } while (size > minimumSize)
}

function fitRosterText(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, maxWidth: number, initialSize: number) {
  let size = initialSize
  do {
    ctx.font = `${weight} ${size}px "${family}", Impact, sans-serif`
    if (ctx.measureText(text).width <= maxWidth) return
    size -= 1
  } while (size > 10)
}

export async function renderChampionCard(canvas: HTMLCanvasElement, data: ChampionCardData, qrUrl: string, inputLayout?: ChampionCardLayout) {
  const layout = inputLayout ?? DEFAULT_CHAMPION_CARD_LAYOUT
  const family = AWARD_FONT_FAMILY[layout.font]
  const weight = AWARD_FONT_WEIGHT[layout.font]
  await document.fonts.load(`${weight} 100px "${family}"`)
  const template = await loadImage("/images/awards/campeao-template-v3.png")
  canvas.width = template.naturalWidth * 2
  canvas.height = template.naturalHeight * 2
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  ctx.drawImage(template, 0, 0, width, height)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  ctx.fillStyle = "#f3cc72"
  ctx.font = `600 ${width * 0.026}px "Teko", sans-serif`
  ctx.fillText("CAMPEÃO", width / 2, height * 0.612)

  const teamName = (data.team.name.trim() || "Time campeão").toUpperCase()
  fitText(ctx, teamName, family, weight, width * layout.teamWidth, width * layout.teamSize, width * 0.018)
  ctx.fillStyle = "#ffffff"
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)"
  ctx.shadowBlur = 14
  ctx.fillText(teamName, width * layout.teamX, height * layout.teamY)
  ctx.shadowBlur = 0

  const tournamentName = data.tournamentName.toUpperCase()
  fitText(ctx, tournamentName, family, weight, width * layout.tournamentWidth, width * layout.tournamentSize, width * 0.012)
  ctx.fillStyle = "#c9a85d"
  ctx.fillText(tournamentName, width * layout.tournamentX, height * layout.tournamentY)

  const names = data.players.map((player) => player.playerName.trim()).filter(Boolean)
  const rosterTitleX = width * (layout.rosterX + layout.rosterWidth / 2)
  const rosterTitleY = height * (layout.rosterY - 0.022)
  const rosterTitleWidth = width * Math.min(0.18, layout.rosterWidth * 0.48)
  const rosterTitleHeight = height * 0.024
  ctx.fillStyle = "rgba(5, 5, 8, 0.95)"
  ctx.fillRect(rosterTitleX - rosterTitleWidth / 2, rosterTitleY - rosterTitleHeight / 2, rosterTitleWidth, rosterTitleHeight)
  ctx.strokeStyle = "rgba(201, 168, 93, 0.55)"
  ctx.lineWidth = Math.max(2, width * 0.001)
  ctx.strokeRect(rosterTitleX - rosterTitleWidth / 2, rosterTitleY - rosterTitleHeight / 2, rosterTitleWidth, rosterTitleHeight)
  ctx.fillStyle = "#d9bc78"
  ctx.font = `600 ${width * 0.017}px "Teko", sans-serif`
  ctx.fillText(names.length ? "ELENCO CAMPEÃO" : "TÍTULO CONQUISTADO", rosterTitleX, rosterTitleY)

  if (names.length) {
    const columns = layout.rosterColumns
    const rows = Math.ceil(names.length / columns)
    const left = width * layout.rosterX
    const usableWidth = width * layout.rosterWidth
    const startY = height * layout.rosterY
    const endY = height * (layout.rosterY + layout.rosterHeight)
    const rowHeight = (endY - startY) / rows
    const fontSize = Math.max(width * 0.007, Math.min(width * layout.rosterSize, rowHeight * 0.64))
    ctx.strokeStyle = "rgba(201, 168, 93, 0.35)"
    ctx.lineWidth = Math.max(1, width * 0.0007)
    for (let column = 1; column < columns; column += 1) {
      const dividerX = left + usableWidth * (column / columns)
      ctx.beginPath()
      ctx.moveTo(dividerX, startY)
      ctx.lineTo(dividerX, endY)
      ctx.stroke()
    }
    ctx.fillStyle = "#f4f1e8"
    names.forEach((name, index) => {
      const column = Math.floor(index / rows)
      const row = index % rows
      const x = left + usableWidth * ((column + 0.5) / columns)
      const y = startY + (row + 0.5) * rowHeight
      const playerName = name.toUpperCase()
      fitRosterText(ctx, playerName, family, weight, usableWidth / columns * 0.88, fontSize)
      ctx.fillText(playerName, x, y)
    })
  }

  if (qrUrl.trim()) {
    const qr = await loadImage(await createCenteredAwardQr(qrUrl.trim(), "#c9a85d", 768))
    const size = width * layout.qrSize
    ctx.drawImage(qr, width * layout.qrX, height * layout.qrY, size, size)
  }
}
