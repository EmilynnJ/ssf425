import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function WebSocketStatus() {
  const { status, sendMessage, lastMessage } = useWebSocket();
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const handlePing = () => {
    if (status !== 'open') return;
    
    setIsPinging(true);
    const start = Date.now();
    setPingTime(null);
    
    sendMessage(JSON.stringify({ type: 'ping', timestamp: start }));
    
    // Safety timeout in case we don't get a response
    setTimeout(() => {
      setIsPinging(false);
    }, 5000);
  };

  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const data = JSON.parse(lastMessage);
      if (data.type === 'pong') {
        const end = Date.now();
        const start = data.timestamp;
        setPingTime(end - start);
        setIsPinging(false);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [lastMessage]);

  return (
    <div className="fixed bottom-4 right-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border border-accent/30 shadow-lg z-50">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">WebSocket:</span>
          <StatusBadge status={status} />
        </div>
        
        {lastMessage && (
          <div className="text-xs opacity-70 max-w-[200px] truncate">
            Last: {lastMessage}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handlePing}
            disabled={status !== 'open' || isPinging}
          >
            {isPinging ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Pinging...
              </>
            ) : (
              "Ping"
            )}
          </Button>
          
          {pingTime !== null && (
            <span className="text-xs font-mono">{pingTime}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'connecting':
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Connecting
        </Badge>
      );
    case 'open':
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/50">
          Connected
        </Badge>
      );
    case 'closed':
      return (
        <Badge variant="outline" className="bg-gray-500/20 text-gray-500 border-gray-500/50">
          Disconnected
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/50">
          Error
        </Badge>
      );
    default:
      return null;
  }
}