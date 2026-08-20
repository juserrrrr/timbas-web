import { StreamRoom } from "../stream-room"

export default async function StreamWatchPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params
  return <StreamRoom streamId={streamId} expectedRole="viewer" />
}
