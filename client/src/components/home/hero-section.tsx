import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { CelestialButton } from "@/components/ui/celestial-button";
import { StarField } from "@/components/ui/star-field";

export function HeroSection() {
  return (
    <div className="flex flex-col items-center text-center py-8 md:py-12 mb-12 md:mb-20 relative overflow-hidden px-4">
      <StarField />
      
      {/* Use the hero image as background for better mobile responsiveness */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-70">
        <img 
          src="/assets/images/hero-image-new.jpg" 
          alt="SoulSeer Background" 
          className="min-w-full min-h-full object-cover"
        />
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-alex-brush mb-8 text-glow">
          <span className="text-accent">Soul</span>
          <span className="text-secondary">Seer</span>
        </h1>
        
        <p className="text-xl md:text-2xl font-playfair text-white mb-10 max-w-2xl mx-auto">
          A Community of Gifted Psychics
        </p>
        
        <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
          <Link href={PATHS.LIVE}>
            <CelestialButton variant="secondary" size="lg" className="w-full">
              Live Streams
            </CelestialButton>
          </Link>
          
          <Link href={PATHS.SHOP}>
            <CelestialButton variant="primary" size="lg" className="w-full">
              Shop
            </CelestialButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
