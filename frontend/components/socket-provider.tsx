'use client';

import * as React from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './auth-provider';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  notifications: unknown[];
  emit: (event: string, data?: unknown) => void;
}

const SocketContext = React.createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [notifications, setNotifications] = React.useState<unknown[]>([]);

  React.useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
    });

    socketInstance.on('connect', () => setConnected(true));
    socketInstance.on('disconnect', () => setConnected(false));
    socketInstance.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id]);

  const emit = React.useCallback(
    (event: string, data?: unknown) => {
      socket?.emit(event, data);
    },
    [socket]
  );

  return (
    <SocketContext.Provider value={{ socket, connected, notifications, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = React.useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}