"use client"

import Link from "next/link"
import { ArrowUpRight, CircleDot, History, Power, PowerOff, SlidersHorizontal } from "lucide-react"
import { PageLoading, ErrorState } from "@/components/competitions/shared"
import {
  ADMIN_ACCENTS,
  AdminHeader,
  AdminMetrics,
  InlineNotice,
  SectionCard,
} from "@/components/admin/shell"
import { featureMeta, groupFeatureFlags } from "@/lib/admin/feature-catalog"
import { FlagMeter } from "./flag-row"
import { formatFlagUpdatedAt, useFeatureFlags } from "./use-feature-flags"

export default function FeaturesOverviewPage() {
  const { flags, loading, error, reload } = useFeatureFlags()

  if (loading) return <PageLoading />
  if (error && flags.length === 0) return <ErrorState message={error} retry={() => void reload()} />

  const buckets = groupFeatureFlags(flags)
  const enabled = flags.filter((flag) => flag.enabled).length
  const recent = [...flags]
    .filter((flag) => flag.updatedAt)
    .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Plataforma"
        title="Recursos"
        subtitle="Liga e desliga funcionalidades sem novo deploy. Escolha o assunto para mexer só no que interessa."
        icon={SlidersHorizontal}
        accent="sky"
      />

      <AdminMetrics
        items={[
          { label: "Recursos", value: flags.length, icon: SlidersHorizontal, accent: "sky" },
          { label: "No ar", value: enabled, icon: Power, accent: "emerald" },
          { label: "Desligados", value: flags.length - enabled, icon: PowerOff, accent: "slate" },
          { label: "Assuntos", value: buckets.length, icon: CircleDot, accent: "violet" },
        ]}
      />

      <InlineNotice tone="info">
        Desligar um recurso tira a área do menu de todo mundo na hora, inclusive de quem já está com a página aberta.
        Quem tinha acesso continua tendo quando ele voltar.
      </InlineNotice>

      <div className="grid gap-3 lg:grid-cols-2">
        {buckets.map(({ category, flags: categoryFlags }) => {
          const tone = ADMIN_ACCENTS[category.accent]
          const on = categoryFlags.filter((flag) => flag.enabled).length

          return (
            <Link
              key={category.slug}
              href={`/admin/features/${category.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            >
              <span
                aria-hidden
                className={`absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full ${tone.bar} opacity-30 transition-opacity group-hover:opacity-80`}
              />

              <div className="flex items-start gap-3">
                <span
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border ${tone.chip}`}
                >
                  <category.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-black text-white">{category.title}</h2>
                    <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-700 transition-colors group-hover:text-gray-300" />
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-gray-500">{category.description}</p>
                </div>
                <span className={`flex-shrink-0 text-right text-[11px] font-black tabular-nums ${tone.text}`}>
                  {on}
                  <span className="text-gray-600">/{categoryFlags.length}</span>
                </span>
              </div>

              <div className="mt-4">
                <FlagMeter on={on} total={categoryFlags.length} accent={category.accent} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {categoryFlags.map((flag) => (
                  <span
                    key={flag.key}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      flag.enabled ? tone.ring + " " + tone.soft : "border-white/[0.06] text-gray-600"
                    }`}
                  >
                    {featureMeta(flag).label}
                  </span>
                ))}
              </div>
            </Link>
          )
        })}
      </div>

      {recent.length > 0 && (
        <SectionCard
          icon={History}
          accent="slate"
          title="Mexeram nisso por último"
          description="As alterações mais recentes, para saber o que mudou antes de alguém perguntar."
          flush
        >
          <ul className="divide-y divide-white/[0.05]">
            {recent.map((flag) => {
              const meta = featureMeta(flag)
              return (
                <li key={flag.key} className="flex items-center gap-3 px-5 py-3">
                  <meta.icon className={`h-4 w-4 flex-shrink-0 ${flag.enabled ? "text-emerald-400" : "text-gray-600"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-white">{meta.label}</span>
                    <span className="block truncate font-mono text-[10px] text-gray-600">{flag.key}</span>
                  </span>
                  <span className="flex-shrink-0 text-right text-[11px] text-gray-600">
                    {formatFlagUpdatedAt(flag.updatedAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
