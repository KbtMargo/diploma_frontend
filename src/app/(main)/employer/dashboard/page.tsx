'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Users, Eye, Plus, Edit2, Trash2,
  ChevronDown, X, Loader2, Check, Clock, AlertCircle,
  MessageCircle, UserCircle, Building,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Job, Application, Company } from '@/types';
import { ROUTES, JOB_TYPES, EXPERIENCE_LEVELS, WORK_FORMATS, APPLICATION_STATUSES, COMPANY_SIZES } from '@/lib/constants';
import { formatRelativeDate, formatSalary } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function EmployerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'company'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [stats, setStats] = useState({ totalJobs: 0, totalApplications: 0, totalViews: 0 });

  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '', shortDescription: '', description: '', website: '', industry: '', foundedYear: '', size: '',
  });

  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
    jobType: 'full_time',
    experienceLevel: 'junior',
    workFormat: 'office',
    country: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'USD',
    category: '',
    isSalaryNegotiable: false,
    isRemote: false,
    isUrgent: false,
    applicationDeadline: '',
  });

  useEffect(() => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    if (user?.role !== 'employer' && user?.role !== 'admin') {
      router.push(ROUTES.JOBS); return;
    }
    fetchData();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (activeTab === 'company') fetchMyCompany();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get(`/jobs/employer/${user?.id}?limit=100`),
        api.get('/applications/employer?limit=100'),
      ]);
      const jobsData = jobsRes.data.data || [];
      const appsData = appsRes.data.data || [];
      setJobs(jobsData);
      setApplications(appsData);
      setStats({
        totalJobs: jobsData.length,
        totalApplications: appsData.length,
        totalViews: jobsData.reduce((sum: number, j: Job) => sum + (j.views || 0), 0),
      });
    } catch (error) {
      toast.error('Помилка завантаження даних');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyCompany = async () => {
    setCompanyLoading(true);
    try {
      const res = await api.get('/companies/my');
      setMyCompany(res.data);
      setCompanyForm({
        name: res.data.name || '',
        shortDescription: res.data.shortDescription || '',
        description: res.data.description || '',
        website: res.data.website || '',
        industry: res.data.industry || '',
        foundedYear: res.data.foundedYear?.toString() || '',
        size: res.data.size || '',
      });
    } catch {
      setMyCompany(null);
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      await api.post('/companies', {
        ...companyForm,
        foundedYear: companyForm.foundedYear ? Number(companyForm.foundedYear) : undefined,
      });
      toast.success('Компанію створено! Очікуйте верифікації адміністратором.');
      setShowCompanyForm(false);
      fetchMyCompany();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка створення компанії');
    }
  };

  const handleUpdateCompany = async () => {
    if (!myCompany) return;
    try {
      await api.put(`/companies/${myCompany.id}`, {
        ...companyForm,
        foundedYear: companyForm.foundedYear ? Number(companyForm.foundedYear) : undefined,
      });
      toast.success('Дані компанії оновлено');
      setShowCompanyForm(false);
      fetchMyCompany();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка оновлення');
    }
  };

  const handleCreateJob = async () => {
    try {
      await api.post('/jobs', {
        ...jobForm,
        salaryMin: jobForm.salaryMin ? Number(jobForm.salaryMin) : undefined,
        salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : undefined,
      });
      toast.success('Вакансію створено!');
      setShowCreateJob(false);
      resetJobForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка створення');
    }
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;
    try {
      await api.put(`/jobs/${editingJob.id}`, {
        ...jobForm,
        salaryMin: jobForm.salaryMin ? Number(jobForm.salaryMin) : undefined,
        salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : undefined,
      });
      toast.success('Вакансію оновлено!');
      setEditingJob(null);
      resetJobForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка оновлення');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Видалити вакансію?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Вакансію видалено');
      fetchData();
    } catch {
      toast.error('Помилка видалення');
    }
  };

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      await api.put(`/applications/${appId}/status`, { status });
      toast.success('Статус оновлено');
      fetchData();
    } catch {
      toast.error('Помилка оновлення статусу');
    }
  };

  const startEdit = (job: Job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || '',
      description: job.description || '',
      requirements: job.requirements || '',
      responsibilities: job.responsibilities || '',
      benefits: job.benefits || '',
      jobType: job.jobType || 'full_time',
      experienceLevel: job.experienceLevel || 'junior',
      workFormat: job.workFormat || 'office',
      country: job.country || '',
      city: job.city || '',
      salaryMin: job.salaryMin?.toString() || '',
      salaryMax: job.salaryMax?.toString() || '',
      salaryCurrency: job.salaryCurrency || 'USD',
      category: job.category || '',
      isSalaryNegotiable: job.isSalaryNegotiable || false,
      isRemote: job.isRemote || false,
      isUrgent: job.isUrgent || false,
      applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().split('T')[0] : '',
    });
  };

  const resetJobForm = () => {
    setJobForm({
      title: '', description: '', requirements: '', responsibilities: '',
      benefits: '', jobType: 'full_time', experienceLevel: 'junior',
      workFormat: 'office', country: '', city: '', salaryMin: '',
      salaryMax: '', salaryCurrency: 'USD', category: '',
      isSalaryNegotiable: false, isRemote: false, isUrgent: false,
      applicationDeadline: '',
    });
  };

  const filteredApplications = selectedJobId
    ? applications.filter(a => a.jobId === selectedJobId)
    : applications;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Кабінет роботодавця</h1>
          <p className="text-gray-500 mt-1">Керуйте вакансіями та заявками</p>
        </div>
        <button
          onClick={() => setShowCreateJob(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} /> Нова вакансія
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Вакансії', value: stats.totalJobs, icon: Briefcase, color: 'indigo' },
          { label: 'Заявки', value: stats.totalApplications, icon: Users, color: 'green' },
          { label: 'Перегляди', value: stats.totalViews, icon: Eye, color: 'purple' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className={`w-10 h-10 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={`text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-gray-500 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'jobs' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Вакансії ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'applications' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Заявки ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'company' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Компанія
        </button>
      </div>

      {/* Jobs tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Вакансій ще немає</h3>
              <button
                onClick={() => setShowCreateJob(true)}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Створити першу вакансію
              </button>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{job.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        job.status === 'active' ? 'bg-green-100 text-green-600' :
                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {job.status === 'active' ? 'Активна' : job.status === 'pending' ? 'На модерації' : job.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span>{job.city}, {job.country}</span>
                      <span>{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                      <span>{job.applicationsCount || 0} заявок</span>
                      <span>{job.views || 0} переглядів</span>
                      <span>{formatRelativeDate(job.createdAt)}</span>
                      {job.applicationDeadline && (
                        <span className={`flex items-center gap-1 ${new Date(job.applicationDeadline) < new Date() ? 'text-red-500' : 'text-orange-500'}`}>
                          Дедлайн: {new Date(job.applicationDeadline).toLocaleDateString('uk-UA')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(job)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Applications tab */}
      {activeTab === 'applications' && (
        <div>
          {/* Filter by job */}
          <div className="mb-4">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Всі вакансії</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
                <Users size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500">Заявок ще немає</h3>
              </div>
            ) : (
              filteredApplications.map(app => (
                <div key={app.id} className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {app.applicant?.firstName} {app.applicant?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{app.applicant?.email}</p>
                      <p className="text-sm text-indigo-600 mt-1">{app.job?.title}</p>
                      {app.coverLetter && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{app.coverLetter}</p>
                      )}
                      {app.expectedSalary && (
                        <p className="text-sm text-gray-500 mt-1">
                          Очікувана зарплата: {app.expectedSalary} {app.expectedSalaryCurrency}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{formatRelativeDate(app.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium bg-${APPLICATION_STATUSES[app.status]?.color}-100 text-${APPLICATION_STATUSES[app.status]?.color}-700`}>
                        {APPLICATION_STATUSES[app.status]?.label || app.status}
                      </span>
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {Object.entries(APPLICATION_STATUSES).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <div className="flex gap-1.5 mt-1">
                        {app.applicant?.id && (
                          <Link
                            href={`/users/${app.applicant.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <UserCircle size={13} /> Профіль
                          </Link>
                        )}
                        {app.applicant?.id && (
                          <Link
                            href={`/chat?userId=${app.applicant.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <MessageCircle size={13} /> Написати
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Company tab */}
      {activeTab === 'company' && (
        <div>
          {companyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-indigo-600" />
            </div>
          ) : myCompany ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <Building size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{myCompany.name}</h2>
                      {myCompany.isVerified && (
                        <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> Верифіковано
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        myCompany.status === 'verified' || myCompany.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {myCompany.status === 'verified' ? 'Верифіковано' :
                         myCompany.status === 'active' ? 'Активна' : 'На розгляді'}
                      </span>
                      {myCompany.status === 'pending' && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> Очікує верифікації адміністратором
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCompanyForm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={16} /> Редагувати
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {myCompany.industry && (
                  <div><p className="text-xs text-gray-400 mb-1">Галузь</p><p className="text-sm text-gray-700">{myCompany.industry}</p></div>
                )}
                {myCompany.size && (
                  <div><p className="text-xs text-gray-400 mb-1">Розмір</p><p className="text-sm text-gray-700">{COMPANY_SIZES.find(s => s.value === myCompany.size)?.label || myCompany.size}</p></div>
                )}
                {myCompany.foundedYear && (
                  <div><p className="text-xs text-gray-400 mb-1">Рік заснування</p><p className="text-sm text-gray-700">{myCompany.foundedYear}</p></div>
                )}
                {myCompany.website && (
                  <div><p className="text-xs text-gray-400 mb-1">Сайт</p><a href={myCompany.website} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">{myCompany.website}</a></div>
                )}
              </div>

              {myCompany.shortDescription && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-1">Короткий опис</p>
                  <p className="text-sm text-gray-700">{myCompany.shortDescription}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <Building size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">У вас ще немає профілю компанії</h3>
              <p className="text-sm text-gray-400 mt-2 mb-6">Створіть профіль компанії. Після верифікації адміністратором він з'явиться в публічному каталозі.</p>
              <button
                onClick={() => setShowCompanyForm(true)}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} className="inline mr-2" />Створити компанію
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Company Modal */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {myCompany ? 'Редагувати компанію' : 'Нова компанія'}
              </h2>
              <button onClick={() => setShowCompanyForm(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Назва компанії *</label>
                <input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Назва вашої компанії"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Короткий опис</label>
                <input
                  value={companyForm.shortDescription}
                  onChange={(e) => setCompanyForm(f => ({ ...f, shortDescription: e.target.value }))}
                  placeholder="Одне речення про компанію"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Повний опис</label>
                <textarea
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Галузь</label>
                  <input
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm(f => ({ ...f, industry: e.target.value }))}
                    placeholder="IT, Фінанси..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Рік заснування</label>
                  <input
                    type="number"
                    value={companyForm.foundedYear}
                    onChange={(e) => setCompanyForm(f => ({ ...f, foundedYear: e.target.value }))}
                    placeholder="2010"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Розмір</label>
                  <select
                    value={companyForm.size}
                    onChange={(e) => setCompanyForm(f => ({ ...f, size: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">Оберіть</option>
                    {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сайт</label>
                  <input
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowCompanyForm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={myCompany ? handleUpdateCompany : handleCreateCompany}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {myCompany ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Job Modal */}
      {(showCreateJob || editingJob) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingJob ? 'Редагувати вакансію' : 'Нова вакансія'}
              </h2>
              <button
                onClick={() => { setShowCreateJob(false); setEditingJob(null); resetJobForm(); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Назва вакансії *</label>
                <input
                  value={jobForm.title}
                  onChange={(e) => setJobForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Junior JavaScript Developer"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Опис *</label>
                <textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип зайнятості</label>
                  <select
                    value={jobForm.jobType}
                    onChange={(e) => setJobForm(f => ({ ...f, jobType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Рівень досвіду</label>
                  <select
                    value={jobForm.experienceLevel}
                    onChange={(e) => setJobForm(f => ({ ...f, experienceLevel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Формат роботи</label>
                  <select
                    value={jobForm.workFormat}
                    onChange={(e) => setJobForm(f => ({ ...f, workFormat: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    {WORK_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Країна</label>
                  <input
                    value={jobForm.country}
                    onChange={(e) => setJobForm(f => ({ ...f, country: e.target.value }))}
                    placeholder="Ukraine"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Місто</label>
                  <input
                    value={jobForm.city}
                    onChange={(e) => setJobForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Київ"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата від</label>
                  <input
                    type="number"
                    value={jobForm.salaryMin}
                    onChange={(e) => setJobForm(f => ({ ...f, salaryMin: e.target.value }))}
                    placeholder="1000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата до</label>
                  <input
                    type="number"
                    value={jobForm.salaryMax}
                    onChange={(e) => setJobForm(f => ({ ...f, salaryMax: e.target.value }))}
                    placeholder="2000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Валюта</label>
                  <select
                    value={jobForm.salaryCurrency}
                    onChange={(e) => setJobForm(f => ({ ...f, salaryCurrency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="UAH">UAH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Вимоги</label>
                <textarea
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm(f => ({ ...f, requirements: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Обов'язки</label>
                <textarea
                  value={jobForm.responsibilities}
                  onChange={(e) => setJobForm(f => ({ ...f, responsibilities: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobForm.isUrgent}
                    onChange={(e) => setJobForm(f => ({ ...f, isUrgent: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Термінова</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobForm.isRemote}
                    onChange={(e) => setJobForm(f => ({ ...f, isRemote: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Віддалена робота</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дедлайн подачі заявок</label>
                <input
                  type="date"
                  value={jobForm.applicationDeadline}
                  onChange={(e) => setJobForm(f => ({ ...f, applicationDeadline: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => { setShowCreateJob(false); setEditingJob(null); resetJobForm(); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={editingJob ? handleUpdateJob : handleCreateJob}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingJob ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}