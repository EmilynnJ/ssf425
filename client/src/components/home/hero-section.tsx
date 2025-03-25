import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { CelestialButton } from "@/components/ui/celestial-button";
import { SoulSeerLogo } from "@/assets/svg/logo";
import { StarField } from "@/components/ui/star-field";

export function HeroSection() {
  return (
    <div className="flex flex-col items-center text-center mb-20 relative">
      <StarField />
      
      <div className="w-32 h-32 mb-6 rounded-full border-2 border-secondary overflow-hidden z-10">
        <SoulSeerLogo className="w-full h-full" />
      </div>
      
      <h1 className="text-5xl md:text-6xl font-cinzel mb-4 z-10">
        <span className="text-accent">Soul</span>
        <span className="text-secondary">Seer</span>
      </h1>
      
      <p className="text-xl text-light/80 mb-8 max-w-2xl z-10">A Community of Gifted Psychics</p>
      
      <div className="flex flex-wrap justify-center gap-4 z-10">
        <Link href={PATHS.READERS}>
          <CelestialButton variant="primary" size="lg">
            Find Your Reader
          </CelestialButton>
        </Link>
        
        <Link href="/apply">
          <CelestialButton variant="secondary" size="lg">
            Apply as Reader
          </CelestialButton>
        </Link>
      </div>
    </div>
  );
}
