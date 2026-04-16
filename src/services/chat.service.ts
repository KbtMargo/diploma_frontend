import api from '@/lib/axios';

export const chatService = {
  async getConversations() {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  async getConversation(userId: string, page = 1) {
    const response = await api.get(`/chat/conversations/${userId}?page=${page}`);
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get('/chat/unread');
    return response.data;
  },
};