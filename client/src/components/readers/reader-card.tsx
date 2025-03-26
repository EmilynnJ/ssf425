import { GlowCard } from "@/components/ui/glow-card";
import { OnlineStatusBadge } from "./online-status-badge";
import { User } from "@shared/schema";
import { CelestialButton } from "@/components/ui/celestial-button";
import { StarIcon, MessageCircleIcon } from "lucide-react";
import { Link } from "wouter";

interface ReaderCardProps {
  reader: Omit<User, "password">;
}

export function ReaderCard({ reader }: ReaderCardProps) {
  // Default fallback image for readers without profile images
  const profileImage = reader.profileImage || "/images/default-reader.png";
  
  // Parse specialties, ensuring they're always an array of strings
  const specialties: string[] = (() => {
    if (!reader.specialties) return [];
    if (Array.isArray(reader.specialties)) return reader.specialties as string[];
    if (typeof reader.specialties === 'string') {
      try {
        const parsed = JSON.parse(reader.specialties);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [reader.specialties];
      }
    }
    return [];
  })();
  return (
    <GlowCard className="p-6 flex flex-col">
      <div className="relative mb-4">
        {/* Profile image */}
        <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 bg-primary-light/20">
          {profileImage && (
            <img 
              src={profileImage} 
              alt={`${reader.fullName} - Psychic Reader`}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Online status */}
        <div className="absolute top-2 right-2">
          <OnlineStatusBadge isOnline={reader.isOnline || false} className="bg-primary-dark/70 backdrop-blur-sm px-2 py-1 rounded-full" />
        </div>
      </div>
      
      {/* Reader info */}
      <h3 className="text-2xl font-alex text-accent mb-1">{reader.fullName}</h3>
      
      {/* Rating */}
      {reader.rating && (
        <div className="flex items-center mb-2">
          <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
          <span className="text-light/90 font-playfair">{reader.rating}/5</span>
        </div>
      )}
      
      {/* Specialties */}
      {Array.isArray(specialties) && specialties.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {specialties.map((specialty: string, index: number) => (
              <span 
                key={index} 
                className="text-xs px-2 py-1 rounded-full bg-primary-light/20 text-light/70 font-playfair"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Bio */}
      {reader.bio && (
        <p className="text-light/70 text-sm mb-4 font-playfair line-clamp-3">
          {reader.bio}
        </p>
      )}
      
      {/* Pricing */}
      {reader.pricing && (
        <div className="mb-4">
          <p className="text-secondary font-cinzel">
            ${reader.pricing}/min
          </p>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="mt-auto flex space-x-2">
        <Link href={`/readers/${reader.id}`}>
          <CelestialButton className="flex-1">
            View Profile
          </CelestialButton>
        </Link>
        <CelestialButton 
          variant="secondary" 
          className="w-10 h-10 p-0 flex items-center justify-center"
        >
          <MessageCircleIcon className="h-5 w-5" />
        </CelestialButton>
      </div>
    </GlowCard>
  );
}