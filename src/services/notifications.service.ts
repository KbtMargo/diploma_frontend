import api from '@/lib/axios';
import { Notification, PaginatedResponse } from '@/types';

export const notificationsService = {
  async getNotifications(page = 1, unreadOnly = false) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '20');
    if (unreadOnly) params.append('unreadOnly', 'true');
    const response = await api.get<PaginatedResponse<Notification>>(
      `/notifications?${params}`
    );
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    const data = response.data;
    return typeof data === 'number' ? data : (data?.count ?? 0);
  },

  async markAsRead(id: string) {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  async delete(id: string) {
    await api.delete(`/notifications/${id}`);
  },

  async deleteAll() {
    await api.delete('/notifications');
  },
};