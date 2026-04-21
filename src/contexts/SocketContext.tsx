'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore';
import { notificationsService } from '@/services/notifications.service';

interface SocketContextValue {
  chatUnread: number;
  notifUnread: number;
  setChatUnread: (n: number) => void;
  setNotifUnread: (n: number) => void;
  refreshNotifCount: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  chatUnread: 0,
  notifUnread: 0,
  setChatUnread: () => {},
  setNotifUnread: () => {},
  refreshNotifCount: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);

  const refreshNotifCount = useCallback(() => {
    notificationsService.getUnreadCount().then(setNotifUnread).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setChatUnread(0);
      setNotifUnread(0);
      return;
    }

    // Load initial notification count via REST
    refreshNotifCount();

    const token = Cookies.get('accessToken');
    if (!token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(`${wsUrl}/chat`, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    // Initial chat unread count on connect
    socket.on('unread_count', (data: { count: number }) => {
      setChatUnread(data.count);
    });

    // Backend emits this when a new notification is created for the user
    socket.on('notification_update', () => {
      refreshNotifCount();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, refreshNotifCount]);

  return (
    <SocketContext.Provider value={{ chatUnread, notifUnread, setChatUnread, setNotifUnread, refreshNotifCount }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
