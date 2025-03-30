import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { CelestialButton } from "@/components/ui/celestial-button";
import { StarField } from "@/components/ui/star-field";

export function HeroSection() {
  return (
    <div className="flex flex-col items-center text-center mb-20 relative">
      <StarField />
      
      <h1 className="text-6xl md:text-7xl font-alex-brush mb-4 z-10">
        <span className="text-accent">Soul</span>
        <span className="text-secondary">Seer</span>
      </h1>
      
      <div className="w-40 md:w-56 mb-4 z-10">
        <img 
          src="/assets/logos/eye_starburst.png" 
          alt="SoulSeer Eye" 
          className="w-full h-auto eye-glow"
        />
      </div>
      
      <p className="text-xl font-playfair text-light/80 mb-8 max-w-2xl z-10">A Community of Gifted Psychics</p>
      
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
