import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Reading } from '@shared/schema';
import { VideoCall } from '@/components/readings/video-call';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Clock, MessageCircle, MessageSquare, Video, Phone, Mic, MicOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ReadingSessionPage() {
  const [_, setLocation] = useLocation();
  const [match, params] = useRoute('/reading-session/:id');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string; timestamp: number }[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get reading session data
  const { data: reading, isLoading } = useQuery<Reading>({
    queryKey: [`/api/readings/${params?.id}`],
    enabled: !!params?.id && !!user,
    refetchInterval: 5000, // Refresh every 5 seconds to update status
  });
  
  // Get user balance
  const { data: userBalance } = useQuery({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
  });

  // End the reading session mutation
  const endReadingMutation = useMutation({
    mutationFn: async () => {
      // Calculate the total cost based on elapsed time
      const finalCost = Math.ceil((reading!.pricePerMinute * elapsedTime) / 60);
      
      await apiRequest('POST', `/api/readings/${params?.id}/end`, {
        duration: Math.ceil(elapsedTime / 60), // Convert to minutes and round up
        totalPrice: finalCost  
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/readings/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      toast({
        title: 'Reading Ended',
        description: 'Your reading session has been completed and payment processed from your account balance.',
      });
      setLocation('/readings');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to end reading: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Send chat message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest('POST', `/api/readings/${params?.id}/message`, {
        message
      });
    },
    onSuccess: () => {
      // We'll handle message display via WebSocket, so no need to update state here
      setMessageInput('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to send message: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Start the timer for chat and voice sessions
  useEffect(() => {
    if (!reading || !user || reading.type === 'video') return;
    
    // Only start the timer if the session is in progress and hasn't already started
    if (reading.status === 'in_progress' && !sessionStarted) {
      // Start the timer for chat and voice sessions
      setSessionStarted(true);
      
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newSeconds = prev + 1;
          return newSeconds;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [reading, user, sessionStarted]);

  // Listen for WebSocket messages for the chat
  useEffect(() => {
    if (!reading || !user) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      // Only handle messages for this reading
      if (data.readingId === reading.id && data.type === 'chat_message') {
        setChatMessages(prev => [...prev, {
          sender: data.senderId === user.id ? 'You' : data.senderName,
          message: data.message,
          timestamp: data.timestamp
        }]);
        
        // Start the timer on first message if not already started
        if (!sessionStarted && reading.type === 'chat') {
          setSessionStarted(true);
        }
      }
    });
    
    return () => {
      socket.close();
    };
  }, [reading, user, sessionStarted]);
  
  // Update total cost whenever elapsed time changes
  useEffect(() => {
    if (reading) {
      const cost = (reading.pricePerMinute * elapsedTime) / 60; // Convert to cents per second
      setTotalCost(cost);
    }
  }, [elapsedTime, reading]);
  
  // Format cost for display
  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };
  
  // Handle timer updates from the VideoCall component
  const handleTimerUpdate = (seconds: number) => {
    setElapsedTime(seconds);
  };
  
  // Handle ending the reading session
  const handleEndReading = () => {
    endReadingMutation.mutate();
  };
  
  // Handle sending a chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && reading) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };
  
  // Format timestamp to local time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Determine if the current user is the reader
  const isReader = user?.id === reading?.readerId;
  
  if (isLoading || !reading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 cosmic-bg min-h-screen">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className="mb-2 sm:mb-0">
              {reading.type.charAt(0).toUpperCase() + reading.type.slice(1)} Reading Session
            </span>
            <div className="flex items-center gap-2 text-base font-normal">
              <Clock className="h-4 w-4" />
              <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
              <span className="ml-2">|</span>
              <span className="text-primary font-semibold">{formatCost(totalCost)}</span>
            </div>
          </CardTitle>
          <CardDescription>
            {isReader ? `Session with ${reading.clientId}` : `Session with Reader #${reading.readerId}`}
          </CardDescription>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="p-6">
          <Tabs defaultValue={reading.type} className="w-full">
            <TabsList className="mb-4">
              {reading.type === 'chat' && <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-2" /> Chat</TabsTrigger>}
              {reading.type === 'video' && <TabsTrigger value="video"><Video className="h-4 w-4 mr-2" /> Video</TabsTrigger>}
              {reading.type === 'voice' && <TabsTrigger value="voice"><Phone className="h-4 w-4 mr-2" /> Voice</TabsTrigger>}
            </TabsList>
            
            {/* Chat UI */}
            {reading.type === 'chat' && (
              <TabsContent value="chat" className="h-[400px] flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-3 border rounded-md">
                  {chatMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`px-3 py-2 rounded-lg ${msg.sender === 'You' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                        {msg.message}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {msg.sender} • {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No messages yet. Start your conversation...
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                  <Button type="submit" disabled={sendMessageMutation.isPending} className="whitespace-nowrap">
                    <MessageCircle className="h-4 w-4 mr-2 sm:inline hidden" />
                    Send
                  </Button>
                </form>
              </TabsContent>
            )}
            
            {/* Video Call UI */}
            {reading.type === 'video' && (
              <TabsContent value="video" className="h-[400px]">
                <VideoCall
                  reading={reading}
                  user={user}
                  isReader={isReader}
                  onEndCall={handleEndReading}
                  onTimerUpdate={handleTimerUpdate}
                />
              </TabsContent>
            )}
            
            {/* Voice Call UI */}
            {reading.type === 'voice' && (
              <TabsContent value="voice" className="h-[400px] flex flex-col items-center justify-center">
                <div className="text-center">
                  <Phone className="h-24 w-24 mx-auto text-primary animate-pulse" />
                  <h3 className="mt-4 text-lg font-medium">Voice Call in Progress</h3>
                  <p className="text-muted-foreground mb-6">Your voice call is active</p>
                  
                  <div className="flex flex-col gap-4">
                    {!sessionStarted ? (
                      <Button 
                        onClick={() => setSessionStarted(true)} 
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Start Voice Session
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-2xl font-semibold">
                          {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                        </div>
                        
                        <div className="text-lg font-medium">
                          {formatCost(totalCost)}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-4 mt-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="w-12 h-12 rounded-full"
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        size="icon"
                        className="w-12 h-12 rounded-full"
                        onClick={handleEndReading}
                      >
                        <Phone className="h-5 w-5 rotate-135" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {reading.pricePerMinute ? `Rate: ${formatCost(reading.pricePerMinute)}/min` : 'Rate not set'}
          </div>
          <Button 
            variant="destructive" 
            onClick={handleEndReading} 
            disabled={endReadingMutation.isPending}
            className="w-full sm:w-auto"
          >
            End Reading Session
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}