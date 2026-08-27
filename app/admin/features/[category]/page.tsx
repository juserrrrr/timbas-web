"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowUpRight, Power, PowerOff, Radio } from "lucide-react"
import { ErrorState, PageLoading } from "@/components/competitions/shared"
import { ADMIN_ACCENTS, AdminEmpty, AdminHeader, InlineNotice, SectionCard } from "@/components/admin/shell"
import { findFeatureCategory, flagsOfCategory } from "@/lib/admin/feature-catalog"
import { EaAutomationCard } from "../ea-automation-card"
import { FlagMeter, FlagRow } from "../flag-row"
import { useFeatureFlags } from "../use-feature-flags"

export default function FeatureCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = use(params)
  const category = findFeatureCategory(slug)
  const { flags, loading, saving, error, reload, toggle } = useFeatureFlags()

  if (!category) notFound()
  if (loading) return <PageLoading />
  if (error && flags.length === 0) return <ErrorState message={error} retry={() => void reload()} />

  const categoryFlags = flagsOfCategory(flags, category)
  const on = categoryFlags.filter((flag) => flag.enabled).length
  const tone = ADMIN_ACCENTS[category.accent]
  const eaAutoSync = categoryFlags.find((flag) => flag.key === "tournament_ea_auto_sync")

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow={category.eyebrow}
        title={category.title}
        subtitle={category.description}
        icon={category.icon}
        accent={category.accent}
        backHref="/admin/features"
        backLabel="Todos os recursos"
        actions={
          <div className="min-w-[160px] rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">No ar</span>
              <span className={`text-sm font-black tabular-nums ${tone.text}`}>
                {on}
                <span className="text-gray-600">/{categoryFlags.length}</span>
              </span>
            </p>
            <span className="mt-2 block">
              <FlagMeter on={on} total={categoryFlags.length} accent={category.accent} />
            </span>
          </div>
        }
      />

      {categoryFlags.length === 0 ? (
        <AdminEmpty
          icon={category.icon}
          title="Nada por aqui"
          description="A API não devolveu nenhum recurso deste assunto. Assim que uma chave nova aparecer, ela entra nesta lista."
        />
      ) : (
        <SectionCard
          icon={on === categoryFlags.length ? Power : PowerOff}
          accent={category.accent}
          title="Interruptores"
          description="A mudança vale na hora, para todo mundo. Nada aqui apaga dado: recurso desligado só some do menu."
          flush
        >
          <div className="divide-y divide-white/[0.05]">
            {categoryFlags.map((flag) => (
              <FlagRow
                key={flag.key}
                flag={flag}
                accent={category.accent}
                busy={saving === flag.key}
                onToggle={(enabled) => void toggle(flag, enabled)}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {category.slug === "competicoes" && (
        <>
          {eaAutoSync && !eaAutoSync.enabled && (
            <InlineNotice tone="warn">
              A busca automática está desligada. O ritmo abaixo fica guardado e volta a valer assim que ela for ligada.
            </InlineNotice>
          )}
          <EaAutomationCard />
        </>
      )}

      {category.slug === "transmissoes" && (
        <SectionCard
          icon={Radio}
          accent="rose"
          title="Servidor e anúncio das lives"
          description="Estes interruptores dizem o que existe. As credenciais do servidor e o canal do Discord ficam na área de transmissões."
          action={
            <Link
              href="/admin/live"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-400/25 px-3 text-[12px] font-bold text-rose-300 transition-colors hover:bg-rose-500/10"
            >
              Abrir transmissões
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      )}
    </div>
  )
}
