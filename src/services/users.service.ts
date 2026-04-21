import api from '@/lib/axios';
import { User } from '@/types';

export const usersService = {
  async getProfile(): Promise<User> {
    const response = await api.get('/users/profile');
    return response.data;
  },

  async updateProfile(data: Partial<User> & { skillIds?: string[] }) {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  async getResume() {
    const response = await api.get('/users/resume');
    return response.data;
  },

  async updateResume(data: any) {
    const response = await api.put('/users/resume', data);
    return response.data;
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadResumeFile(file: File) {
    const formData = new FormData();
    formData.append('resume', file);
    const response = await api.post('/users/resume-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getStatistics() {
    const response = await api.get('/users/statistics');
    return response.data;
  },

  async getSavedJobs() {
    const response = await api.get('/users/saved-jobs');
    return response.data;
  },
};