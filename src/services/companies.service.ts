import api from '@/lib/axios';
import { Company, PaginatedResponse } from '@/types';

export const companiesService = {
  async getCompanies(page = 1, filters?: any) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '12');
    if (filters?.search) params.append('search', filters.search);
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.size) params.append('size', filters.size);
    const response = await api.get<PaginatedResponse<Company>>(`/companies?${params}`);
    return response.data;
  },

  async getCompany(id: string): Promise<Company> {
    const response = await api.get<Company>(`/companies/${id}`);
    return response.data;
  },

  async getMyCompany(): Promise<Company> {
    const response = await api.get<Company>('/companies/my');
    return response.data;
  },

  async createCompany(data: Partial<Company>) {
    const response = await api.post('/companies', data);
    return response.data;
  },

  async updateCompany(id: string, data: Partial<Company>) {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },

  async getReviews(id: string, page = 1) {
    const response = await api.get(`/companies/${id}/reviews?page=${page}&limit=10`);
    return response.data;
  },

  async addReview(id: string, data: any) {
    const response = await api.post(`/companies/${id}/reviews`, data);
    return response.data;
  },
};