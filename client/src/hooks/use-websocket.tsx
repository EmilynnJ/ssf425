import { useState, useEffect, useCallback } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface WebSocketHook {
  socket: WebSocket | null;
  status: WebSocketStatus;
  sendMessage: (message: unknown) => void;
  lastMessage: string | null;
}

export function useWebSocket(): WebSocketHook {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket at:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setStatus('open');
    };

    ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      setLastMessage(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setStatus('closed');
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = useCallback(
    (message: unknown) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        console.warn('WebSocket is not connected, cannot send message');
      }
    },
    [socket]
  );

  return { socket, status, sendMessage, lastMessage };
}