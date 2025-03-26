import { createContext, ReactNode, useContext, useEffect } from 'react';
import { useWebSocket, WebSocketHook } from './use-websocket';
import { useAuth } from './use-auth';

const WebSocketContext = createContext<WebSocketHook | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const websocket = useWebSocket();
  const { user } = useAuth();
  
  // Authenticate the WebSocket connection when user logs in
  useEffect(() => {
    if (websocket.status === 'open' && user) {
      websocket.sendMessage({
        type: 'authenticate',
        userId: user.id
      });
      
      // Subscribe to relevant channels based on user role
      if (user.role === 'client') {
        websocket.sendMessage({
          type: 'subscribe',
          channel: 'reader_updates'
        });
      } else if (user.role === 'reader') {
        websocket.sendMessage({
          type: 'subscribe',
          channel: 'reader_requests'
        });
      }
    }
  }, [websocket.status, user, websocket.sendMessage]);

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketHook {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}