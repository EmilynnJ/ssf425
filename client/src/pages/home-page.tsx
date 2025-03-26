import { HeroSection } from "@/components/home/hero-section";
import { FeaturesSection } from "@/components/home/features-section";
import { ReadersSection } from "@/components/home/readers-section";
import { LiveSection } from "@/components/home/live-section";
import { ShopSection } from "@/components/home/shop-section";
import { StarField } from "@/components/ui/star-field";

export default function HomePage() {
  return (
    <div className="py-16 cosmic-bg relative min-h-screen">
      <StarField />
      <div className="container mx-auto px-4">
        <HeroSection />
        <ReadersSection />
        <FeaturesSection />
        <LiveSection />
        <ShopSection />
      </div>
    </div>
  );
}
