import api from '../lib/axios';
import { AuthTokens, User } from '../types';

export const authService = {
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthTokens> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async logout(refreshToken: string) {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string) {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const response = await api.post('/auth/change-password', { oldPassword, newPassword });
    return response.data;
  },

  async verifyEmail(token: string) {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  async resendVerification(email: string) {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },
};