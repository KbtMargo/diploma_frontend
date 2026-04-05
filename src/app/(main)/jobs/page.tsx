'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, Filter, X, ChevronDown } from 'lucide-react';
import { Job, PaginatedResponse } from '@/types';
import { JOB_TYPES, EXPERIENCE_LEVELS, WORK_FORMATS } from '@/lib/constants';
import { formatSalary, formatRelativeDate } from '@/lib/utils';
import api from '@/lib/axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    country: '',
    city: '',
    jobType: '',
    experienceLevel: '',
    workFormat: '',
    salaryMin: '',
    salaryMax: '',
  });

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get<PaginatedResponse<Job>>(`/jobs?${params}`);
      setJobs(response.data.data);
      setTotal(response.data.meta.total);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, filters]);

  const clearFilters = () => {
    setFilters({ search: '', country: '', city: '', jobType: '', experienceLevel: '', workFormat: '', salaryMin: '', salaryMax: '' });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Вакансії та стажування</h1>
        <p className="text-gray-500">Знайдено {total} пропозицій</p>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Пошук вакансій..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.country}
              onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))}
              placeholder="Країна"
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}
          >
            <Filter size={18} />
            Фільтри
            {hasActiveFilters && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X size={16} /> Скинути
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <select
              value={filters.jobType}
              onChange={(e) => setFilters(f => ({ ...f, jobType: e.target.value }))}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Тип зайнятості</option>
              {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={filters.experienceLevel}
              onChange={(e) => setFilters(f => ({ ...f, experienceLevel: e.target.value }))}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Рівень досвіду</option>
              {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <select
              value={filters.workFormat}
              onChange={(e) => setFilters(f => ({ ...f, workFormat: e.target.value }))}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Формат роботи</option>
              {WORK_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <input
              value={filters.city}
              onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
              placeholder="Місто"
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        )}
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-500">Вакансій не знайдено</h3>
          <p className="text-gray-400 mt-2">Спробуйте змінити параметри пошуку</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {job.isUrgent && (
                        <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">Терміново</span>
                      )}
                      {job.isFeatured && (
                        <span className="bg-yellow-100 text-yellow-600 text-xs font-medium px-2 py-0.5 rounded-full">Топ</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {job.employer?.firstName} {job.employer?.lastName}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {job.city && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin size={14} /> {job.city}, {job.country}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Briefcase size={14} />
                        {JOB_TYPES.find(t => t.value === job.jobType)?.label || job.jobType}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-indigo-600">
                      {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(job.createdAt)}</p>
                  </div>
                </div>
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {job.requiredSkills.slice(0, 5).map(skill => (
                      <span key={skill.id} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 10 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors"
          >
            Назад
          </button>
          <span className="px-4 py-2 text-gray-600">
            {page} / {Math.ceil(total / 10)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 10)}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors"
          >
            Далі
          </button>
        </div>
      )}
    </div>
  );
}