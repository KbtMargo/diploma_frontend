'use client';

import { useState, useEffect, useRef, SetStateAction } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Send, Search, MessageSquare, Circle,
  Loader2, ArrowLeft, MoreVertical
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { chatService } from '@/services/chat.service';
import { useChat } from '@/hooks/useChat';
import { getInitials, formatRelativeDate } from '@/lib/utils';
import { Message, User } from '@/types';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface Conversation {
  roomId: string;
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const { isConnected, messages, typingUsers, sendMessage, sendTyping, markRead } = useChat(
  selectedUser?.id,
  () => setTimeout(() => fetchConversations(), 500),
);

useEffect(() => {
  if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
  fetchConversations();

  const userId = searchParams.get('userId');
  if (userId) {
    // Завантажити користувача і відкрити розмову
    api.get(`/users/${userId}`).then((res: { data: SetStateAction<User | null>; }) => {
      setSelectedUser(res.data);
      setIsMobileConversationOpen(true);
    }).catch(console.error);
  }
}, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedUser) {
      const roomId = [user?.id, selectedUser.id].sort().join('_');
      markRead(roomId);
    }
  }, [messages, selectedUser]);

  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data || []);
    } catch {
      console.error('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

const handleSend = () => {
  if (!message.trim() || !selectedUser) return;
  sendMessage(message.trim(), selectedUser.id);
  setMessage('');
  sendTyping(selectedUser.id, false);
  
  // Оновити список розмов через секунду
  setTimeout(() => fetchConversations(), 1000);
};

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    if (!selectedUser) return;
    sendTyping(selectedUser.id, true);
if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(selectedUser.id, false);
    }, 1500);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedUser(conv.otherUser);
    setIsMobileConversationOpen(true);
  };

  const filteredConversations = conversations.filter(c =>
    `${c.otherUser.firstName} ${c.otherUser.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const isOwnMessage = (msg: Message) => msg.senderId === user?.id;

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-50">
      {/* Sidebar — conversations list */}
      <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col shrink-0 ${isMobileConversationOpen ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Повідомлення</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук розмов..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className={`px-4 py-1.5 text-xs flex items-center gap-1.5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
          <Circle size={6} className={isConnected ? 'fill-green-500' : 'fill-gray-400'} />
          {isConnected ? 'Онлайн' : 'Підключення...'}
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Немає розмов</p>
              <p className="text-gray-400 text-sm mt-1">
                Подайте заявку на вакансію щоб розпочати спілкування
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.roomId}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left ${
                  selectedUser?.id === conv.otherUser.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {conv.otherUser.avatarUrl ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}${conv.otherUser.avatarUrl}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-700">
                      {getInitials(conv.otherUser.firstName, conv.otherUser.lastName)}
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {conv.otherUser.firstName} {conv.otherUser.lastName}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {formatRelativeDate(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage.content}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col ${!isMobileConversationOpen && selectedUser === null ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={64} className="text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400">Оберіть розмову</h3>
              <p className="text-gray-400 text-sm mt-1">Натисніть на розмову зліва щоб відкрити</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => { setIsMobileConversationOpen(false); setSelectedUser(null); }}
                className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={18} />
              </button>

              {selectedUser.avatarUrl ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${selectedUser.avatarUrl}`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-700">
                  {getInitials(selectedUser.firstName, selectedUser.lastName)}
                </div>
              )}

              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedUser.role === 'employer' ? 'Роботодавець' : 'Шукач роботи'}
                  {typingUsers.has(selectedUser.id) && (
                    <span className="text-indigo-500 ml-2">друкує...</span>
                  )}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Розпочніть розмову</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const own = isOwnMessage(msg);
                  return (
                    <div key={msg.id || index} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                      {!own && (
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-700 shrink-0 mr-2 mt-1">
                          {getInitials(selectedUser.firstName, selectedUser.lastName)}
                        </div>
                      )}
                      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${own ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          own
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-400 px-1">
  {msg.createdAt ? formatRelativeDate(msg.createdAt) : 'щойно'}
</span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsers.has(selectedUser.id) && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Написати повідомлення... (Enter для відправки)"
                    rows={1}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32"
                    style={{ minHeight: '48px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}