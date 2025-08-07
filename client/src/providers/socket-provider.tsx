"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const maxReconnectAttempts = 5;
  const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const token = session?.accessToken;

  useEffect(() => {
    // Only proceed if we have a token
    if (!token) {
      if (socket) {
        console.log('No session token, disconnecting socket');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create new socket connection
    console.log(`Initializing socket connection to: ${socketUrl} with token`);
    const socketInstance = io(socketUrl, {
      auth: {
        token: token,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      path: '/api/socket',
      //transports: ['websocket', 'polling'],
      //timeout: 10000,
    });

    // Connection event listeners
    socketInstance.on('connect', () => {
      console.log(`Socket connected successfully with ID: ${socketInstance.id}`);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          console.log('Server initiated disconnect, attempting to reconnect...');
          socketInstance.connect();
        }, 3000);
      }
    });

    socketInstance.on('connect_error', async (err) => {
      console.error('Socket connection error:', err.message);
      await fetch('/api/socket') // Ensure server is ready
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`Socket successfully reconnected after ${attemptNumber} attempts`);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}...`);
    });

    socketInstance.on('reconnect_error', (err) => {
      console.error('Socket reconnection error:', err);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        console.log('Cleaning up socket connection');
        socketInstance.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    // Handle events
    //example: socket.on('event_name', (data) => { console.log(data); });

    return () => {
      // Clean up event listeners
      //example: socket.off('event_name');
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
}




