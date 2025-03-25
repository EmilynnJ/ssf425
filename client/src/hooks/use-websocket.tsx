import { useState, useCallback } from 'react';

// Mock WebSocket status for now until we fix the actual WebSocket implementation
type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface WebSocketHook {
  socket: null;
  status: WebSocketStatus;
  sendMessage: (message: unknown) => void;
  lastMessage: string | null;
}

// This is a temporary stub implementation to avoid WebSocket errors
// until we can properly fix the WebSocket setup
export function useWebSocket(): WebSocketHook {
  const [lastMessage] = useState<string | null>(null);

  const sendMessage = useCallback(
    (message: unknown) => {
      console.log('WebSocket disabled - message not sent:', message);
    },
    []
  );

  return { 
    socket: null, 
    status: 'closed', 
    sendMessage, 
    lastMessage 
  };
}