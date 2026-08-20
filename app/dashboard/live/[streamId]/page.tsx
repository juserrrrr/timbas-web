import { StreamRoom } from "./stream-room"

export const dynamic = "force-dynamic"

export default async function StreamPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params
  return <StreamRoom streamId={streamId} />
}
