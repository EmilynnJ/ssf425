import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface WebSocketHook {
  socket: WebSocket | null;
  status: WebSocketStatus;
  sendMessage: (message: unknown) => void;
  lastMessage: any | null;
  reconnect: () => void;
}

export function useWebSocket(): WebSocketHook {
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  const createWebSocketConnection = useCallback(() => {
    try {
      // Clear any existing reconnect attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Close existing socket if open
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        socketRef.current.close();
      }
      
      // Create WebSocket with correct protocol based on HTTPS vs HTTP
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // In Replit, we need to use the current hostname but with the correct port
      let wsUrl;
      if (window.location.hostname.includes('replit')) {
        // For Replit deployments, keep the full hostname
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        // For local development, use 0.0.0.0 as the hostname
        wsUrl = `${protocol}//0.0.0.0:${window.location.port}/ws`;
      }
      
      console.log('Creating WebSocket connection to:', wsUrl);
      setStatus('connecting');
      
      const newSocket = new WebSocket(wsUrl);
      socketRef.current = newSocket;
      
      newSocket.onopen = () => {
        console.log('WebSocket connection opened');
        setStatus('open');
        setSocket(newSocket);
        
        // Send initial ping to test connection
        newSocket.send(JSON.stringify({ 
          type: 'ping', 
          timestamp: Date.now() 
        }));
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          setLastMessage(data);
          
          // Handle specific message types
          if (data.type === 'notification') {
            toast({
              title: data.title || 'Notification',
              description: data.message,
              variant: data.variant || 'default',
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed, code:', event.code, 'reason:', event.reason);
        setStatus('closed');
        setSocket(null);
        
        // Auto-reconnect unless it was a normal closure
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            createWebSocketConnection();
          }, 3000); // Retry after 3 seconds
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        
        toast({
          title: 'Connection Error',
          description: 'Unable to establish real-time connection. Some features may not be available.',
          variant: 'destructive',
        });
      };
      
      return newSocket;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setStatus('error');
      return null;
    }
  }, [toast]);
  
  const reconnect = useCallback(() => {
    console.log('Manual WebSocket reconnection requested');
    createWebSocketConnection();
  }, [createWebSocketConnection]);
  
  const sendMessage = useCallback(
    (message: unknown) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        socketRef.current.send(messageString);
      } else {
        console.warn('Cannot send message, WebSocket is not open', message);
        
        toast({
          title: 'Connection Issue',
          description: 'Unable to send message as real-time connection is not available.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );
  
  // Set up WebSocket connection on component mount
  useEffect(() => {
    const newSocket = createWebSocketConnection();
    
    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (newSocket && (newSocket.readyState === WebSocket.OPEN || newSocket.readyState === WebSocket.CONNECTING)) {
        console.log('Closing WebSocket connection on unmount');
        newSocket.close();
      }
    };
  }, [createWebSocketConnection]);
  
  // Keep connection alive with periodic ping
  useEffect(() => {
    if (status !== 'open') return;
    
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ 
          type: 'ping', 
          timestamp: Date.now() 
        }));
      }
    }, 30000); // Send ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [status]);
  
  return {
    socket,
    status,
    sendMessage,
    lastMessage,
    reconnect
  };
}