import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { Message } from '@/types';

export function useChat(receiverId?: string, onNewMessage?: () => void) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token) return;

    const socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/chat`, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_message', (message: Message) => {
          console.log('New message:', message);
      setMessages(prev => {
        const exists = prev.find(m => m.id === message.id);
        if (exists) return prev;
 const msgWithTime = {
      ...message,
      createdAt: message.createdAt || new Date().toISOString(),
    };
    return [...prev, msgWithTime];
      });
      onNewMessage?.();
    });

    socket.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    if (receiverId) {
      socket.emit('get_conversation', { otherUserId: receiverId });
      socket.on('conversation', (data: any) => {
        setMessages(data.data || []);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [receiverId]);

  const sendMessage = useCallback((content: string, receiverId: string) => {
    socketRef.current?.emit('send_message', { receiverId, content });
  }, []);

  const sendTyping = useCallback((receiverId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { receiverId, isTyping });
  }, []);

  const markRead = useCallback((roomId: string) => {
    socketRef.current?.emit('mark_read', { roomId });
  }, []);

  return { isConnected, messages, typingUsers, sendMessage, sendTyping, markRead };
}