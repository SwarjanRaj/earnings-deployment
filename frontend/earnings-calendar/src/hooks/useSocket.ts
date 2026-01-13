import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../app/useAuth';

// Helper to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;
let globalSocketNamespace = '';

export function useSocket(namespace: string = '/chat') {
  const { accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Try to get token from auth context or cookie
    const token = accessToken || getCookie('access');
    if (!token) {
      console.warn('🔌 [Socket] No access token found, socket connection skipped', { namespace });
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        globalSocket = null;
      }
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setLastError('No access token');
      return;
    }

    // Reuse existing socket if namespace matches
    if (globalSocket && globalSocketNamespace === namespace && globalSocket.connected) {
      socketRef.current = globalSocket;
      setIsConnected(true);
      setConnectionStatus('connected');
      setLastError(null);
      return;
    }

    // Disconnect existing socket if namespace changed
    if (globalSocket && globalSocketNamespace !== namespace) {
      globalSocket.disconnect();
      globalSocket = null;
    }

    // Use environment variable or fallback to localhost for development
    // WebSocket connects through Vite proxy in development
    const wsUrl = import.meta.env.VITE_BACKEND_WS_URL || (import.meta.env.DEV ? '' : 'http://localhost:3002');
    console.log('🔌 [Socket] Initializing connection:', {
      url: `${wsUrl}${namespace}`,
      namespace,
      hasToken: !!token,
      existingGlobalSocket: !!globalSocket,
      globalSocketNamespace,
      timestamp: new Date().toISOString(),
    });

    setConnectionStatus('connecting');
    const socket = io(`${wsUrl}${namespace}`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: token,
      },
      query: {
        token: token,
      },
    });

    socket.on('connect', () => {
      console.log('🔌 [Socket] Connected successfully', {
        socketId: socket.id,
        namespace,
        url: `${wsUrl}${namespace}`,
        timestamp: new Date().toISOString(),
      });
      setIsConnected(true);
      setConnectionStatus('connected');
      setLastError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Disconnected:', {
        reason,
        socketId: socket.id,
        namespace,
        timestamp: new Date().toISOString(),
        wasConnected: isConnected,
      });
      setIsConnected(false);
      setConnectionStatus('disconnected');

      // Only clear global socket if it's a server disconnect or transport close
      if (reason === 'io server disconnect') {
        console.log('🔌 [Socket] Server disconnected - attempting manual reconnect in 2s');
        globalSocket = null;
        globalSocketNamespace = '';
        setConnectionStatus('reconnecting');
        setTimeout(() => {
          if (socket.connected) return;
          socket.connect();
        }, 2000);
      } else if (reason === 'transport close') {
        console.log('🔌 [Socket] Transport closed - clearing global socket');
        globalSocket = null;
        globalSocketNamespace = '';
      } else if (reason === 'io client disconnect') {
        console.log('🔌 [Socket] Client disconnect');
        setConnectionStatus('disconnected');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 [Socket] Connection error:', {
        message: error.message,
        type: (error as any).type,
        description: (error as any).description,
        context: (error as any).context,
        namespace,
        timestamp: new Date().toISOString(),
      });
      setIsConnected(false);
      setConnectionStatus('error');
      setLastError(error.message);
    });

    // Add reconnect event listener
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 [Socket] Reconnected after', attemptNumber, 'attempts', {
        socketId: socket.id,
        namespace,
        timestamp: new Date().toISOString(),
      });
      setIsConnected(true);
      setConnectionStatus('connected');
      setLastError(null);
    });

    // Add reconnecting event listener
    socket.on('reconnecting', (attemptNumber) => {
      console.log('🔌 [Socket] Reconnecting... attempt', attemptNumber, {
        namespace,
        timestamp: new Date().toISOString(),
      });
      setConnectionStatus('reconnecting');
    });

    socketRef.current = socket;
    globalSocket = socket;
    globalSocketNamespace = namespace;

    return () => {
      // Don't disconnect if this is just a component unmount but socket is still in use
      // Only disconnect if this is the last reference
      if (socketRef.current === globalSocket) {
        // Check if socket is still needed by other components
        // For now, we'll keep it connected until explicit cleanup
      }
    };
  }, [accessToken, namespace]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    lastError,
  };
}

