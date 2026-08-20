import { PublicStreamRoom } from "./public-stream-room"

export default async function PublicStreamPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params
  return <PublicStreamRoom streamId={streamId} />
}
