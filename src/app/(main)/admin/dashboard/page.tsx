'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Briefcase, Building, BarChart3, Shield,
  TrendingUp, Eye, CheckCircle, XCircle, Clock,
  Search, Filter, MoreVertical, Ban, UserCheck,
  ChevronLeft, ChevronRight, Loader2, AlertTriangle,
  Star, Activity
} from 'lucide-react';
import api from '@/lib/axios';
import { User, Job, Company, PaginatedResponse } from '@/types';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { formatRelativeDate } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend
} from 'recharts';

type Tab = 'dashboard' | 'users' | 'jobs' | 'companies' | 'analytics' | 'logs';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
const [auditLogs, setAuditLogs] = useState<any[]>([]);
const [logsTotal, setLogsTotal] = useState(0);
const [logsPage, setLogsPage] = useState(1);
const [analyticsData, setAnalyticsData] = useState<any>(null);
  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0, totalJobs: 0, totalCompanies: 0, totalApplications: 0,
    activeJobs: 0, pendingJobs: 0, verifiedCompanies: 0, newUsersToday: 0,
  });

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRole, setUsersRole] = useState('');

  // Jobs
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsSearch, setJobsSearch] = useState('');

  // Companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [companiesPage, setCompaniesPage] = useState(1);

  useEffect(() => {
    // Перевірка ролі
    const checkAdmin = async () => {
      try {
        const res = await api.get('/users/profile');
        if (res.data.role !== 'admin') {
          router.push('/');
          return;
        }
        fetchDashboard();
      } catch {
        router.push('/auth/login');
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, usersPage, usersSearch, usersRole]);

  useEffect(() => {
    if (activeTab === 'jobs') fetchJobs();
  }, [activeTab, jobsPage, jobsSearch]);

  useEffect(() => {
    if (activeTab === 'companies') fetchCompanies();
  }, [activeTab, companiesPage]);

  useEffect(() => {
  if (activeTab === 'logs') fetchLogs();
}, [activeTab, logsPage]);

useEffect(() => {
  if (activeTab === 'analytics') fetchAnalytics();
}, [activeTab]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const [usersRes, jobsRes, companiesRes, appsRes] = await Promise.all([
        api.get('/admin/users?limit=1'),
        api.get('/admin/jobs?limit=1'),
        api.get('/admin/companies?limit=1'),
        api.get('/applications/statistics').catch(() => ({ data: { total: 0 } })),
      ]);

      const allJobs = await api.get('/admin/jobs?limit=1000').catch(() => ({ data: { data: [] } }));
      const jobsData = allJobs.data.data || [];
      const activeJobs = jobsData.filter((j: Job) => j.status === 'active').length;
      const pendingJobs = jobsData.filter((j: Job) => j.status === 'pending').length;

      const allCompanies = await api.get('/admin/companies?limit=1000').catch(() => ({ data: { data: [] } }));
      const companiesData = allCompanies.data.data || [];
      const verifiedCompanies = companiesData.filter((c: Company) => c.isVerified).length;

      setStats({
        totalUsers: usersRes.data.meta?.total || 0,
        totalJobs: jobsRes.data.meta?.total || 0,
        totalCompanies: companiesRes.data.meta?.total || 0,
        totalApplications: appsRes.data.total || 0,
        activeJobs,
        pendingJobs,
        verifiedCompanies,
        newUsersToday: 0,
      });
    } catch (error) {
      toast.error('Помилка завантаження');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', usersPage.toString());
      params.append('limit', '10');
      if (usersSearch) params.append('search', usersSearch);
      if (usersRole) params.append('role', usersRole);
      const res = await api.get<PaginatedResponse<User>>(`/admin/users?${params}`);
      setUsers(res.data.data);
      setUsersTotal(res.data.meta.total);
    } catch {
      toast.error('Помилка завантаження користувачів');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', jobsPage.toString());
      params.append('limit', '10');
      if (jobsSearch) params.append('search', jobsSearch);
      const res = await api.get<PaginatedResponse<Job>>(`/admin/jobs?${params}`);
      setJobs(res.data.data);
      setJobsTotal(res.data.meta.total);
    } catch {
      toast.error('Помилка завантаження вакансій');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', companiesPage.toString());
      params.append('limit', '10');
      const res = await api.get<PaginatedResponse<Company>>(`/admin/companies?${params}`);
      setCompanies(res.data.data);
      setCompaniesTotal(res.data.meta.total);
    } catch {
      toast.error('Помилка завантаження компаній');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockUser = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/admin/users/${id}/${isActive ? 'block' : 'unblock'}`);
      toast.success(isActive ? 'Користувача заблоковано' : 'Користувача розблоковано');
      fetchUsers();
    } catch {
      toast.error('Помилка');
    }
  };

  const handleChangeRole = async (id: string, role: string) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      toast.success('Роль змінено');
      fetchUsers();
    } catch {
      toast.error('Помилка');
    }
  };

  const handleModerateJob = async (id: string, status: string) => {
    try {
      await api.put(`/admin/jobs/${id}/moderate`, { status });
      toast.success(status === 'active' ? 'Вакансію схвалено' : 'Вакансію відхилено');
      fetchJobs();
    } catch {
      toast.error('Помилка');
    }
  };

  const handleVerifyCompany = async (id: string) => {
    try {
      await api.post(`/admin/companies/${id}/verify`);
      toast.success('Компанію верифіковано');
      fetchCompanies();
    } catch {
      toast.error('Помилка');
    }
  };

  const fetchLogs = async () => {
  setIsLoading(true);
  try {
    const res = await api.get(`/admin/audit-logs?page=${logsPage}&limit=20`);
    setAuditLogs(res.data.data || []);
    setLogsTotal(res.data.meta?.total || 0);
  } catch {
    toast.error('Помилка завантаження логів');
  } finally {
    setIsLoading(false);
  }
};

const fetchAnalytics = async () => {
  setIsLoading(true);
  try {
    const [jobsRes, usersRes] = await Promise.all([
      api.get('/admin/jobs?limit=1000'),
      api.get('/admin/users?limit=1000'),
    ]);

    const jobsData = jobsRes.data.data || [];
    const usersData = usersRes.data.data || [];

    // Групуємо вакансії по категоріях
    const byCategory: Record<string, number> = {};
    jobsData.forEach((j: Job) => {
      const cat = j.category || 'Інше';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Групуємо по типу зайнятості
    const byJobType: Record<string, number> = {};
    jobsData.forEach((j: Job) => {
      byJobType[j.jobType] = (byJobType[j.jobType] || 0) + 1;
    });

    // Групуємо користувачів по ролях
    const byRole: Record<string, number> = {};
    usersData.forEach((u: User) => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    });

    // Активні vs неактивні вакансії
    const jobsByStatus = [
      { name: 'Активні', value: jobsData.filter((j: Job) => j.status === 'active').length },
      { name: 'На модерації', value: jobsData.filter((j: Job) => j.status === 'pending').length },
      { name: 'Відхилені', value: jobsData.filter((j: Job) => j.status === 'rejected').length },
      { name: 'Неактивні', value: jobsData.filter((j: Job) => j.status === 'inactive').length },
    ].filter(s => s.value > 0);

    setAnalyticsData({
      byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      byJobType: Object.entries(byJobType).map(([name, value]) => ({
        name: { full_time: 'Повна', part_time: 'Часткова', internship: 'Стажування', remote: 'Віддалено', freelance: 'Фріланс', contract: 'Контракт' }[name] || name,
        value
      })),
      byRole: Object.entries(byRole).map(([name, value]) => ({
        name: { job_seeker: 'Шукачі', employer: 'Роботодавці', admin: 'Адміни' }[name] || name,
        value
      })),
      jobsByStatus,
    });
  } catch {
    toast.error('Помилка аналітики');
  } finally {
    setIsLoading(false);
  }
};

const TABS = [
  { id: 'dashboard', label: 'Дашборд', icon: BarChart3 },
  { id: 'analytics', label: 'Аналітика', icon: TrendingUp },
  { id: 'users', label: 'Користувачі', icon: Users },
  { id: 'jobs', label: 'Вакансії', icon: Briefcase },
  { id: 'companies', label: 'Компанії', icon: Building },
  { id: 'logs', label: 'Аудит логи', icon: Activity },
];

  const STAT_CARDS = [
    { label: 'Користувачів', value: stats.totalUsers, icon: Users, color: 'blue', sub: 'всього' },
    { label: 'Вакансій', value: stats.totalJobs, icon: Briefcase, color: 'indigo', sub: `${stats.activeJobs} активних` },
    { label: 'Компаній', value: stats.totalCompanies, icon: Building, color: 'purple', sub: `${stats.verifiedCompanies} верифіковано` },
    { label: 'На модерації', value: stats.pendingJobs, icon: Clock, color: 'yellow', sub: 'вакансій' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Адміністративна панель</h1>
            <p className="text-xs text-gray-500">Керування платформою</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STAT_CARDS.map(card => (
                <div key={card.label} className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    card.color === 'blue' ? 'bg-blue-100' :
                    card.color === 'indigo' ? 'bg-indigo-100' :
                    card.color === 'purple' ? 'bg-purple-100' :
                    'bg-yellow-100'
                  }`}>
                    <card.icon size={20} className={
                      card.color === 'blue' ? 'text-blue-600' :
                      card.color === 'indigo' ? 'text-indigo-600' :
                      card.color === 'purple' ? 'text-purple-600' :
                      'text-yellow-600'
                    } />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Швидкі дії</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Модерувати вакансії', count: stats.pendingJobs, tab: 'jobs', color: 'yellow' },
                  { label: 'Верифікувати компанії', count: stats.totalCompanies - stats.verifiedCompanies, tab: 'companies', color: 'purple' },
                  { label: 'Керувати користувачами', count: stats.totalUsers, tab: 'users', color: 'blue' },
                  { label: 'Всі вакансії', count: stats.totalJobs, tab: 'jobs', color: 'indigo' },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => setActiveTab(action.tab as Tab)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm ${
                      action.color === 'yellow' ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300' :
                      action.color === 'purple' ? 'border-purple-200 bg-purple-50 hover:border-purple-300' :
                      action.color === 'blue' ? 'border-blue-200 bg-blue-50 hover:border-blue-300' :
                      'border-indigo-200 bg-indigo-50 hover:border-indigo-300'
                    }`}
                  >
                    <p className={`text-2xl font-bold ${
                      action.color === 'yellow' ? 'text-yellow-700' :
                      action.color === 'purple' ? 'text-purple-700' :
                      action.color === 'blue' ? 'text-blue-700' :
                      'text-indigo-700'
                    }`}>{action.count}</p>
                    <p className="text-sm text-gray-600 mt-1">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-48 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={usersSearch}
                  onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
                  placeholder="Пошук користувачів..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={usersRole}
                onChange={(e) => { setUsersRole(e.target.value); setUsersPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Всі ролі</option>
                <option value="job_seeker">Шукач</option>
                <option value="employer">Роботодавець</option>
                <option value="admin">Адмін</option>
              </select>
              <span className="px-3 py-2 text-sm text-gray-500">Всього: {usersTotal}</span>
            </div>

            {/* Users table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Користувач</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Роль</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-700 shrink-0">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border font-medium focus:outline-none cursor-pointer ${
                              user.role === 'admin' ? 'bg-red-50 border-red-200 text-red-700' :
                              user.role === 'employer' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                              'bg-blue-50 border-blue-200 text-blue-700'
                            }`}
                          >
                            <option value="job_seeker">Шукач</option>
                            <option value="employer">Роботодавець</option>
                            <option value="admin">Адмін</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                            user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.isActive
                              ? <><CheckCircle size={10} /> Активний</>
                              : <><XCircle size={10} /> Заблокований</>
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {formatRelativeDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleBlockUser(user.id, user.isActive)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              user.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {user.isActive ? <><Ban size={12} className="inline mr-1" />Блок</> : <><UserCheck size={12} className="inline mr-1" />Розблок</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <Pagination page={usersPage} total={usersTotal} limit={10} onChange={setUsersPage} />
          </div>
        )}

        {/* JOBS TAB */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-48 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={jobsSearch}
                  onChange={(e) => { setJobsSearch(e.target.value); setJobsPage(1); }}
                  placeholder="Пошук вакансій..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <span className="px-3 py-2 text-sm text-gray-500">Всього: {jobsTotal}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Вакансія</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Роботодавець</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                          <p className="text-xs text-gray-400">{job.city}, {job.country}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {job.employer?.firstName} {job.employer?.lastName}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            job.status === 'active' ? 'bg-green-100 text-green-700' :
                            job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            job.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {job.status === 'active' ? 'Активна' :
                             job.status === 'pending' ? 'На модерації' :
                             job.status === 'rejected' ? 'Відхилено' : job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {formatRelativeDate(job.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {job.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleModerateJob(job.id, 'active')}
                                className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <CheckCircle size={12} className="inline mr-1" />Схвалити
                              </button>
                              <button
                                onClick={() => handleModerateJob(job.id, 'rejected')}
                                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <XCircle size={12} className="inline mr-1" />Відхилити
                              </button>
                            </div>
                          )}
                          {job.status === 'active' && (
                            <button
                              onClick={() => handleModerateJob(job.id, 'inactive')}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Деактивувати
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination page={jobsPage} total={jobsTotal} limit={10} onChange={setJobsPage} />
          </div>
        )}

        {/* COMPANIES TAB */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">Всього компаній: {companiesTotal}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Компанія</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Галузь</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Вакансій</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {companies.map(company => (
                      <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <Building size={16} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{company.name}</p>
                              <p className="text-xs text-gray-400">{company.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{company.industry || '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              company.status === 'active' || company.status === 'verified'
                                ? 'bg-green-100 text-green-700'
                                : company.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {company.status === 'verified' ? 'Верифіковано' :
                               company.status === 'active' ? 'Активна' :
                               company.status === 'pending' ? 'На розгляді' : company.status}
                            </span>
                            {company.isVerified && (
                              <CheckCircle size={14} className="text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {company.totalJobsPosted || 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!company.isVerified && (
                            <button
                              onClick={() => handleVerifyCompany(company.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <CheckCircle size={12} className="inline mr-1" />Верифікувати
                            </button>
                          )}
                          {company.isVerified && (
                            <span className="text-xs text-green-600 font-medium">✓ Верифіковано</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination page={companiesPage} total={companiesTotal} limit={10} onChange={setCompaniesPage} />
          </div>
        )}

        {/* ANALYTICS TAB */}
{activeTab === 'analytics' && (
  <div className="space-y-6">
    {isLoading ? (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="animate-spin text-indigo-600" />
      </div>
    ) : !analyticsData ? (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-gray-400">
        Немає даних для аналітики
      </div>
    ) : (
      <>
        {/* Row 1: Jobs by category + Jobs by status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By category */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Вакансії за категоріями</h3>
            {analyticsData.byCategory.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Немає даних</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.byCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Вакансій" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* By status */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Статуси вакансій</h3>
            {analyticsData.jobsByStatus.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Немає даних</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analyticsData.jobsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {analyticsData.jobsByStatus.map((_: any, index: number) => (
                      <Cell
                        key={index}
                        fill={['#6366f1', '#f59e0b', '#ef4444', '#9ca3af'][index % 4]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 2: Jobs by type + Users by role */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By job type */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Типи зайнятості</h3>
            {analyticsData.byJobType.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Немає даних</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analyticsData.byJobType}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Вакансій" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Users by role */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Користувачі за ролями</h3>
            {analyticsData.byRole.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Немає даних</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analyticsData.byRole}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analyticsData.byRole.map((_: any, index: number) => (
                      <Cell
                        key={index}
                        fill={['#6366f1', '#10b981', '#f59e0b'][index % 3]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </>
    )}
  </div>
)}

{/* LOGS TAB */}
{activeTab === 'logs' && (
  <div className="space-y-4">
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-between items-center">
      <span className="text-sm text-gray-500">Всього записів: {logsTotal}</span>
    </div>

    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <Activity size={32} className="mx-auto mb-3 text-gray-300" />
          <p>Логів ще немає</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дія</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Користувач</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ресурс</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Час</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {auditLogs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    log.action?.includes('DELETE') ? 'bg-red-100 text-red-700' :
                    log.action?.includes('CREATE') ? 'bg-green-100 text-green-700' :
                    log.action?.includes('UPDATE') ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {log.action || '—'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {log.user?.firstName} {log.user?.lastName}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">
                {log.entityType ? `${log.entityType} #${log.entityId?.slice(0, 8)}` : '—'}
                </td>
                <td className="px-6 py-3 text-xs text-gray-400 font-mono">
                  {log.ipAddress || '—'}
                </td>
                <td className="px-6 py-3 text-xs text-gray-400">
                  {formatRelativeDate(log.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>

    <Pagination page={logsPage} total={logsTotal} limit={20} onChange={setLogsPage} />
  </div>
)}
      </div>
    </div>
  );
}

function Pagination({ page, total, limit, onChange }: {
  page: number; total: number; limit: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-6 py-3">
      <p className="text-sm text-gray-500">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} з {total}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-indigo-300 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-indigo-300 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}