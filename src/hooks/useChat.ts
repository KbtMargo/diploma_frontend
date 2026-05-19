import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { Message } from '@/types';

export function useChat(receiverId?: string, onNewMessage?: () => void, currentUserId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

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

    socket.on('new_message', (message: Message & { tempId?: string }) => {
      setMessages(prev => {
        const filtered = message.tempId
          ? prev.filter(m => m.id !== message.tempId)
          : prev;
        if (filtered.find(m => m.id === message.id)) return prev;
        return [...filtered, {
          ...message,
          createdAt: message.createdAt || new Date().toISOString(),
        }];
      });
      if (message.tempId) {
        setPendingIds(prev => { const n = new Set(prev); n.delete(message.tempId!); return n; });
      }
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

    socket.on('messages_read', ({ roomId: readRoomId }: { roomId: string; readBy: string }) => {
      const expectedRoomId = currentUserId && receiverId
        ? [currentUserId, receiverId].sort().join('_')
        : null;
      if (expectedRoomId && readRoomId !== expectedRoomId) return;
      setMessages(prev => {
        const ownIds = prev
          .filter(m => m.senderId === currentUserId && !m.id.startsWith('temp_'))
          .map(m => m.id);
        setReadMessageIds(p => new Set([...p, ...ownIds]));
        return prev;
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

  const sendMessage = useCallback((content: string, toId: string) => {
    const tempId = `temp_${Date.now()}`;
    if (currentUserId) {
      setMessages(prev => [...prev, {
        id: tempId,
        senderId: currentUserId,
        receiverId: toId,
        content,
        type: 'text',
        isRead: false,
        createdAt: new Date().toISOString(),
      } as Message]);
      setPendingIds(prev => new Set([...prev, tempId]));
    }
    socketRef.current?.emit('send_message', { receiverId: toId, content, tempId });
  }, [currentUserId]);

  const sendTyping = useCallback((toId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { receiverId: toId, isTyping });
  }, []);

  const markRead = useCallback((roomId: string) => {
    socketRef.current?.emit('mark_read', { roomId });
  }, []);

  return { isConnected, messages, typingUsers, readMessageIds, pendingIds, sendMessage, sendTyping, markRead };
}
