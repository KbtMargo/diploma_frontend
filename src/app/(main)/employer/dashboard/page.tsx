'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Users, Plus, Edit2, Trash2,
  X, Loader2, Check, Clock,
  MessageCircle, UserCircle, Building, Copy,
  StickyNote, BarChart3, GraduationCap, MapPin,
  LayoutList, Kanban,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Job, Application, Company, Skill, User } from '@/types';
import {
  ROUTES, JOB_TYPES, EXPERIENCE_LEVELS, WORK_FORMATS,
  APPLICATION_STATUSES, COMPANY_SIZES, JOB_LANGUAGES, JOB_CATEGORIES,
} from '@/lib/constants';
import { formatRelativeDate, formatSalary } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ─── Kanban config ────────────────────────────────────────────────────────────

const KANBAN_COLS = [
  { status: 'pending',             label: 'Нові',       hdr: 'bg-gray-100 text-gray-700',     col: 'bg-gray-50'    },
  { status: 'reviewed',            label: 'Перегляд',   hdr: 'bg-blue-100 text-blue-700',     col: 'bg-blue-50'    },
  { status: 'shortlisted',         label: 'Відібрано',  hdr: 'bg-purple-100 text-purple-700', col: 'bg-purple-50'  },
  { status: 'interview_scheduled', label: 'Співбесіда', hdr: 'bg-yellow-100 text-yellow-700', col: 'bg-yellow-50'  },
  { status: 'offered',             label: 'Оффер',      hdr: 'bg-green-100 text-green-700',   col: 'bg-green-50'   },
  { status: 'rejected',            label: 'Відмова',    hdr: 'bg-red-100 text-red-700',       col: 'bg-red-50'     },
];

const STATUS_TO_COL: Record<string, string> = {
  pending:             'pending',
  reviewed:            'reviewed',
  shortlisted:         'shortlisted',
  interview_scheduled: 'interview_scheduled',
  interviewed:         'interview_scheduled',
  offered:             'offered',
  accepted:            'offered',
  rejected:            'rejected',
  withdrawn:           'rejected',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcMatch(candidate: User, job: Job): number {
  if (!job.requiredSkills?.length || !candidate.skills?.length) return 0;
  const req = new Set(job.requiredSkills.map(s => s.id));
  return Math.round((candidate.skills.filter(s => req.has(s.id)).length / job.requiredSkills.length) * 100);
}

function MatchBadge({ score }: { score: number }) {
  if (score === 0) return null;
  const cls = score >= 70
    ? 'bg-green-100 text-green-700'
    : score >= 40
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-500';
  return <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{score}%</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmployerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Core
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'company' | 'candidates'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalJobs: 0, totalApplications: 0, totalViews: 0 });

  // Job CRUD
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [jobForm, setJobForm] = useState({
    title: '', description: '', requirements: '', responsibilities: '', benefits: '',
    jobType: 'full_time', experienceLevel: 'junior', workFormat: 'office',
    country: '', city: '', salaryMin: '', salaryMax: '', salaryCurrency: 'USD',
    category: '', isSalaryNegotiable: false, isRemote: false, isUrgent: false,
    applicationDeadline: '', requiredLanguages: [] as string[], skillIds: [] as string[],
  });

  // Company
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '', shortDescription: '', description: '', website: '', industry: '', foundedYear: '', size: '',
  });

  // Candidates
  const [candidates, setCandidates] = useState<User[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesTotal, setCandidatesTotal] = useState(0);
  const [candidateFilters, setCandidateFilters] = useState({
    search: '', country: '', city: '', languages: [] as string[],
  });

  // ── Feature state ──
  const [appsView, setAppsView] = useState<'kanban' | 'list'>('kanban');
  const [selectedJobId, setSelectedJobId] = useState('');
  // Kanban DnD
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  // Notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  // Candidate slide-over
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Job analytics
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    if (user?.role !== 'employer' && user?.role !== 'admin') { router.push(ROUTES.JOBS); return; }
    fetchData();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (activeTab === 'company') fetchMyCompany();
    if (activeTab === 'candidates') searchCandidates();
  }, [activeTab]);

  // ─── Data fetching ───────────────────────────────────────────────────────────

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
        totalViews: jobsData.reduce((s: number, j: Job) => s + (j.views || 0), 0),
      });
    } catch { toast.error('Помилка завантаження даних'); }
    finally { setIsLoading(false); }
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
    } catch { setMyCompany(null); }
    finally { setCompanyLoading(false); }
  };

  const fetchSkills = async () => {
    try {
      const res = await api.get('/skills?limit=200');
      setAvailableSkills(res.data.data || res.data || []);
    } catch {}
  };

  const searchCandidates = async (overrides?: typeof candidateFilters) => {
    setCandidatesLoading(true);
    const f = overrides ?? candidateFilters;
    try {
      const params = new URLSearchParams();
      if (f.search)   params.append('search', f.search);
      if (f.country)  params.append('country', f.country);
      if (f.city)     params.append('city', f.city);
      f.languages.forEach(l => params.append('languages', l));
      params.append('limit', '20');
      const res = await api.get(`/users/candidates?${params}`);
      setCandidates(res.data.data || []);
      setCandidatesTotal(res.data.meta?.total || 0);
    } catch { toast.error('Помилка пошуку кандидатів'); }
    finally { setCandidatesLoading(false); }
  };

  // ─── Job handlers ────────────────────────────────────────────────────────────

  const handleCreateJob = async () => {
    try {
      await api.post('/jobs', {
        ...jobForm,
        salaryMin: jobForm.salaryMin ? +jobForm.salaryMin : undefined,
        salaryMax: jobForm.salaryMax ? +jobForm.salaryMax : undefined,
      });
      toast.success('Вакансію створено!');
      setShowCreateJob(false); resetJobForm(); fetchData();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Помилка'); }
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;
    try {
      await api.put(`/jobs/${editingJob.id}`, {
        ...jobForm,
        salaryMin: jobForm.salaryMin ? +jobForm.salaryMin : undefined,
        salaryMax: jobForm.salaryMax ? +jobForm.salaryMax : undefined,
      });
      toast.success('Вакансію оновлено!');
      setEditingJob(null); resetJobForm(); fetchData();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Помилка'); }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Видалити вакансію?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Вакансію видалено'); fetchData();
    } catch { toast.error('Помилка видалення'); }
  };

  const handleDuplicateJob = (job: Job) => {
    fetchSkills();
    setEditingJob(null);
    setJobForm({
      title: `${job.title} (копія)`,
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
      isUrgent: false,
      applicationDeadline: '',
      requiredLanguages: job.requiredLanguages || [],
      skillIds: job.requiredSkills?.map(s => s.id) || [],
    });
    setShowCreateJob(true);
  };

  const startEdit = (job: Job) => {
    fetchSkills();
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
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().split('T')[0] : '',
      requiredLanguages: job.requiredLanguages || [],
      skillIds: job.requiredSkills?.map(s => s.id) || [],
    });
  };

  const resetJobForm = () => setJobForm({
    title: '', description: '', requirements: '', responsibilities: '', benefits: '',
    jobType: 'full_time', experienceLevel: 'junior', workFormat: 'office',
    country: '', city: '', salaryMin: '', salaryMax: '', salaryCurrency: 'USD',
    category: '', isSalaryNegotiable: false, isRemote: false, isUrgent: false,
    applicationDeadline: '', requiredLanguages: [], skillIds: [],
  });

  // ─── Kanban DnD ──────────────────────────────────────────────────────────────

  const handleDrop = async (newColStatus: string) => {
    if (!draggingId) return;
    const app = applications.find(a => a.id === draggingId);
    setDraggingId(null); setDragOverCol(null);
    if (!app || STATUS_TO_COL[app.status] === newColStatus) return;

    // Optimistic update
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newColStatus } : a));
    try {
      await api.put(`/applications/${app.id}/status`, { status: newColStatus });
      toast.success('Статус оновлено');
    } catch {
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: app.status } : a));
      toast.error('Помилка оновлення статусу');
    }
  };

  // ─── Notes ───────────────────────────────────────────────────────────────────

  const handleSaveNote = async (appId: string, currentStatus: string) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, employerNotes: noteText } : a));
    setEditingNoteId(null);
    try {
      await api.put(`/applications/${appId}/status`, { status: currentStatus, employerNotes: noteText });
      toast.success('Нотатку збережено');
    } catch { toast.error('Помилка збереження нотатки'); }
  };

  // ─── Company handlers ─────────────────────────────────────────────────────────

  const handleCreateCompany = async () => {
    try {
      await api.post('/companies', { ...companyForm, foundedYear: companyForm.foundedYear ? +companyForm.foundedYear : undefined });
      toast.success('Компанію створено! Очікуйте верифікації адміністратором.');
      setShowCompanyForm(false); fetchMyCompany();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Помилка'); }
  };

  const handleUpdateCompany = async () => {
    if (!myCompany) return;
    try {
      await api.put(`/companies/${myCompany.id}`, { ...companyForm, foundedYear: companyForm.foundedYear ? +companyForm.foundedYear : undefined });
      toast.success('Дані компанії оновлено');
      setShowCompanyForm(false); fetchMyCompany();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Помилка'); }
  };

  // ─── Candidate preview ───────────────────────────────────────────────────────

  const openPreview = async (userId: string) => {
    setPreviewLoading(true);
    setPreviewUser(null);
    try {
      const res = await api.get(`/users/${userId}`);
      setPreviewUser(res.data);
    } catch { toast.error('Помилка завантаження профілю'); }
    finally { setPreviewLoading(false); }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filteredApps = selectedJobId
    ? applications.filter(a => a.jobId === selectedJobId)
    : applications;

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 size={32} className="animate-spin text-indigo-600" />
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Кабінет роботодавця</h1>
          <p className="text-gray-500 mt-1">Керуйте вакансіями та заявками</p>
        </div>
        <button
          onClick={() => { fetchSkills(); setShowCreateJob(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} /> Нова вакансія
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit">
        {[
          { key: 'jobs',        label: `Вакансії (${jobs.length})`         },
          { key: 'applications',label: `Заявки (${applications.length})`   },
          { key: 'candidates',  label: 'Пошук кандидатів'                  },
          { key: 'company',     label: 'Компанія'                          },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          JOBS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Вакансій ще немає</h3>
              <button
                onClick={() => { fetchSkills(); setShowCreateJob(true); }}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Створити першу вакансію
              </button>
            </div>
          ) : (
            jobs.map(job => {
              const jobApps  = applications.filter(a => a.jobId === job.id);
              const selected = jobApps.filter(a =>
                ['shortlisted','interview_scheduled','interviewed','offered','accepted'].includes(a.status)
              ).length;
              const offered  = jobApps.filter(a => ['offered','accepted'].includes(a.status)).length;
              const isExp    = expandedJobId === job.id;

              return (
                <div key={job.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            job.status === 'active'  ? 'bg-green-100 text-green-600'   :
                            job.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                                       'bg-gray-100 text-gray-600'
                          }`}>
                            {job.status === 'active' ? 'Активна' : job.status === 'pending' ? 'На модерації' : job.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                          <span>{job.city}, {job.country}</span>
                          <span>{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                          <span>{job.applicationsCount || 0} заявок</span>
                          <span>{job.views || 0} переглядів</span>
                          <span>{formatRelativeDate(job.createdAt)}</span>
                          {job.applicationDeadline && (
                            <span className={new Date(job.applicationDeadline) < new Date() ? 'text-red-500' : 'text-orange-500'}>
                              Дедлайн: {new Date(job.applicationDeadline).toLocaleDateString('uk-UA')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        <button
                          onClick={() => setExpandedJobId(isExp ? null : job.id)}
                          className={`p-2 rounded-lg transition-colors ${isExp ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          title="Аналітика воронки"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          onClick={() => startEdit(job)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Редагувати"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDuplicateJob(job)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Дублювати вакансію"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Видалити"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Analytics funnel ── */}
                  {isExp && (
                    <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Воронка заявок</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: 'Перегляди',  value: job.views || 0,    bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
                          { label: 'Заявки',     value: jobApps.length,    bg: 'bg-blue-100',    text: 'text-blue-700'    },
                          { label: 'Відібрано',  value: selected,          bg: 'bg-purple-100',  text: 'text-purple-700'  },
                          { label: 'Оффер',      value: offered,           bg: 'bg-green-100',   text: 'text-green-700'   },
                        ].map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {i > 0 && <span className="text-gray-300 text-xl font-light">›</span>}
                            <div className={`${step.bg} ${step.text} rounded-xl px-4 py-2.5 text-center min-w-[80px]`}>
                              <p className="text-2xl font-bold leading-none">{step.value}</p>
                              <p className="text-xs mt-0.5 opacity-80">{step.label}</p>
                            </div>
                          </div>
                        ))}
                        {jobApps.length > 0 && (
                          <div className="ml-4 text-sm text-gray-400">
                            Конверсія: <span className="font-semibold text-gray-600">
                              {Math.round((selected / jobApps.length) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          APPLICATIONS TAB — KANBAN / LIST
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-5">
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Всі вакансії</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <span className="text-sm text-gray-400">{filteredApps.length} заявок</span>

            {/* View toggle */}
            <div className="ml-auto flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setAppsView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  appsView === 'kanban' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
                title="Kanban"
              >
                <Kanban size={15} /> Kanban
              </button>
              <button
                onClick={() => setAppsView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  appsView === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
                title="Список"
              >
                <LayoutList size={15} /> Список
              </button>
            </div>
          </div>

          {/* ── Kanban board ── */}
          {appsView === 'kanban' && <div className="flex gap-3 overflow-x-auto pb-4">
            {KANBAN_COLS.map(col => {
              const colApps = filteredApps.filter(a => STATUS_TO_COL[a.status] === col.status);
              const isOver  = dragOverCol === col.status;
              return (
                <div
                  key={col.status}
                  className={`flex-shrink-0 w-64 rounded-2xl transition-all duration-150 ${col.col} ${
                    isOver ? 'ring-2 ring-indigo-400 ring-offset-1' : ''
                  }`}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.status); }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null);
                  }}
                  onDrop={() => handleDrop(col.status)}
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-2xl ${col.hdr}`}>
                    <span className="text-xs font-semibold tracking-wide">{col.label}</span>
                    <span className="text-xs font-bold opacity-60 bg-white/50 px-1.5 py-0.5 rounded-full">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {colApps.map(app => {
                      const score        = app.applicant && app.job ? calcMatch(app.applicant, app.job) : 0;
                      const isEditNote   = editingNoteId === app.id;

                      return (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={() => setDraggingId(app.id)}
                          onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                          className={`bg-white rounded-xl border border-gray-200 p-3 select-none transition-all ${
                            draggingId === app.id
                              ? 'opacity-50 shadow-lg cursor-grabbing'
                              : 'cursor-grab hover:shadow-md hover:border-indigo-200'
                          }`}
                        >
                          {/* Name + match score */}
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <button
                              className="font-medium text-sm text-gray-900 text-left hover:text-indigo-600 transition-colors leading-tight"
                              onClick={() => app.applicant && openPreview(app.applicant.id)}
                            >
                              {app.applicant?.firstName} {app.applicant?.lastName}
                            </button>
                            <MatchBadge score={score} />
                          </div>

                          {/* Job */}
                          <p className="text-xs text-indigo-500 truncate">{app.job?.title}</p>

                          {/* Expected salary */}
                          {app.expectedSalary && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {app.expectedSalary} {app.expectedSalaryCurrency}
                            </p>
                          )}

                          {/* Date */}
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(app.createdAt)}</p>

                          {/* Existing note */}
                          {app.employerNotes && !isEditNote && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                              <p className="text-xs text-amber-800 line-clamp-2">{app.employerNotes}</p>
                            </div>
                          )}

                          {/* Note editor */}
                          {isEditNote && (
                            <div className="mt-2" onMouseDown={e => e.stopPropagation()}>
                              <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                rows={3}
                                placeholder="Нотатка про кандидата..."
                                className="w-full text-xs px-2 py-1.5 border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                autoFocus
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => handleSaveNote(app.id, app.status)}
                                  className="flex-1 text-xs py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  Зберегти
                                </button>
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Card footer */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => {
                                setNoteText(app.employerNotes || '');
                                setEditingNoteId(isEditNote ? null : app.id);
                              }}
                              className={`flex items-center gap-1 text-xs transition-colors ${
                                app.employerNotes ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-amber-500'
                              }`}
                              title="Нотатка"
                            >
                              <StickyNote size={12} />
                              <span>Нотатка</span>
                            </button>
                            <div className="flex gap-1">
                              {app.applicant?.id && (
                                <>
                                  <Link
                                    href={`/users/${app.applicant.id}`}
                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                    title="Профіль"
                                  >
                                    <UserCircle size={14} />
                                  </Link>
                                  <Link
                                    href={`/chat?userId=${app.applicant.id}`}
                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                    title="Написати"
                                  >
                                    <MessageCircle size={14} />
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty drop zone */}
                    {colApps.length === 0 && (
                      <div className={`flex items-center justify-center h-24 rounded-xl border-2 border-dashed transition-colors ${
                        isOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200'
                      }`}>
                        <p className="text-xs text-gray-300">Перетягніть сюди</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}

          {/* ── List view ── */}
          {appsView === 'list' && (
            <div className="space-y-3">
              {filteredApps.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
                  <Users size={48} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500">Заявок ще немає</h3>
                </div>
              ) : (
                filteredApps.map(app => {
                  const score      = app.applicant && app.job ? calcMatch(app.applicant, app.job) : 0;
                  const isEditNote = editingNoteId === app.id;
                  const colMeta    = KANBAN_COLS.find(c => c.status === STATUS_TO_COL[app.status]);
                  return (
                    <div key={app.id} className="bg-white rounded-2xl p-5 border border-gray-200">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: candidate info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <button
                              className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                              onClick={() => app.applicant && openPreview(app.applicant.id)}
                            >
                              {app.applicant?.firstName} {app.applicant?.lastName}
                            </button>
                            <MatchBadge score={score} />
                            {colMeta && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colMeta.hdr}`}>
                                {colMeta.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{app.applicant?.email}</p>
                          <p className="text-sm text-indigo-600 mt-0.5">{app.job?.title}</p>
                          {app.coverLetter && (
                            <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{app.coverLetter}</p>
                          )}
                          {app.expectedSalary && (
                            <p className="text-sm text-gray-400 mt-1">
                              Очікувана зарплата: {app.expectedSalary} {app.expectedSalaryCurrency}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1.5">{formatRelativeDate(app.createdAt)}</p>

                          {/* Note */}
                          {app.employerNotes && !isEditNote && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <p className="text-xs text-amber-800">{app.employerNotes}</p>
                            </div>
                          )}
                          {isEditNote && (
                            <div className="mt-2">
                              <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                rows={2}
                                placeholder="Нотатка..."
                                className="w-full text-sm px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                autoFocus
                              />
                              <div className="flex gap-2 mt-1.5">
                                <button
                                  onClick={() => handleSaveNote(app.id, app.status)}
                                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                  Зберегти
                                </button>
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                                >
                                  Скасувати
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <select
                            value={app.status}
                            onChange={async e => {
                              const newStatus = e.target.value;
                              setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
                              try {
                                await api.put(`/applications/${app.id}/status`, { status: newStatus });
                                toast.success('Статус оновлено');
                              } catch {
                                setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: app.status } : a));
                                toast.error('Помилка');
                              }
                            }}
                            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {KANBAN_COLS.map(col => (
                              <option key={col.status} value={col.status}>{col.label}</option>
                            ))}
                          </select>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => { setNoteText(app.employerNotes || ''); setEditingNoteId(isEditNote ? null : app.id); }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                                app.employerNotes ? 'border-amber-300 text-amber-600 hover:bg-amber-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <StickyNote size={12} /> Нотатка
                            </button>
                            {app.applicant?.id && (
                              <>
                                <button
                                  onClick={() => openPreview(app.applicant!.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <UserCircle size={13} /> Профіль
                                </button>
                                <Link
                                  href={`/chat?userId=${app.applicant.id}`}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  <MessageCircle size={13} /> Написати
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          COMPANY TAB
      ══════════════════════════════════════════════════════ */}
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
                          ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {myCompany.status === 'verified' ? 'Верифіковано' :
                         myCompany.status === 'active'   ? 'Активна'      : 'На розгляді'}
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
              <p className="text-sm text-gray-400 mt-2 mb-6">Після верифікації адміністратором він з'явиться в публічному каталозі.</p>
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

      {/* ══════════════════════════════════════════════════════
          CANDIDATES TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'candidates' && (
        <div>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                value={candidateFilters.search}
                onChange={e => setCandidateFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Ім'я або ключові слова..."
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={candidateFilters.country}
                onChange={e => setCandidateFilters(f => ({ ...f, country: e.target.value }))}
                placeholder="Країна"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={candidateFilters.city}
                onChange={e => setCandidateFilters(f => ({ ...f, city: e.target.value }))}
                placeholder="Місто"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value=""
                onChange={e => {
                  const v = e.target.value;
                  if (v && !candidateFilters.languages.includes(v))
                    setCandidateFilters(f => ({ ...f, languages: [...f.languages, v] }));
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">+ Мова</option>
                {JOB_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            {candidateFilters.languages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {candidateFilters.languages.map(l => (
                  <span key={l} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {JOB_LANGUAGES.find(x => x.value === l)?.label || l}
                    <button onClick={() => setCandidateFilters(f => ({ ...f, languages: f.languages.filter(x => x !== l) }))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => searchCandidates()}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
            >
              Знайти
            </button>
          </div>

          {/* Results */}
          {candidatesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {candidatesTotal > 0 && (
                <p className="text-sm text-gray-500 mb-3">Знайдено: {candidatesTotal}</p>
              )}
              <div className="space-y-3">
                {candidates.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
                    <Users size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500">Кандидатів не знайдено</h3>
                    <p className="text-sm text-gray-400 mt-1">Спробуйте змінити фільтри пошуку</p>
                  </div>
                ) : (
                  candidates.map(candidate => (
                    <div key={candidate.id} className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-indigo-200 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {candidate.avatarUrl ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}${candidate.avatarUrl}`}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <UserCircle size={20} className="text-indigo-600" />
                            </div>
                          )}
                          <div>
                            <button
                              className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                              onClick={() => openPreview(candidate.id)}
                            >
                              {candidate.firstName} {candidate.lastName}
                            </button>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} />
                              {candidate.city}{candidate.country ? `, ${candidate.country}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openPreview(candidate.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <UserCircle size={13} /> Переглянути
                          </button>
                          <Link
                            href={`/chat?userId=${candidate.id}`}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <MessageCircle size={13} /> Написати
                          </Link>
                        </div>
                      </div>

                      {candidate.summary && (
                        <p className="text-sm text-gray-600 mt-3 line-clamp-2">{candidate.summary}</p>
                      )}
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {candidate.skills.slice(0, 8).map(skill => (
                            <span key={skill.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                              {skill.name}
                            </span>
                          ))}
                          {candidate.skills.length > 8 && (
                            <span className="text-xs text-gray-400">+{candidate.skills.length - 8}</span>
                          )}
                        </div>
                      )}
                      {candidate.languages && candidate.languages.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {candidate.languages.map(l => (
                            <span key={l} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                              {JOB_LANGUAGES.find(x => x.value === l)?.label || l}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Company form
      ══════════════════════════════════════════════════════ */}
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
                <input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} placeholder="Назва вашої компанії" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Короткий опис</label>
                <input value={companyForm.shortDescription} onChange={e => setCompanyForm(f => ({ ...f, shortDescription: e.target.value }))} placeholder="Одне речення про компанію" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Повний опис</label>
                <textarea value={companyForm.description} onChange={e => setCompanyForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Галузь</label>
                  <input value={companyForm.industry} onChange={e => setCompanyForm(f => ({ ...f, industry: e.target.value }))} placeholder="IT, Фінанси..." className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Рік заснування</label>
                  <input type="number" value={companyForm.foundedYear} onChange={e => setCompanyForm(f => ({ ...f, foundedYear: e.target.value }))} placeholder="2010" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Розмір</label>
                  <select value={companyForm.size} onChange={e => setCompanyForm(f => ({ ...f, size: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="">Оберіть</option>
                    {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сайт</label>
                  <input value={companyForm.website} onChange={e => setCompanyForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowCompanyForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">Скасувати</button>
              <button onClick={myCompany ? handleUpdateCompany : handleCreateCompany} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                {myCompany ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Job form
      ══════════════════════════════════════════════════════ */}
      {(showCreateJob || editingJob) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingJob ? 'Редагувати вакансію' : showCreateJob && jobForm.title.includes('(копія)') ? 'Дублювати вакансію' : 'Нова вакансія'}
              </h2>
              <button onClick={() => { setShowCreateJob(false); setEditingJob(null); resetJobForm(); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Назва вакансії *</label>
                <input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} placeholder="Junior JavaScript Developer" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Опис *</label>
                <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип зайнятості</label>
                  <select value={jobForm.jobType} onChange={e => setJobForm(f => ({ ...f, jobType: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Рівень досвіду</label>
                  <select value={jobForm.experienceLevel} onChange={e => setJobForm(f => ({ ...f, experienceLevel: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Формат роботи</label>
                  <select value={jobForm.workFormat} onChange={e => setJobForm(f => ({ ...f, workFormat: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    {WORK_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Країна</label>
                  <input value={jobForm.country} onChange={e => setJobForm(f => ({ ...f, country: e.target.value }))} placeholder="Ukraine" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Місто</label>
                  <input value={jobForm.city} onChange={e => setJobForm(f => ({ ...f, city: e.target.value }))} placeholder="Київ" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата від</label>
                  <input type="number" value={jobForm.salaryMin} onChange={e => setJobForm(f => ({ ...f, salaryMin: e.target.value }))} placeholder="1000" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата до</label>
                  <input type="number" value={jobForm.salaryMax} onChange={e => setJobForm(f => ({ ...f, salaryMax: e.target.value }))} placeholder="2000" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Валюта</label>
                  <select value={jobForm.salaryCurrency} onChange={e => setJobForm(f => ({ ...f, salaryCurrency: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="UAH">UAH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Вимоги</label>
                <textarea value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Обов'язки</label>
                <textarea value={jobForm.responsibilities} onChange={e => setJobForm(f => ({ ...f, responsibilities: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Переваги / Бенефіти</label>
                <textarea value={jobForm.benefits} onChange={e => setJobForm(f => ({ ...f, benefits: e.target.value }))} rows={2} placeholder="Медична страховка, гнучкий графік..." className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категорія</label>
                <select value={jobForm.category} onChange={e => setJobForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">Оберіть категорію</option>
                  {JOB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Мовні вимоги</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_LANGUAGES.map(lang => (
                    <label key={lang.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={jobForm.requiredLanguages.includes(lang.value)}
                        onChange={e => setJobForm(f => ({
                          ...f,
                          requiredLanguages: e.target.checked
                            ? [...f.requiredLanguages, lang.value]
                            : f.requiredLanguages.filter(l => l !== lang.value),
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{lang.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {availableSkills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Необхідні навички</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {availableSkills.map(skill => (
                      <label key={skill.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={jobForm.skillIds.includes(skill.id)}
                          onChange={e => setJobForm(f => ({
                            ...f,
                            skillIds: e.target.checked
                              ? [...f.skillIds, skill.id]
                              : f.skillIds.filter(id => id !== skill.id),
                          }))}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-700">{skill.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jobForm.isUrgent} onChange={e => setJobForm(f => ({ ...f, isUrgent: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">Термінова</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jobForm.isRemote} onChange={e => setJobForm(f => ({ ...f, isRemote: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">Віддалена робота</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jobForm.isSalaryNegotiable} onChange={e => setJobForm(f => ({ ...f, isSalaryNegotiable: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">Зарплата договірна</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дедлайн подачі заявок</label>
                <input
                  type="date"
                  value={jobForm.applicationDeadline}
                  onChange={e => setJobForm(f => ({ ...f, applicationDeadline: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => { setShowCreateJob(false); setEditingJob(null); resetJobForm(); }} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">Скасувати</button>
              <button onClick={editingJob ? handleUpdateJob : handleCreateJob} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                {editingJob ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SLIDE-OVER — Candidate preview
      ══════════════════════════════════════════════════════ */}
      {(previewLoading || previewUser) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setPreviewUser(null); setPreviewLoading(false); }}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Профіль кандидата</h2>
              <button
                onClick={() => { setPreviewUser(null); setPreviewLoading(false); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {previewLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
              </div>
            ) : previewUser && (
              <div className="flex-1 overflow-y-auto">
                {/* Hero */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-4 mb-3">
                    {previewUser.avatarUrl ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}${previewUser.avatarUrl}`}
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                        <UserCircle size={30} className="text-indigo-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {previewUser.firstName} {previewUser.lastName}
                      </h3>
                      {(previewUser.city || previewUser.country) && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={13} />
                          {[previewUser.city, previewUser.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {previewUser.summary && (
                    <p className="text-sm text-gray-600 leading-relaxed">{previewUser.summary}</p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/users/${previewUser.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <UserCircle size={15} /> Повний профіль
                    </Link>
                    <Link
                      href={`/chat?userId=${previewUser.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <MessageCircle size={15} /> Написати
                    </Link>
                  </div>
                </div>

                {/* Skills */}
                {previewUser.skills && previewUser.skills.length > 0 && (
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Навички</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {previewUser.skills.map(skill => (
                        <span key={skill.id} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {previewUser.languages && previewUser.languages.length > 0 && (
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Мови</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {previewUser.languages.map(l => (
                        <span key={l} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                          {JOB_LANGUAGES.find(x => x.value === l)?.label || l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work experience */}
                {(previewUser as any).workExperience?.length > 0 && (
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Briefcase size={13} /> Досвід роботи
                    </h4>
                    <div className="space-y-3">
                      {(previewUser as any).workExperience.map((exp: any, i: number) => (
                        <div key={i}>
                          <p className="font-medium text-sm text-gray-900">{exp.position}</p>
                          <p className="text-sm text-gray-500">{exp.company}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' }) : ''}
                            {' – '}
                            {exp.current ? 'Зараз' : exp.endDate ? new Date(exp.endDate).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' }) : ''}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {(previewUser as any).education?.length > 0 && (
                  <div className="px-6 py-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <GraduationCap size={13} /> Освіта
                    </h4>
                    <div className="space-y-3">
                      {(previewUser as any).education.map((edu: any, i: number) => (
                        <div key={i}>
                          <p className="font-medium text-sm text-gray-900">{edu.degree} — {edu.field}</p>
                          <p className="text-sm text-gray-500">{edu.institution}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {edu.startDate ? new Date(edu.startDate).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' }) : ''}
                            {edu.endDate ? ` – ${new Date(edu.endDate).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' })}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
