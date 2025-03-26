import { GlowCard } from "@/components/ui/glow-card";
import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { Users, MonitorPlay, Store, MessagesSquare } from "lucide-react";

const features = [
  {
    icon: <Users className="text-2xl" />,
    title: "Readers",
    description: "Connect with gifted psychics specializing in tarot, astrology, mediumship, and more.",
    link: PATHS.READERS,
    linkText: "Browse Readers",
    delay: 0
  },
  {
    icon: <MonitorPlay className="text-2xl" />,
    title: "Live Streams",
    description: "Join live stream events featuring psychic readings, spiritual healing, and more.",
    link: PATHS.LIVE,
    linkText: "Watch Live",
    delay: 1
  },
  {
    icon: <Store className="text-2xl" />,
    title: "Spiritual Shop",
    description: "Discover mystical products, crystals, and tools to enhance your spiritual journey.",
    link: PATHS.SHOP,
    linkText: "Visit Shop",
    delay: 0.5
  },
  {
    icon: <MessagesSquare className="text-2xl" />,
    title: "Community",
    description: "Join discussions, share experiences, and connect with like-minded spiritual seekers.",
    link: PATHS.COMMUNITY,
    linkText: "Join Community",
    delay: 1.5
  }
];

export function FeaturesSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
      {features.map((feature, index) => (
        <GlowCard
          key={index}
          floating={true}
          delay={feature.delay}
          className="rounded-2xl p-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-accent/20 text-accent glow-circle">
              {feature.icon}
            </div>
            <h3 className="text-2xl font-cinzel text-secondary">{feature.title}</h3>
          </div>
          
          <p className="text-light/80 mb-4 font-playfair">{feature.description}</p>
          
          <Link href={feature.link}>
            <span className="inline-flex items-center text-accent hover:text-accent-dark transition duration-300">
              {feature.linkText}
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </span>
          </Link>
        </GlowCard>
      ))}
    </div>
  );
}
