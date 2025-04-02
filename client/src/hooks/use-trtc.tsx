import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// We'll load the TRTC module dynamically to avoid issues with SSR/build
let TRTC: any = null;

// Make a function to load TRTC that we can call inside useEffect
const loadTRTC = async (): Promise<any> => {
  try {
    // Check if we already loaded it
    if (TRTC) return TRTC;
    
    // Try to dynamically import the module
    const module = await import('trtc-js-sdk');
    TRTC = module.default || module;
    console.log('TRTC module loaded successfully');
    return TRTC;
  } catch (error) {
    console.error('Failed to load TRTC module:', error);
    return null;
  }
};

export type TRTCStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TRTCHook {
  client: any | null;
  localStream: any | null;
  remoteStreams: Map<string, any>;
  status: TRTCStatus;
  joinRoom: (roomId: string, userId: string) => Promise<void>;
  leaveRoom: () => void;
  startLocalStream: (options?: any) => Promise<any>;
  stopLocalStream: () => void;
}

export function useTRTC(): TRTCHook {
  const { toast } = useToast();
  const [client, setClient] = useState<any | null>(null);
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, any>>(new Map());
  const [status, setStatus] = useState<TRTCStatus>('disconnected');
  
  const clientRef = useRef<any | null>(null);
  const localStreamRef = useRef<any | null>(null);
  
  // Initialize TRTC client
  useEffect(() => {
    let isMounted = true;
    
    const initializeTRTC = async () => {
      try {
        // Dynamically load the TRTC module
        const trtcModule = await loadTRTC();
        
        if (!isMounted) return;
        
        if (!trtcModule) {
          console.error('TRTC module is not available');
          setStatus('error');
          toast({
            title: 'TRTC Initialization Failed',
            description: 'TRTC module is not available. Video/voice features may not work.',
            variant: 'destructive',
          });
          return;
        }
        
        // Assign the loaded module to our local TRTC variable
        TRTC = trtcModule;
        
        // Now we can initialize the client
        console.log('Initializing TRTC client...');
        const trtcClient = TRTC.createClient({
          mode: 'rtc',
          sdkAppId: 0, // Will be set when joining room
          userId: '', // Will be set when joining room
          userSig: '', // Will be set when joining room
        });
        
        console.log('TRTC client created successfully');
        setClient(trtcClient);
        clientRef.current = trtcClient;
        
        // Set up event listeners
        trtcClient.on('error', (error: any) => {
          console.error('TRTC client error:', error);
          setStatus('error');
          
          toast({
            title: 'Connection Error',
            description: `TRTC error: ${error.message || 'Unknown error'}`,
            variant: 'destructive',
          });
        });
        
        trtcClient.on('client-banned', (error: any) => {
          console.warn('TRTC client banned:', error);
          setStatus('disconnected');
          
          toast({
            title: 'Session Ended',
            description: 'You were removed from the session.',
            variant: 'default',
          });
        });
        
        trtcClient.on('stream-added', async (event: any) => {
          const remoteStream = event.stream;
          const userId = remoteStream.getUserId();
          console.log(`New stream added: ${userId}`);
          
          // Subscribe to this remote stream
          try {
            await trtcClient.subscribe(remoteStream);
            console.log(`Successfully subscribed to ${userId}'s stream`);
            
            // Add to remote streams map
            setRemoteStreams(prevStreams => {
              const newStreams = new Map(prevStreams);
              newStreams.set(userId, remoteStream);
              return newStreams;
            });
          } catch (error) {
            console.error(`Failed to subscribe to ${userId}'s stream:`, error);
          }
        });
        
        trtcClient.on('stream-removed', (event: any) => {
          const remoteStream = event.stream;
          const userId = remoteStream.getUserId();
          console.log(`Stream removed: ${userId}`);
          
          // Remove from remote streams map
          setRemoteStreams(prevStreams => {
            const newStreams = new Map(prevStreams);
            newStreams.delete(userId);
            return newStreams;
          });
        });
        
        trtcClient.on('stream-subscribed', (event: any) => {
          const remoteStream = event.stream;
          const userId = remoteStream.getUserId();
          console.log(`Stream subscribed: ${userId}`);
          
          // Update the stream in our map
          setRemoteStreams(prevStreams => {
            const newStreams = new Map(prevStreams);
            newStreams.set(userId, remoteStream);
            return newStreams;
          });
          
          // Notify about new participant
          toast({
            title: 'New Participant',
            description: `${userId} joined the session.`,
            variant: 'default',
          });
        });
        
        trtcClient.on('peer-join', (event: any) => {
          console.log(`Peer joined: ${event.userId}`);
        });
        
        trtcClient.on('peer-leave', (event: any) => {
          console.log(`Peer left: ${event.userId}`);
          
          // Clean up any streams from this user
          setRemoteStreams(prevStreams => {
            const newStreams = new Map(prevStreams);
            newStreams.delete(event.userId);
            return newStreams;
          });
        });
        
        trtcClient.on('connection-state-changed', (event: any) => {
          console.log(`TRTC connection state changed: ${event.state}`);
          
          switch (event.state) {
            case 'DISCONNECTED':
              setStatus('disconnected');
              break;
            case 'CONNECTING':
              setStatus('connecting');
              break;
            case 'CONNECTED':
              setStatus('connected');
              break;
            default:
              break;
          }
        });
      } catch (error) {
        console.error('Error initializing TRTC client:', error);
        setStatus('error');
        toast({
          title: 'TRTC Initialization Failed',
          description: 'Could not initialize real-time communication. Error: ' + (error instanceof Error ? error.message : String(error)),
          variant: 'destructive',
        });
      }
    };
    
    // Call the async init function
    initializeTRTC();
    
    // Clean up function
    return () => {
      isMounted = false;
      
      // Clean up client
      if (clientRef.current) {
        clientRef.current.off('*');
        
        if (status === 'connected') {
          try {
            clientRef.current.leave();
          } catch (error) {
            console.error('Error leaving TRTC room:', error);
          }
        }
      }
    };
  }, [toast, status]);
  
  // Join a TRTC room
  const joinRoom = useCallback(async (roomId: string, userId: string) => {
    if (!clientRef.current) {
      throw new Error('TRTC client not initialized');
    }
    
    try {
      setStatus('connecting');
      
      // Get TRTC parameters from server
      const response = await apiRequest('POST', '/api/trtc/params', { 
        userId,
        roomId
      });
      
      const { sdkAppId, userSig } = await response.json();
      
      // Update client with credentials
      clientRef.current.setSDKAppId(sdkAppId);
      clientRef.current.setUserId(userId);
      clientRef.current.setUserSig(userSig);
      
      // Join the room
      await clientRef.current.join({ roomId });
      
      console.log(`Successfully joined TRTC room ${roomId} as ${userId}`);
      setStatus('connected');
      
      toast({
        title: 'Connected',
        description: `You've joined room ${roomId}.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error joining TRTC room:', error);
      setStatus('error');
      
      toast({
        title: 'Connection Failed',
        description: 'Failed to join the session. Please try again.',
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [toast]);
  
  // Leave TRTC room
  const leaveRoom = useCallback(() => {
    if (!clientRef.current || status !== 'connected') {
      return;
    }
    
    try {
      clientRef.current.leave();
      setStatus('disconnected');
      setRemoteStreams(new Map());
      
      console.log('Successfully left TRTC room');
      
      toast({
        title: 'Disconnected',
        description: "You've left the session.",
        variant: 'default',
      });
    } catch (error) {
      console.error('Error leaving TRTC room:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to leave the session properly.',
        variant: 'destructive',
      });
    }
  }, [status, toast]);
  
  // Create and start local stream
  const startLocalStream = useCallback(async (options = { video: true, audio: true }) => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    
    try {
      // Create local stream
      const stream = TRTC.createStream({
        userId: clientRef.current ? clientRef.current.getUserId() : 'local_user',
        audio: options.audio,
        video: options.video,
        screen: false,
      });
      
      // Initialize and start the stream
      await stream.initialize();
      console.log('Local stream initialized');
      
      // Store the stream
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // If connected to a room, publish the stream
      if (clientRef.current && status === 'connected') {
        await clientRef.current.publish(stream);
        console.log('Local stream published');
      }
      
      return stream;
    } catch (error) {
      console.error('Error starting local stream:', error);
      
      toast({
        title: 'Media Error',
        description: 'Failed to access camera or microphone. Please check permissions.',
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [status, toast]);
  
  // Stop local stream
  const stopLocalStream = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }
    
    try {
      // If connected to a room, unpublish first
      if (clientRef.current && status === 'connected') {
        clientRef.current.unpublish(localStreamRef.current);
        console.log('Local stream unpublished');
      }
      
      // Stop the stream
      localStreamRef.current.close();
      console.log('Local stream stopped');
      
      // Clear the stream
      setLocalStream(null);
      localStreamRef.current = null;
    } catch (error) {
      console.error('Error stopping local stream:', error);
    }
  }, [status]);
  
  return {
    client,
    localStream,
    remoteStreams,
    status,
    joinRoom,
    leaveRoom,
    startLocalStream,
    stopLocalStream
  };
}

// Context provider for TRTC
import { createContext, ReactNode, useContext } from 'react';

const TRTCContext = createContext<TRTCHook | null>(null);

export function TRTCProvider({ children }: { children: ReactNode }) {
  const trtc = useTRTC();
  
  return (
    <TRTCContext.Provider value={trtc}>
      {children}
    </TRTCContext.Provider>
  );
}

export function useTRTCContext() {
  const context = useContext(TRTCContext);
  if (!context) {
    throw new Error('useTRTCContext must be used within a TRTCProvider');
  }
  return context;
}