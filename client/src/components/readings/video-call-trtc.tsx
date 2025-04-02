import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"; 
import { useTRTC } from '@/hooks/use-trtc';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Reading, User } from '@shared/schema';

interface VideoCallTRTCProps {
  reading: Reading;
  user: User;
  isReader: boolean;
  onEndCall: () => void;
  onTimerUpdate: (seconds: number) => void;
}

export function VideoCallTRTC({ 
  reading, 
  user, 
  isReader, 
  onEndCall,
  onTimerUpdate 
}: VideoCallTRTCProps) {
  const { toast } = useToast();
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Get TRTC client from context
  const { 
    client, 
    isInitialized, 
    localStream, 
    remoteStreams, 
    isConnecting,
    isConnected,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    error
  } = useTRTC();
  
  // Generate room and user IDs for this reading
  const roomId = reading.id;
  const userId = user.id.toString();
  
  // Initialize timer for billing
  useEffect(() => {
    if (hasJoined && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          onTimerUpdate(newTime);
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [hasJoined, onTimerUpdate]);
  
  // Join room when component mounts
  useEffect(() => {
    async function initializeCall() {
      if (isInitialized && !isConnecting && !isConnected && !isJoining) {
        try {
          setIsJoining(true);
          console.log(`Joining room ${roomId} as user ${userId}`);
          
          // Join the room
          await joinRoom(roomId.toString(), userId);
          setHasJoined(true);
          
          toast({
            title: "Connected to session",
            description: "You've successfully joined the video call.",
          });
        } catch (error) {
          console.error("Failed to join room:", error);
          toast({
            title: "Connection Error",
            description: "Failed to join the video call. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsJoining(false);
        }
      }
    }
    
    initializeCall();
    
    // Leave room when component unmounts
    return () => {
      if (isConnected) {
        leaveRoom();
      }
    };
  }, [isInitialized, isConnected, isConnecting, joinRoom, leaveRoom, roomId, userId, toast]);
  
  // Update local video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Updating local video element");
      
      // Clear previous content
      while (localVideoRef.current.firstChild) {
        localVideoRef.current.removeChild(localVideoRef.current.firstChild);
      }
      
      // Append the new video element
      const videoElement = localStream.play(localVideoRef.current.id);
      if (videoElement) {
        localVideoRef.current.appendChild(videoElement);
      }
    }
  }, [localStream]);
  
  // Update remote video element when remote streams change
  useEffect(() => {
    if (remoteStreams.length > 0 && remoteVideoRef.current) {
      console.log("Remote streams available:", remoteStreams);
      
      // Get the first remote stream
      const stream = remoteStreams[0];
      
      // Clear previous content
      while (remoteVideoRef.current.firstChild) {
        remoteVideoRef.current.removeChild(remoteVideoRef.current.firstChild);
      }
      
      // Append the new video element
      const videoElement = stream.play(remoteVideoRef.current.id);
      if (videoElement) {
        remoteVideoRef.current.appendChild(videoElement);
      }
    }
  }, [remoteStreams]);
  
  // Handle audio toggle
  const handleToggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    toggleAudio();
  };
  
  // Handle video toggle
  const handleToggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    toggleVideo();
  };
  
  // Handle end call
  const handleEndCall = () => {
    if (isConnected) {
      leaveRoom();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    onEndCall();
  };
  
  // Show loading state when initializing TRTC
  if (!isInitialized) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-center font-playfair">Initializing video call...</p>
      </div>
    );
  }
  
  // Show error state if there's an error
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-red-500 mb-3">
          <PhoneOff className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium mb-2">Connection Error</h3>
        <p className="text-muted-foreground mb-4 text-center">{error.message || "Failed to connect to the video call"}</p>
        <Button onClick={onEndCall} variant="outline">Close</Button>
      </div>
    );
  }
  
  // Render the video call UI
  return (
    <div className="h-full flex flex-col">
      {/* Video Area */}
      <div className="flex-1 flex bg-dark/50 relative rounded-md overflow-hidden">
        {/* Remote Video (Full size) */}
        <div 
          id="remote-video-container" 
          ref={remoteVideoRef} 
          className="absolute inset-0 h-full w-full bg-black"
        >
          {remoteStreams.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {isConnecting || isJoining ? (
                  <>
                    <LoadingSpinner size="lg" />
                    <p className="mt-2 text-light font-playfair">Connecting...</p>
                  </>
                ) : (
                  <>
                    <p className="text-light font-playfair">Waiting for the other participant...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Local Video (Picture-in-Picture) */}
        <div 
          id="local-video-container" 
          ref={localVideoRef} 
          className="absolute bottom-3 right-3 h-[30%] w-[30%] bg-dark/80 rounded-md overflow-hidden border border-accent/50 shadow-glow-sm"
        >
          {!localStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-10 w-10 ${!isAudioEnabled ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
          onClick={handleToggleAudio}
        >
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-10 w-10 ${!isVideoEnabled ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
          onClick={handleToggleVideo}
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}