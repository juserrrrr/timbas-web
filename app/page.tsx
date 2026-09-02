import "@fontsource/anton"

import { LandingHeader } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Overview } from "@/components/landing/overview"
import { CustomMatchStory } from "@/components/landing/stories/custom-match"
import { TournamentsStory } from "@/components/landing/stories/tournaments"
import { EaAutoStory } from "@/components/landing/stories/ea-auto"
import { DraftStory } from "@/components/landing/stories/draft"
import { LiveStory } from "@/components/landing/stories/live"
import { RiftToolsStory } from "@/components/landing/stories/rift-tools"
import { DiscordBotStory } from "@/components/landing/stories/discord-bot"
import { Awards } from "@/components/landing/awards"
import { RankingLive } from "@/components/landing/ranking"
import { LandingCta } from "@/components/landing/cta"
import { LandingFooter } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-clip text-white">
      {/* Fundo fixo. As cores fortes ficam por conta de cada seção, aqui só a
          textura e um respiro de luz nas pontas. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-[#050508]">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff07_1px,_transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_35%,#050508_80%)]" />
      </div>

      {/* Sem JavaScript nada anima, então nada pode ficar invisível. */}
      <noscript>
        <style>{`.lp-reveal { opacity: 1 !important; transform: none !important; }`}</style>
      </noscript>

      <LandingHeader />

      <main>
        <Hero />
        <Overview />
        <TournamentsStory />
        <EaAutoStory />
        <CustomMatchStory />
        <DraftStory />
        <LiveStory />
        <RiftToolsStory />
        <DiscordBotStory />
        <Awards />
        <RankingLive />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  )
}
