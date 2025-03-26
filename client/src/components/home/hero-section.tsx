import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { CelestialButton } from "@/components/ui/celestial-button";
import { StarField } from "@/components/ui/star-field";

export function HeroSection() {
  return (
    <div className="flex flex-col items-center text-center mb-20 relative">
      <StarField />
      
      {/* Eye with sunburst design */}
      <div className="w-48 h-48 mb-10 relative">
        {/* Outer glow ring */}
        <div className="absolute -inset-10 w-[calc(100%+5rem)] h-[calc(100%+5rem)] rounded-full bg-white opacity-30 filter blur-2xl animate-pulse-slow"></div>
        
        {/* Middle glow ring */}
        <div className="absolute -inset-5 w-[calc(100%+2.5rem)] h-[calc(100%+2.5rem)] rounded-full bg-white opacity-50 filter blur-xl animate-pulse-slow"></div>
        
        {/* Pink outer ring */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10">
          <div className="w-full h-full rounded-full bg-pink-500 p-1.5 shadow-[0_0_40px_rgba(236,72,153,0.9)]">
            
            {/* Eye white */}
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              
              {/* Iris */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-b from-purple-800 to-purple-900 flex items-center justify-center">
                
                {/* Pupil */}
                <div className="w-16 h-16 rounded-full bg-black"></div>
                
                {/* Light reflections */}
                <div className="absolute w-8 h-8 rounded-full bg-white top-6 right-8 opacity-80"></div>
                <div className="absolute w-5 h-5 rounded-full bg-white bottom-10 left-10 opacity-60"></div>
              </div>
            </div>
          </div>
        </div>
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
