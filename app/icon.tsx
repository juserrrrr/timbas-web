import { ImageResponse } from "next/og"
import { readFileSync } from "fs"
import { join } from "path"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  const imgBuffer = readFileSync(join(process.cwd(), "public", "OIG.kjxVRTfiWRNi.jpg"))
  const base64 = imgBuffer.toString("base64")
  const dataUrl = `data:image/jpeg;base64,${base64}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} width={32} height={32} style={{ objectFit: "cover" }} alt="" />
      </div>
    ),
    { ...size },
  )
}
