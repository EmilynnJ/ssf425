import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { GlowCard } from "@/components/ui/glow-card";
import { Star, StarHalf } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CelestialButton } from "@/components/ui/celestial-button";
import { Skeleton } from "@/components/ui/skeleton";

export function ReadersSection() {
  const { data: readers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/readers/online"],
  });
  
  return (
    <div className="mb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-alex-brush text-secondary">Online Now</h2>
        <Link href={PATHS.READERS} className="text-accent hover:text-accent-dark transition duration-300 flex items-center">
          View All
          <svg
            className="ml-1 h-4 w-4"
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
        </Link>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <GlowCard key={index}>
              <div className="flex items-center space-x-4 mb-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-10 w-full rounded-full" />
            </GlowCard>
          ))}
        </div>
      ) : readers && readers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {readers.slice(0, 3).map((reader) => (
            <GlowCard key={reader.id}>
              <div className="flex items-center space-x-4 mb-4">
                <Avatar className="w-16 h-16 rounded-full border-2 border-accent-gold">
                  <AvatarImage src={reader.profileImage || ""} alt={reader.fullName} />
                  <AvatarFallback className="bg-accent text-white">
                    {reader.fullName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="text-xl font-cinzel text-secondary">{reader.fullName}</h3>
                  <p className="text-accent text-sm font-playfair">
                    {Array.isArray(reader.specialties) ? reader.specialties.join(" & ") : "Psychic Reading"}
                  </p>
                  <div className="flex items-center mt-1">
                    <div className="flex">
                      {[...Array(Math.floor(reader.rating || 0))].map((_, i) => (
                        <Star key={i} className="text-secondary text-sm" />
                      ))}
                      {reader.rating && reader.rating % 1 !== 0 && (
                        <StarHalf className="text-secondary text-sm" />
                      )}
                    </div>
                    <span className="text-light/60 text-xs ml-2 font-playfair">{reader.rating}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                  <span className="text-light/80 text-sm">Available Now</span>
                </div>
                <div className="text-secondary font-semibold">
                  ${((reader.pricing || 399) / 100).toFixed(2)}/min
                </div>
              </div>
              
              <Link href={`${PATHS.READERS}/${reader.id}`}>
                <CelestialButton
                  variant="primary"
                  className="w-full"
                >
                  Start Reading
                </CelestialButton>
              </Link>
            </GlowCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-light/70">No readers online at the moment. Please check back later.</p>
        </div>
      )}
    </div>
  );
}
