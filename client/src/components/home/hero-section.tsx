import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { CelestialButton } from "@/components/ui/celestial-button";
import { StarField } from "@/components/ui/star-field";

export function HeroSection() {
  return (
    <div className="flex flex-col items-center text-center mb-20 relative">
      <StarField />
      
      {/* Hero image with the eye and sunburst */}
      <div className="w-full max-w-3xl mx-auto mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl backdrop-blur-sm animate-pulse-slow"></div>
        <img 
          src="/images/hero-eye-image.jpg" 
          alt="SoulSeer - Psychic with glowing third eye" 
          className="w-full h-auto rounded-2xl shadow-2xl shadow-purple-600/30 z-10"
        />
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
