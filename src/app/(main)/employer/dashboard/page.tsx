'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Users, Plus, Edit2, Trash2,
  X, Loader2, Check, Clock,
  MessageCircle, UserCircle, Building, Copy,
  StickyNote, BarChart3, GraduationCap, MapPin,
  LayoutList, Kanban, Sparkles, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, AlertCircle, Trophy, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/contexts/I18nContext';
import { Job, Application, AiAnalysis, Company, Skill, User } from '@/types';
import {
  ROUTES, JOB_TYPES, EXPERIENCE_LEVELS, WORK_FORMATS,
  COMPANY_SIZES, JOB_LANGUAGES, JOB_CATEGORIES,
} from '@/lib/constants';
import { formatRelativeDate, formatSalary } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ─── Kanban config (labels are resolved inside component via t()) ─────────────

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
  const { t } = useI18n();

  const KANBAN_COLS = useMemo(() => [
    { status: 'pending',             label: t('employer.kanban.pending'),              hdr: 'bg-gray-100 text-gray-700',     col: 'bg-gray-50'    },
    { status: 'reviewed',            label: t('employer.kanban.reviewed'),             hdr: 'bg-blue-100 text-blue-700',     col: 'bg-blue-50'    },
    { status: 'shortlisted',         label: t('employer.kanban.shortlisted'),          hdr: 'bg-purple-100 text-purple-700', col: 'bg-purple-50'  },
    { status: 'interview_scheduled', label: t('employer.kanban.interview_scheduled'),  hdr: 'bg-yellow-100 text-yellow-700', col: 'bg-yellow-50'  },
    { status: 'offered',             label: t('employer.kanban.offered'),              hdr: 'bg-green-100 text-green-700',   col: 'bg-green-50'   },
    { status: 'rejected',            label: t('employer.kanban.rejected'),             hdr: 'bg-red-100 text-red-700',       col: 'bg-red-50'     },
  ], [t]);

  // Core
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'company' | 'candidates' | 'ai'>('jobs');
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
    isPaid: false, stipendAmount: '',
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
  // AI Screening
  const [aiJobId, setAiJobId] = useState('');
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [expandedAiId, setExpandedAiId] = useState<string | null>(null);
  const [batchAnalyzingJobId, setBatchAnalyzingJobId] = useState<string | null>(null);
  const [expandedTop5Id, setExpandedTop5Id] = useState<string | null>(null);

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
    } catch { toast.error(t('employer.toast.loadError')); }
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
    } catch { toast.error(t('employer.toast.candidatesError')); }
    finally { setCandidatesLoading(false); }
  };

  // ─── Job handlers ────────────────────────────────────────────────────────────

  const handleCreateJob = async () => {
    try {
      await api.post('/jobs', {
        ...jobForm,
        salaryMin: jobForm.salaryMin ? +jobForm.salaryMin : undefined,
        salaryMax: jobForm.salaryMax ? +jobForm.salaryMax : undefined,
        stipendAmount: jobForm.stipendAmount ? +jobForm.stipendAmount : undefined,
      });
      toast.success(t('employer.toast.jobCreated'));
      setShowCreateJob(false); resetJobForm(); fetchData();
    } catch (e: any) { toast.error(e.response?.data?.message || t('employer.toast.error')); }
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;
    try {
      await api.put(`/jobs/${editingJob.id}`, {
        ...jobForm,
        salaryMin: jobForm.salaryMin ? +jobForm.salaryMin : undefined,
        salaryMax: jobForm.salaryMax ? +jobForm.salaryMax : undefined,
        stipendAmount: jobForm.stipendAmount ? +jobForm.stipendAmount : undefined,
      });
      toast.success(t('employer.toast.jobUpdated'));
      setEditingJob(null); resetJobForm(); fetchData();
    } catch (e: any) { toast.error(e.response?.data?.message || t('employer.toast.error')); }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm(t('employer.toast.jobDeleteConfirm'))) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success(t('employer.toast.jobDeleted')); fetchData();
    } catch { toast.error(t('employer.toast.deleteError')); }
  };

  const handleDuplicateJob = (job: Job) => {
    fetchSkills();
    setEditingJob(null);
    setJobForm({
      title: `${job.title} ${t('employer.jobForm.copyMarker')}`,
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
      isPaid: job.isPaid || false,
      stipendAmount: job.stipendAmount?.toString() || '',
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
      isPaid: job.isPaid || false,
      stipendAmount: job.stipendAmount?.toString() || '',
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
    isPaid: false, stipendAmount: '',
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
      toast.success(t('employer.toast.statusUpdated'));
    } catch {
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: app.status } : a));
      toast.error(t('employer.toast.statusError'));
    }
  };

  // ─── Notes ───────────────────────────────────────────────────────────────────

  const handleSaveNote = async (appId: string, currentStatus: string) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, employerNotes: noteText } : a));
    setEditingNoteId(null);
    try {
      await api.put(`/applications/${appId}/status`, { status: currentStatus, employerNotes: noteText });
      toast.success(t('employer.toast.noteSaved'));
    } catch { toast.error(t('employer.toast.noteError')); }
  };

  // ─── Company handlers ─────────────────────────────────────────────────────────

  const handleCreateCompany = async () => {
    try {
      await api.post('/companies', { ...companyForm, foundedYear: companyForm.foundedYear ? +companyForm.foundedYear : undefined });
      toast.success(t('employer.toast.companyCreated'));
      setShowCompanyForm(false); fetchMyCompany();
    } catch (e: any) { toast.error(e.response?.data?.message || t('employer.toast.error')); }
  };

  const handleUpdateCompany = async () => {
    if (!myCompany) return;
    try {
      await api.put(`/companies/${myCompany.id}`, { ...companyForm, foundedYear: companyForm.foundedYear ? +companyForm.foundedYear : undefined });
      toast.success(t('employer.toast.companyUpdated'));
      setShowCompanyForm(false); fetchMyCompany();
    } catch (e: any) { toast.error(e.response?.data?.message || t('employer.toast.error')); }
  };

  // ─── Candidate preview ───────────────────────────────────────────────────────

  const openPreview = async (userId: string) => {
    setPreviewLoading(true);
    setPreviewUser(null);
    try {
      const res = await api.get(`/users/${userId}`);
      setPreviewUser(res.data);
    } catch { toast.error(t('employer.toast.profileError')); }
    finally { setPreviewLoading(false); }
  };

  // ─── AI handlers ─────────────────────────────────────────────────────────────

  const analyzeJobApplications = async (jobId: string) => {
    setBatchAnalyzingJobId(jobId);
    try {
      const res = await api.post(`/ai/analyze-job/${jobId}`);
      const { results, analyzed, failed } = res.data;
      setApplications(prev => prev.map(app => {
        const r = results.find((x: any) => x.applicationId === app.id);
        if (!r) return app;
        return {
          ...app,
          aiAnalysis: { score: r.score, recommendation: r.recommendation, strengths: r.strengths, gaps: r.gaps, summary: r.summary },
          aiAnalyzedAt: r.analyzedAt,
        };
      }));
      toast.success(t('employer.toast.analyzed', { count: analyzed }) + (failed > 0 ? t('employer.toast.analysisErrors', { count: failed }) : ''));
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('employer.toast.batchError'));
    } finally {
      setBatchAnalyzingJobId(null);
    }
  };

  const analyzeApplication = async (applicationId: string) => {
    setAnalyzingIds(prev => new Set(prev).add(applicationId));
    try {
      const res = await api.post(`/ai/analyze/${applicationId}`);
      setApplications(prev => prev.map(a =>
        a.id === applicationId
          ? { ...a, aiAnalysis: res.data as AiAnalysis, aiAnalyzedAt: res.data.analyzedAt }
          : a
      ));
      setExpandedAiId(applicationId);
      toast.success(t('employer.toast.analysisDone'));
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('employer.toast.aiError'));
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(applicationId); return s; });
    }
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
          <h1 className="text-3xl font-bold text-gray-900">{t('employer.title')}</h1>
          <p className="text-gray-500 mt-1">{t('employer.tabs.jobs')} & {t('employer.tabs.applications')}</p>
        </div>
        <button
          onClick={() => { fetchSkills(); setShowCreateJob(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} /> {t('employer.newJob')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit">
        {[
          { key: 'jobs',        label: `${t('employer.tabs.jobs')} (${jobs.length})`             },
          { key: 'applications',label: `${t('employer.tabs.applications')} (${applications.length})` },
          { key: 'candidates',  label: t('employer.tabs.candidates')                               },
          { key: 'ai',          label: `✦ ${t('employer.tabs.ai')}`                               },
          { key: 'company',     label: t('employer.tabs.company')                                  },
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
              <h3 className="text-lg font-medium text-gray-500">{t('employer.jobs.empty')}</h3>
              <button
                onClick={() => { fetchSkills(); setShowCreateJob(true); }}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('employer.jobs.createFirst')}
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
                            {job.status === 'active' ? t('employer.jobs.status.active') : job.status === 'pending' ? t('employer.jobs.status.pending') : job.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                          <span>{job.city}, {job.country}</span>
                          <span>{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                          <span>{job.applicationsCount || 0} {t('employer.jobs.applications')}</span>
                          <span>{job.views || 0} {t('employer.jobs.views')}</span>
                          <span>{formatRelativeDate(job.createdAt)}</span>
                          {job.applicationDeadline && (
                            <span className={new Date(job.applicationDeadline) < new Date() ? 'text-red-500' : 'text-orange-500'}>
                              {t('employer.jobs.deadline')} {new Date(job.applicationDeadline).toLocaleDateString('uk-UA')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        <button
                          onClick={() => setExpandedJobId(isExp ? null : job.id)}
                          className={`p-2 rounded-lg transition-colors ${isExp ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          title={t('employer.jobs.tooltips.funnel')}
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          onClick={() => startEdit(job)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={t('employer.jobs.tooltips.edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDuplicateJob(job)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={t('employer.jobs.tooltips.duplicate')}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('employer.jobs.tooltips.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Analytics funnel ── */}
                  {isExp && (
                    <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('employer.jobs.funnel.title')}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: t('employer.jobs.funnel.views'),        value: job.views || 0,    bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
                          { label: t('employer.jobs.funnel.applications'), value: jobApps.length,    bg: 'bg-blue-100',    text: 'text-blue-700'    },
                          { label: t('employer.jobs.funnel.shortlisted'),  value: selected,          bg: 'bg-purple-100',  text: 'text-purple-700'  },
                          { label: t('employer.jobs.funnel.offer'),        value: offered,           bg: 'bg-green-100',   text: 'text-green-700'   },
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
                            {t('employer.jobs.funnel.conversion')} <span className="font-semibold text-gray-600">
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
              <option value="">{t('employer.applications.allJobs')}</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <span className="text-sm text-gray-400">{filteredApps.length} {t('employer.tabs.applications').toLowerCase()}</span>

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
                title={t('employer.applications.viewList')}
              >
                <LayoutList size={15} /> {t('employer.applications.viewList')}
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
                                placeholder={t('employer.applications.notePlaceholder')}
                                className="w-full text-xs px-2 py-1.5 border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                autoFocus
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => handleSaveNote(app.id, app.status)}
                                  className="flex-1 text-xs py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  {t('employer.applications.save')}
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
                              title={t('employer.applications.note')}
                            >
                              <StickyNote size={12} />
                              <span>{t('employer.applications.note')}</span>
                            </button>
                            <div className="flex gap-1">
                              {app.applicant?.id && (
                                <>
                                  <Link
                                    href={`/users/${app.applicant.id}`}
                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                    title={t('employer.applications.profile')}
                                  >
                                    <UserCircle size={14} />
                                  </Link>
                                  <Link
                                    href={`/chat?userId=${app.applicant.id}`}
                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                    title={t('employer.applications.message')}
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
                        <p className="text-xs text-gray-300">{t('employer.applications.dragHere')}</p>
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
                  <h3 className="text-lg font-medium text-gray-500">{t('employer.applications.empty')}</h3>
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
                              {t('employer.applications.expectedSalary')} {app.expectedSalary} {app.expectedSalaryCurrency}
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
                                placeholder={t('employer.applications.notePlaceholderList')}
                                className="w-full text-sm px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                autoFocus
                              />
                              <div className="flex gap-2 mt-1.5">
                                <button
                                  onClick={() => handleSaveNote(app.id, app.status)}
                                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                  {t('employer.applications.save')}
                                </button>
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                                >
                                  {t('employer.applications.cancel')}
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
                                toast.success(t('employer.toast.statusUpdated'));
                              } catch {
                                setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: app.status } : a));
                                toast.error(t('employer.toast.error'));
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
                              <StickyNote size={12} /> {t('employer.applications.note')}
                            </button>
                            {app.applicant?.id && (
                              <>
                                <button
                                  onClick={() => openPreview(app.applicant!.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <UserCircle size={13} /> {t('employer.applications.profile')}
                                </button>
                                <Link
                                  href={`/chat?userId=${app.applicant.id}`}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  <MessageCircle size={13} /> {t('employer.applications.message')}
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
                          <Check size={10} /> {t('employer.company.verified')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        myCompany.status === 'verified' || myCompany.status === 'active'
                          ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {myCompany.status === 'verified' ? t('employer.company.status.verified') :
                         myCompany.status === 'active'   ? t('employer.company.status.active') : t('employer.company.status.pending')}
                      </span>
                      {myCompany.status === 'pending' && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> {t('employer.company.pendingVerification')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCompanyForm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={16} /> {t('employer.company.edit')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {myCompany.industry && (
                  <div><p className="text-xs text-gray-400 mb-1">{t('employer.company.info.industry')}</p><p className="text-sm text-gray-700">{myCompany.industry}</p></div>
                )}
                {myCompany.size && (
                  <div><p className="text-xs text-gray-400 mb-1">{t('employer.company.info.size')}</p><p className="text-sm text-gray-700">{t(`companySizes.${myCompany.size}`) || myCompany.size}</p></div>
                )}
                {myCompany.foundedYear && (
                  <div><p className="text-xs text-gray-400 mb-1">{t('employer.company.info.foundedYear')}</p><p className="text-sm text-gray-700">{myCompany.foundedYear}</p></div>
                )}
                {myCompany.website && (
                  <div><p className="text-xs text-gray-400 mb-1">{t('employer.company.info.website')}</p><a href={myCompany.website} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">{myCompany.website}</a></div>
                )}
              </div>

              {myCompany.shortDescription && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-1">{t('employer.company.info.shortDescription')}</p>
                  <p className="text-sm text-gray-700">{myCompany.shortDescription}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <Building size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">{t('employer.company.noCompany.title')}</h3>
              <p className="text-sm text-gray-400 mt-2 mb-6">{t('employer.company.noCompany.desc')}</p>
              <button
                onClick={() => setShowCompanyForm(true)}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} className="inline mr-2" />{t('employer.company.noCompany.create')}
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
                placeholder={t('employer.candidates.searchPlaceholder')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={candidateFilters.country}
                onChange={e => setCandidateFilters(f => ({ ...f, country: e.target.value }))}
                placeholder={t('employer.candidates.countryPlaceholder')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={candidateFilters.city}
                onChange={e => setCandidateFilters(f => ({ ...f, city: e.target.value }))}
                placeholder={t('employer.candidates.cityPlaceholder')}
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
                <option value="">{t('employer.candidates.languagePlaceholder')}</option>
                {JOB_LANGUAGES.map(l => <option key={l.value} value={l.value}>{t(`jobLanguages.${l.value}`)}</option>)}
              </select>
            </div>

            {candidateFilters.languages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {candidateFilters.languages.map(l => (
                  <span key={l} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {t(`jobLanguages.${l}`) || l}
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
              {t('employer.candidates.search')}
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
                <p className="text-sm text-gray-500 mb-3">{t('employer.candidates.found')} {candidatesTotal}</p>
              )}
              <div className="space-y-3">
                {candidates.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
                    <Users size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500">{t('employer.candidates.empty.title')}</h3>
                    <p className="text-sm text-gray-400 mt-1">{t('employer.candidates.empty.subtitle')}</p>
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
                            <UserCircle size={13} /> {t('employer.candidates.view')}
                          </button>
                          <Link
                            href={`/chat?userId=${candidate.id}`}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <MessageCircle size={13} /> {t('employer.candidates.message')}
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
                              {t(`jobLanguages.${l}`) || l}
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
          AI SCREENING TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'ai' && (
        <div>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5 mb-6 flex items-start gap-4">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <Sparkles size={22} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('employer.ai.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('employer.ai.subtitle')}
              </p>
            </div>
          </div>

          {/* Job filter */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('employer.ai.selectJob')}</label>
            <div className="flex gap-3">
              <select
                value={aiJobId}
                onChange={e => setAiJobId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">{t('employer.ai.allApplications')}</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              {aiJobId && (
                <button
                  onClick={() => analyzeJobApplications(aiJobId)}
                  disabled={batchAnalyzingJobId === aiJobId}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {batchAnalyzingJobId === aiJobId
                    ? <><Loader2 size={14} className="animate-spin" /> {t('employer.ai.analyzing')}</>
                    : <><Zap size={14} /> {t('employer.ai.analyzeAll')}</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* Applications list */}
          {(() => {
            const aiApps = aiJobId
              ? applications.filter(a => a.jobId === aiJobId)
              : applications;

            if (aiApps.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <Sparkles size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">
                    {aiJobId ? t('employer.ai.noAppsJob') : t('employer.ai.noApps')}
                  </p>
                </div>
              );
            }

            const analyzedApps = aiApps
              .filter(a => a.aiAnalysis)
              .sort((a, b) => (b.aiAnalysis!.score) - (a.aiAnalysis!.score));
            const top5 = analyzedApps.slice(0, 5);

            const recColor: Record<string, string> = {
              strong_yes: 'bg-green-100 text-green-700 border-green-200',
              yes:        'bg-blue-100 text-blue-700 border-blue-200',
              maybe:      'bg-yellow-100 text-yellow-700 border-yellow-200',
              no:         'bg-red-100 text-red-700 border-red-200',
            };
            const recLabel: Record<string, string> = {
              strong_yes: t('employer.ai.rec.strong_yes'),
              yes:        t('employer.ai.rec.yes'),
              maybe:      t('employer.ai.rec.maybe'),
              no:         t('employer.ai.rec.no'),
            };
            const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600', 'text-gray-500', 'text-gray-500'];

            return (
              <div className="space-y-6">
                {/* Top-5 block */}
                {aiJobId && top5.length > 0 && (
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={18} className="text-amber-500" />
                      <h3 className="text-sm font-semibold text-gray-800">{t('employer.ai.top', { n: String(top5.length) })}</h3>
                      <span className="ml-auto text-xs text-gray-400">{t('employer.ai.byAi')}</span>
                    </div>
                    <div className="space-y-2">
                      {top5.map((app, i) => {
                        const c = app.applicant;
                        if (!c) return null;
                        const an = app.aiAnalysis!;
                        const scoreColor = an.score >= 70 ? 'text-green-600' : an.score >= 40 ? 'text-yellow-600' : 'text-red-500';
                        const isTop5Expanded = expandedTop5Id === app.id;
                        return (
                          <div key={app.id} className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                            {/* Row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                              <span className={`text-lg font-bold w-6 text-center shrink-0 ${medalColors[i]}`}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                              </span>
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {c.avatarUrl
                                  ? <img src={`${process.env.NEXT_PUBLIC_API_URL}${c.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-xs font-semibold text-indigo-600">{c.firstName[0]}{c.lastName[0]}</span>
                                }
                              </div>
                              <button
                                onClick={() => openPreview(c.id)}
                                className="font-medium text-sm text-gray-900 hover:text-indigo-600 transition-colors flex-1 text-left truncate"
                              >
                                {c.firstName} {c.lastName}
                              </button>
                              <span className={`text-sm font-bold shrink-0 ${scoreColor}`}>{an.score}%</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${recColor[an.recommendation] ?? ''}`}>
                                {recLabel[an.recommendation] ?? an.recommendation}
                              </span>
                              <button
                                onClick={() => setExpandedTop5Id(isTop5Expanded ? null : app.id)}
                                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                              >
                                {isTop5Expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                            {/* Inline expanded details */}
                            {isTop5Expanded && (
                              <div className="border-t border-amber-100 px-4 py-4 bg-amber-50/40 space-y-3">
                                <p className="text-sm text-gray-700 leading-relaxed">{an.summary}</p>
                                <div className="grid grid-cols-2 gap-3">
                                  {an.strengths.length > 0 && (
                                    <div className="bg-green-50 rounded-xl p-3">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <ThumbsUp size={13} className="text-green-600" />
                                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">{t('employer.ai.strengths')}</span>
                                      </div>
                                      <ul className="space-y-1">
                                        {an.strengths.map((s, si) => (
                                          <li key={si} className="text-xs text-green-800 flex items-start gap-1.5">
                                            <Check size={10} className="mt-0.5 shrink-0 text-green-500" />{s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {an.gaps.length > 0 ? (
                                    <div className="bg-red-50 rounded-xl p-3">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <ThumbsDown size={13} className="text-red-500" />
                                        <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">{t('employer.ai.gaps')}</span>
                                      </div>
                                      <ul className="space-y-1">
                                        {an.gaps.map((g, gi) => (
                                          <li key={gi} className="text-xs text-red-800 flex items-start gap-1.5">
                                            <AlertCircle size={10} className="mt-0.5 shrink-0 text-red-400" />{g}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                                      <Check size={14} className="text-green-600" />
                                      <span className="text-xs text-green-700">{t('employer.ai.noGaps')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div className="space-y-3">
                {aiApps.map(app => {
                  const candidate = app.applicant;
                  if (!candidate) return null;
                  const isAnalyzing = analyzingIds.has(app.id);
                  const analysis = app.aiAnalysis;
                  const isExpanded = expandedAiId === app.id;
                  const job = jobs.find(j => j.id === app.jobId);

                  const recColor: Record<string, string> = {
                    strong_yes: 'bg-green-100 text-green-700 border-green-200',
                    yes:        'bg-blue-100 text-blue-700 border-blue-200',
                    maybe:      'bg-yellow-100 text-yellow-700 border-yellow-200',
                    no:         'bg-red-100 text-red-700 border-red-200',
                  };
                  const recLabel: Record<string, string> = {
                    strong_yes: t('employer.ai.rec.strong_yes'),
                    yes:        t('employer.ai.rec.yes'),
                    maybe:      t('employer.ai.rec.maybe'),
                    no:         t('employer.ai.rec.no'),
                  };
                  const scoreColor = analysis
                    ? analysis.score >= 70 ? 'text-green-600'
                      : analysis.score >= 40 ? 'text-yellow-600'
                      : 'text-red-500'
                    : '';

                  return (
                    <div key={app.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      {/* Row */}
                      <div className="flex items-center gap-4 p-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {candidate.avatarUrl
                            ? <img src={`${process.env.NEXT_PUBLIC_API_URL}${candidate.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                            : <span className="text-sm font-semibold text-indigo-600">
                                {candidate.firstName[0]}{candidate.lastName[0]}
                              </span>
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openPreview(candidate.id)}
                              className="font-medium text-sm text-gray-900 hover:text-indigo-600 transition-colors"
                            >
                              {candidate.firstName} {candidate.lastName}
                            </button>
                            {analysis && (
                              <>
                                <span className={`text-sm font-bold ${scoreColor}`}>{analysis.score}%</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${recColor[analysis.recommendation] ?? ''}`}>
                                  {recLabel[analysis.recommendation] ?? analysis.recommendation}
                                </span>
                              </>
                            )}
                          </div>
                          {job && (
                            <p className="text-xs text-gray-400 mt-0.5">{job.title}</p>
                          )}
                          {analysis && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {t('employer.ai.analyzedAt')} {app.aiAnalyzedAt ? new Date(app.aiAnalyzedAt).toLocaleDateString('uk-UA') : ''}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {analysis && (
                            <button
                              onClick={() => setExpandedAiId(isExpanded ? null : app.id)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                          <button
                            onClick={() => analyzeApplication(app.id)}
                            disabled={isAnalyzing}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              analysis
                                ? 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isAnalyzing
                              ? <><Loader2 size={12} className="animate-spin" /> {t('employer.ai.analyzingShort')}</>
                              : <><Sparkles size={12} /> {analysis ? t('employer.ai.reanalyze') : t('employer.ai.analyze')}</>
                            }
                          </button>
                        </div>
                      </div>

                      {/* Expanded analysis */}
                      {isExpanded && analysis && (
                        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                          {/* Summary */}
                          <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Strengths */}
                            {analysis.strengths.length > 0 && (
                              <div className="bg-green-50 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <ThumbsUp size={13} className="text-green-600" />
                                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">{t('employer.ai.strengths')}</span>
                                </div>
                                <ul className="space-y-1">
                                  {analysis.strengths.map((s, i) => (
                                    <li key={i} className="text-xs text-green-800 flex items-start gap-1.5">
                                      <Check size={10} className="mt-0.5 shrink-0 text-green-500" />{s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Gaps */}
                            {analysis.gaps.length > 0 && (
                              <div className="bg-red-50 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <ThumbsDown size={13} className="text-red-500" />
                                  <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">{t('employer.ai.gaps')}</span>
                                </div>
                                <ul className="space-y-1">
                                  {analysis.gaps.map((g, i) => (
                                    <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                                      <AlertCircle size={10} className="mt-0.5 shrink-0 text-red-400" />{g}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysis.gaps.length === 0 && (
                              <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                                <Check size={14} className="text-green-600" />
                                <span className="text-xs text-green-700">{t('employer.ai.noGaps')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}
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
                {myCompany ? t('employer.company.form.editTitle') : t('employer.company.form.createTitle')}
              </h2>
              <button onClick={() => setShowCompanyForm(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.company.form.name')}</label>
                <input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} placeholder={t('employer.company.form.namePlaceholder')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.company.form.shortDescription')}</label>
                <input value={companyForm.shortDescription} onChange={e => setCompanyForm(f => ({ ...f, shortDescription: e.target.value }))} placeholder={t('employer.company.form.shortDescPlaceholder')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.company.form.fullDescription')}</label>
                <textarea value={companyForm.description} onChange={e => setCompanyForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.company.form.industry')}</label>
                  <input value={companyForm.industry} onChange={e => setCompanyForm(f => ({ ...f, industry: e.target.value }))} placeholder={t('employer.company.form.industryPlaceholder')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.company.form.foundedYear')}</label>
                  <input type="number" value={companyForm.foundedYear} onChange={e => setCompanyForm(f => ({ ...f, foundedYear: e.target.value }))} placeholder="2010" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.company.form.size')}</label>
                  <select value={companyForm.size} onChange={e => setCompanyForm(f => ({ ...f, size: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="">{t('employer.company.form.sizePlaceholder')}</option>
                    {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{t(`companySizes.${s.value}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.company.form.website')}</label>
                  <input value={companyForm.website} onChange={e => setCompanyForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowCompanyForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">{t('employer.company.form.cancel')}</button>
              <button onClick={myCompany ? handleUpdateCompany : handleCreateCompany} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                {myCompany ? t('employer.company.form.save') : t('employer.company.form.create')}
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
                {editingJob ? t('employer.jobForm.editTitle') : showCreateJob && jobForm.title.includes(t('employer.jobForm.copyMarker')) ? t('employer.jobForm.duplicateTitle') : t('employer.jobForm.createTitle')}
              </h2>
              <button onClick={() => { setShowCreateJob(false); setEditingJob(null); resetJobForm(); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.titleLabel')}</label>
                <input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} placeholder="Junior JavaScript Developer" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.description')}</label>
                <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.jobType')}</label>
                  <select value={jobForm.jobType} onChange={e => setJobForm(f => ({ ...f, jobType: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    {JOB_TYPES.map(jt => <option key={jt.value} value={jt.value}>{t(`jobTypes.${jt.value}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.experienceLevel')}</label>
                  <select value={jobForm.experienceLevel} onChange={e => setJobForm(f => ({ ...f, experienceLevel: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    {EXPERIENCE_LEVELS.map(lvl => <option key={lvl.value} value={lvl.value}>{t(`experienceLevels.${lvl.value}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.workFormat')}</label>
                  <select value={jobForm.workFormat} onChange={e => setJobForm(f => ({ ...f, workFormat: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    {WORK_FORMATS.map(fmt => <option key={fmt.value} value={fmt.value}>{t(`workFormats.${fmt.value}`)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.country')}</label>
                  <input value={jobForm.country} onChange={e => setJobForm(f => ({ ...f, country: e.target.value }))} placeholder="Ukraine" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.city')}</label>
                  <input value={jobForm.city} onChange={e => setJobForm(f => ({ ...f, city: e.target.value }))} placeholder={t('employer.jobForm.cityPlaceholder')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.salaryMin')}</label>
                  <input type="number" value={jobForm.salaryMin} onChange={e => setJobForm(f => ({ ...f, salaryMin: e.target.value }))} placeholder="1000" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.salaryMax')}</label>
                  <input type="number" value={jobForm.salaryMax} onChange={e => setJobForm(f => ({ ...f, salaryMax: e.target.value }))} placeholder="2000" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.currency')}</label>
                  <select value={jobForm.salaryCurrency} onChange={e => setJobForm(f => ({ ...f, salaryCurrency: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="UAH">UAH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.requirements')}</label>
                <textarea value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.responsibilities')}</label>
                <textarea value={jobForm.responsibilities} onChange={e => setJobForm(f => ({ ...f, responsibilities: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.benefits')}</label>
                <textarea value={jobForm.benefits} onChange={e => setJobForm(f => ({ ...f, benefits: e.target.value }))} rows={2} placeholder={t('employer.jobForm.benefitsPlaceholder')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.category')}</label>
                <select value={jobForm.category} onChange={e => setJobForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">{t('employer.jobForm.categoryPlaceholder')}</option>
                  {JOB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{t(`jobCategories.${c.value}`)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('employer.jobForm.languages')}</label>
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
                      <span className="text-sm text-gray-700">{t(`jobLanguages.${lang.value}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {availableSkills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('employer.jobForm.skills')}</label>
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

              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jobForm.isUrgent} onChange={e => setJobForm(f => ({ ...f, isUrgent: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">{t('employer.jobForm.urgent')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jobForm.isRemote} onChange={e => setJobForm(f => ({ ...f, isRemote: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">{t('employer.jobForm.remote')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jobForm.isSalaryNegotiable} onChange={e => setJobForm(f => ({ ...f, isSalaryNegotiable: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">{t('employer.jobForm.negotiable')}</span>
                </label>
                {jobForm.jobType === 'internship' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={jobForm.isPaid} onChange={e => setJobForm(f => ({ ...f, isPaid: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-700">{t('employer.jobForm.paidInternship')}</span>
                  </label>
                )}
              </div>
              {jobForm.jobType === 'internship' && jobForm.isPaid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.stipend')}</label>
                  <input
                    type="number"
                    value={jobForm.stipendAmount}
                    onChange={e => setJobForm(f => ({ ...f, stipendAmount: e.target.value }))}
                    placeholder={t('employer.jobForm.stipendPlaceholder')}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('employer.jobForm.deadline')}</label>
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
              <button onClick={() => { setShowCreateJob(false); setEditingJob(null); resetJobForm(); }} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">{t('employer.jobForm.cancel')}</button>
              <button onClick={editingJob ? handleUpdateJob : handleCreateJob} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                {editingJob ? t('employer.jobForm.save') : t('employer.jobForm.create')}
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
              <h2 className="text-lg font-semibold text-gray-900">{t('employer.candidatePreview.title')}</h2>
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
                      <UserCircle size={15} /> {t('employer.candidatePreview.fullProfile')}
                    </Link>
                    <Link
                      href={`/chat?userId=${previewUser.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <MessageCircle size={15} /> {t('employer.candidatePreview.message')}
                    </Link>
                  </div>
                </div>

                {/* Skills */}
                {previewUser.skills && previewUser.skills.length > 0 && (
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('employer.candidatePreview.skills')}</h4>
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
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('employer.candidatePreview.languages')}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {previewUser.languages.map(l => (
                        <span key={l} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                          {t(`jobLanguages.${l}`) || l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work experience */}
                {(previewUser as any).workExperience?.length > 0 && (
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Briefcase size={13} /> {t('employer.candidatePreview.experience')}
                    </h4>
                    <div className="space-y-3">
                      {(previewUser as any).workExperience.map((exp: any, i: number) => (
                        <div key={i}>
                          <p className="font-medium text-sm text-gray-900">{exp.position}</p>
                          <p className="text-sm text-gray-500">{exp.company}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' }) : ''}
                            {' – '}
                            {exp.current ? t('employer.candidatePreview.current') : exp.endDate ? new Date(exp.endDate).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' }) : ''}
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
                      <GraduationCap size={13} /> {t('employer.candidatePreview.education')}
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
