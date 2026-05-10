import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchSharedAnalysis } from "@/lib/services/clash"
import SharedScoutView from "./shared-scout-view"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const result = await fetchSharedAnalysis(id)
    return {
      title: `Scout — ${result.teamName} | Timbas`,
      description: `Análise de Clash do time ${result.teamName}`,
    }
  } catch {
    return { title: "Scout compartilhado | Timbas" }
  }
}

export default async function SharedScoutPage({ params }: Props) {
  const { id } = await params
  try {
    const result = await fetchSharedAnalysis(id)
    return <SharedScoutView result={result} />
  } catch {
    notFound()
  }
}
