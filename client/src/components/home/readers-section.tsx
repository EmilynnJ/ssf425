import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Link } from "wouter";
import { PATHS } from "@/lib/constants";
import { GlowCard } from "@/components/ui/glow-card";
import { ArrowRightIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReaderCard } from "@/components/readers/reader-card";
import { useWebSocketContext } from "@/hooks/websocket-provider";
import { useEffect, useState } from "react";

export function ReadersSection() {
  const [readers, setReaders] = useState<Omit<User, 'password'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const websocket = useWebSocketContext();
  
  const { data: fetchedReaders, isLoading: isLoadingReaders } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/readers/online"],
  });
  
  // Update readers state when data is fetched
  useEffect(() => {
    if (fetchedReaders) {
      setReaders(fetchedReaders);
      setIsLoading(false);
    }
  }, [fetchedReaders]);
  
  // Listen for WebSocket messages about reader status changes
  useEffect(() => {
    if (websocket.lastMessage && websocket.lastMessage.type === 'reader_status_change') {
      const { reader, status } = websocket.lastMessage;
      
      // Update the readers list with the new status
      setReaders(prevReaders => {
        // Find if the reader is already in the list
        const readerIndex = prevReaders.findIndex(r => r.id === reader.id);
        
        if (status === 'online' && readerIndex === -1) {
          // Add the reader to the list if they're now online
          return [...prevReaders, reader];
        } else if (status === 'online' && readerIndex !== -1) {
          // Update the existing reader's information
          const updatedReaders = [...prevReaders];
          updatedReaders[readerIndex] = {
            ...updatedReaders[readerIndex],
            ...reader,
            isOnline: true
          };
          return updatedReaders;
        } else if (status === 'offline' && readerIndex !== -1) {
          // Update the reader's status to offline
          const updatedReaders = [...prevReaders];
          updatedReaders[readerIndex] = {
            ...updatedReaders[readerIndex],
            isOnline: false
          };
          return updatedReaders;
        }
        
        return prevReaders;
      });
    }
  }, [websocket.lastMessage]);
  
  // Filter online readers
  const onlineReaders = readers.filter(reader => reader.isOnline);
  
  return (
    <div className="mb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-alex text-secondary">Online Now</h2>
        <Link href={PATHS.READERS} className="text-accent hover:text-accent-dark transition duration-300 flex items-center font-playfair">
          View All
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <GlowCard key={index} className="p-6">
              <Skeleton className="h-48 w-full rounded-lg mb-4" />
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-16 w-full mb-4" />
              <div className="flex space-x-2">
                <Skeleton className="h-10 flex-1 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </GlowCard>
          ))}
        </div>
      ) : onlineReaders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {onlineReaders.slice(0, 3).map((reader) => (
            <ReaderCard key={reader.id} reader={reader} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <GlowCard className="p-8 max-w-md mx-auto">
            <p className="text-light/80 font-playfair text-lg mb-2">No readers are online at the moment.</p>
            <p className="text-light/60 font-playfair mb-4">Check back later or browse all our talented psychics.</p>
            <Link href={PATHS.READERS}>
              <button className="text-accent underline hover:text-accent-dark transition-colors font-playfair">
                View All Readers
              </button>
            </Link>
          </GlowCard>
        </div>
      )}
    </div>
  );
}
