import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function StreamPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params
  redirect(`/streams/${streamId}/watch`)
}
