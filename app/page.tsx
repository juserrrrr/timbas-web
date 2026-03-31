import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { HowItWorks } from "@/components/how-it-works"
import { FeaturesSection } from "@/components/features-section"
import { CommandsSection } from "@/components/commands-section"
import { RankingLanding } from "@/components/ranking-landing"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="relative min-h-screen text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[#050508]">
        {/* Dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff07_1px,_transparent_1px)] bg-[size:28px_28px]" />
        {/* Glow blobs */}
        <div className="absolute -top-64 left-1/4 h-[700px] w-[700px] rounded-full bg-blue-700 opacity-[0.12] blur-[120px]" />
        <div className="absolute top-1/2 -right-48 h-[600px] w-[600px] rounded-full bg-red-700 opacity-[0.10] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-indigo-800 opacity-[0.08] blur-[100px]" />
      </div>

      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        <RankingLanding />
        <CommandsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
