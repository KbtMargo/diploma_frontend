import api from '@/lib/axios';
import { Application, PaginatedResponse } from '@/types';

export const applicationsService = {
  async getMyApplications(page = 1) {
    const response = await api.get<PaginatedResponse<Application>>(
      `/applications/my?page=${page}&limit=10`
    );
    return response.data;
  },

  async getEmployerApplications(page = 1, jobId?: string) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '10');
    if (jobId) params.append('jobId', jobId);
    const response = await api.get<PaginatedResponse<Application>>(
      `/applications/employer?${params}`
    );
    return response.data;
  },

  async updateStatus(id: string, status: string, employerNotes?: string) {
    const response = await api.put(`/applications/${id}/status`, {
      status,
      employerNotes,
    });
    return response.data;
  },

  async withdraw(id: string) {
    const response = await api.put(`/applications/${id}/withdraw`);
    return response.data;
  },
};