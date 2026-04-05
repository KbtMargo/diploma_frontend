import api from '@/lib/axios';
import { Job, PaginatedResponse } from '@/types';

export const jobsService = {
  async getEmployerJobs(page = 1, limit = 10) {
    const response = await api.get<PaginatedResponse<Job>>(
      `/jobs/employer/${await getEmployerId()}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async createJob(data: Partial<Job>) {
    const response = await api.post('/jobs', data);
    return response.data;
  },

  async updateJob(id: string, data: Partial<Job>) {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data;
  },

  async deleteJob(id: string) {
    await api.delete(`/jobs/${id}`);
  },

  async updateJobStatus(id: string, status: string) {
    const response = await api.put(`/jobs/${id}/status`, { status });
    return response.data;
  },
};

async function getEmployerId(): Promise<string> {
  const response = await api.get('/users/profile');
  return response.data.id;
}