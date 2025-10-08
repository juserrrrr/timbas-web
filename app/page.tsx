import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { CommandsSection } from "@/components/commands-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="relative min-h-screen text-white">
      <div className="fixed inset-0 -z-10 bg-black">
        {/* Blue neon orb - top left */}
        <div className="absolute -top-48 -left-48 h-[800px] w-[800px] rounded-full bg-blue-600 opacity-30 blur-[120px]" />

        {/* Red neon orb - bottom right */}
        <div className="absolute -bottom-48 -right-48 h-[800px] w-[800px] rounded-full bg-red-600 opacity-25 blur-[120px]" />
      </div>

      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CommandsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
