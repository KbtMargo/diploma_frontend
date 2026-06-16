'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Briefcase, Building, BarChart3, Shield,
  TrendingUp, CheckCircle, XCircle, Clock,
  Search, Ban, UserCheck,
  ChevronLeft, ChevronRight, Loader2, Activity,
  RefreshCw, X, Mail, Calendar, MapPin, Award,
  AlertTriangle, Globe, Zap, Download, FileText,
} from 'lucide-react';
import api from '@/lib/axios';
import { ProfessionalReport } from '@/lib/reportFormatter';
import { openReportAsPDF } from '@/lib/pdfFormatter';
import { User, Job, Company, PaginatedResponse } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { LOCALE_TO_BCP47 } from '@/lib/i18n';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { translateToUk } from '@/lib/translate';
import toast from 'react-hot-toast';
import { formatRelativeDate } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

type Tab = 'dashboard' | 'users' | 'jobs' | 'companies' | 'analytics' | 'logs';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const INDUSTRY_KEY_MAP: Record<string, string> = {
  'Інформаційні технології': 'companies.industries.it',
  'IT-аутсорсинг': 'companies.industries.outsourcing',
  'Стартапи та продуктова розробка': 'companies.industries.startups',
  'Мобільна розробка': 'companies.industries.mobile',
  'Аналіз даних': 'companies.industries.data',
  'Дизайн': 'companies.industries.design',
  'DevOps & Cloud': 'companies.industries.devops',
};

const COUNTRY_KEY_MAP: Record<string, string> = {
  'Україна': 'admin.countries.ukraine',
  'Ukraine': 'admin.countries.ukraine',
  'Польща': 'admin.countries.poland',
  'Poland': 'admin.countries.poland',
  'Польша': 'admin.countries.poland',
  'Німеччина': 'admin.countries.germany',
  'Germany': 'admin.countries.germany',
  'США': 'admin.countries.usa',
  'USA': 'admin.countries.usa',
  'Велика Британія': 'admin.countries.uk',
  'United Kingdom': 'admin.countries.uk',
};

function RejectModal({
  job, onClose, onConfirm,
}: { job: Job; onClose: () => void; onConfirm: (reason: string) => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            {t('admin.jobs.rejectModal.title')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-1">{t('admin.jobs.rejectModal.job')} <span className="font-medium text-gray-800">{job.title}</span></p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('admin.jobs.rejectModal.placeholder')}
          rows={4}
          className="w-full mt-3 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            {t('admin.jobs.rejectModal.cancel')}
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            {t('admin.jobs.rejectModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User slide-over ──────────────────────────────────────────────────────────
function UserSlideOver({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useI18n();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/users/${user.id}`)
      .then((r) => setDetails(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900">{t('admin.users.slideOver.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Avatar & name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.role === 'admin' ? 'bg-red-100 text-red-700' :
                  user.role === 'employer' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {t(`admin.users.roles.${user.role}`) || user.role}
                </span>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3">
              <InfoRow icon={<Mail size={14} />} label={t('admin.users.slideOver.labels.email')} value={user.email} />
              <InfoRow icon={<Calendar size={14} />} label={t('admin.users.slideOver.labels.registered')} value={formatRelativeDate(user.createdAt, t)} />
              {user.country && <InfoRow icon={<MapPin size={14} />} label={t('admin.users.slideOver.labels.city')} value={`${user.city || ''}, ${user.country}`} />}
              <InfoRow
                icon={user.isActive ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                label={t('admin.users.slideOver.labels.status')}
                value={user.isActive ? t('admin.users.status.active') : t('admin.users.status.blocked')}
              />
              <InfoRow
                icon={<CheckCircle size={14} className={user.isEmailVerified ? 'text-green-500' : 'text-gray-400'} />}
                label={t('admin.users.slideOver.labels.emailVerified')}
                value={user.isEmailVerified ? t('admin.users.slideOver.yes') : t('admin.users.slideOver.no')}
              />
            </div>

            {/* Skills */}
            {details?.skills?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <Award size={12} /> {t('admin.users.slideOver.skills')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {details.skills.map((s: any) => (
                    <span key={s.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatMini label={t('admin.users.slideOver.stats.applications')} value={details?.applications?.length ?? 0} color="blue" />
              <StatMini label={t('admin.users.slideOver.stats.jobs')} value={details?.jobs?.length ?? 0} color="purple" />
            </div>

            {/* Summary */}
            {details?.summary && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t('admin.users.slideOver.about')}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{details.summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 w-4">{icon}</span>
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 truncate">{value}</span>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`p-3 rounded-xl border ${color === 'blue' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}`}>
      <p className={`text-xl font-bold ${color === 'blue' ? 'text-blue-700' : 'text-purple-700'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, limit, onChange }: {
  page: number; total: number; limit: number; onChange: (p: number) => void;
}) {
  const { t } = useI18n();
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-6 py-3">
      <p className="text-sm text-gray-500">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('admin.pagination.of')} {total}
      </p>
      <div className="flex gap-2">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-indigo-300 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-indigo-300 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Report helpers ───────────────────────────────────────────────────────────
function triggerJSONDownload(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function filterByRange(data: any[], from: string, to: string): any[] {
  return data.filter((d: any) => (!from || d.rawDate >= from) && (!to || d.rawDate <= to));
}

// ─── Report calculation helpers ───────────────────────────────────────────────
function calcGrowthRate(rows: any[], field: string): string {
  if (rows.length < 2) return 'Недостатньо даних';
  const first = rows[0][field];
  const last = rows[rows.length - 1][field];
  if (first === 0) return 'Н/Д';
  const growth = ((last - first) / first) * 100;
  return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% за період`;
}

function generateTrendAnalysis(rows: any[], field: string): any[] {
  return rows.slice(1).map((r, i) => {
    const prev = rows[i][field];
    const curr = r[field];
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    return {
      період: `${rows[i].місяць} → ${r.місяць}`,
      зміна: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      динаміка: change > 10 ? '📈 Стрімке зростання'
        : change > 0 ? '↗️ Помірне зростання'
        : change < -10 ? '📉 Стрімке падіння'
        : change < 0 ? '↘️ Помірне падіння'
        : '➡️ Стабільність',
      рекомендації: change > 20 ? '✅ Підтримуйте маркетингову активність'
        : change > 0 ? '💡 Можливе посилення рекламної кампанії'
        : change > -20 ? '⚠️ Проаналізуйте причини уповільнення'
        : '🚨 Терміново перегляньте стратегію залучення',
    };
  });
}

function generateJobMetrics(rows: any[]): any[] {
  const values = rows.map(r => r.нових_вакансій as number);
  const total = values.reduce((s, v) => s + v, 0);
  return [
    { метрика: 'Всього вакансій', значення: total, одиниця: 'шт' },
    { метрика: 'Середня кількість', значення: (total / rows.length).toFixed(1), одиниця: 'вакансій/міс' },
    { метрика: 'Максимум за місяць', значення: Math.max(...values), одиниця: 'вакансій' },
    { метрика: 'Мінімум за місяць', значення: Math.min(...values), одиниця: 'вакансій' },
  ];
}

function getStatusWithEmoji(status: string): string {
  const m: Record<string, string> = {
    'Очікує': '⏳ Очікує', 'Прийнято': '✅ Прийнято',
    'Відхилено': '❌ Відхилено', 'Переглянуто': '👁️ Переглянуто',
  };
  return m[status] ?? status;
}

function getStatusBadge(status: string): string {
  const m: Record<string, string> = {
    'Очікує': 'На розгляді', 'Прийнято': 'Схвалено',
    'Відхилено': 'Відхилено', 'Переглянуто': 'Переглянуто',
  };
  return m[status] ?? status;
}

function generateProgressBar(value: number, total: number, width = 20): string {
  const pct = total > 0 ? value / total : 0;
  const filled = Math.round(pct * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${(pct * 100).toFixed(0)}%`;
}

function calcConversionRate(appsByStatus: any[]): string {
  const accepted = appsByStatus.find(a => a.name === 'Прийнято')?.value ?? 0;
  const total = appsByStatus.reduce((s, a) => s + a.value, 0);
  if (total === 0) return '0%';
  return `${((accepted / total) * 100).toFixed(1)}% (${accepted} з ${total})`;
}

function generateApplicationInsights(appsByStatus: any[], totalJobs: number, totalApplications: number): any[] {
  const total = appsByStatus.reduce((s, a) => s + a.value, 0);
  const accepted = appsByStatus.find(a => a.name === 'Прийнято')?.value ?? 0;
  const rejected = appsByStatus.find(a => a.name === 'Відхилено')?.value ?? 0;
  return [
    { показник: 'Загальна кількість заявок', значення: total, деталі: `${(total / (totalJobs || 1)).toFixed(1)} на вакансію` },
    { показник: 'Успішні найми', значення: accepted, деталі: `${((accepted / (total || 1)) * 100).toFixed(1)}% конверсія` },
    { показник: 'Відмови', значення: rejected, деталі: `${((rejected / (total || 1)) * 100).toFixed(1)}% від загального` },
    { показник: 'Ефективність', значення: accepted > rejected ? '👍 Позитивна' : '⚠️ Потребує покращення', деталі: '' },
  ];
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0, totalJobs: 0, totalCompanies: 0, totalApplications: 0,
    activeJobs: 0, pendingJobs: 0, verifiedCompanies: 0, newUsersToday: 0,
    pendingCompanies: 0, pendingApplications: 0,
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRole, setUsersRole] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Jobs
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsSearch, setJobsSearch] = useState('');
  const [jobsStatusFilter, setJobsStatusFilter] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<Job | null>(null);

  // Companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesStatusFilter, setCompaniesStatusFilter] = useState('');

  // Analytics
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  // Report date range (default: last 12 months)
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 7);
  });
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().slice(0, 7));

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get('/users/profile');
        if (res.data.role !== 'admin') { router.push('/'); return; }
        fetchDashboard();
      } catch {
        router.push('/auth/login');
      }
    };
    check();
  }, []);

  // Auto-refresh dashboard every 30 s
  useEffect(() => {
    if (activeTab === 'dashboard') {
      refreshTimer.current = setInterval(() => fetchDashboard(true), 30_000);
    }
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [activeTab]);

  // Tab-driven fetches
  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, usersPage, usersSearch, usersRole]);
  useEffect(() => { if (activeTab === 'jobs') { setSelectedJobIds(new Set()); fetchJobs(); } }, [activeTab, jobsPage, jobsSearch, jobsStatusFilter, locale]);
  useEffect(() => { if (activeTab === 'companies') fetchCompanies(); }, [activeTab, companiesPage, companiesStatusFilter]);
  useEffect(() => { if (activeTab === 'analytics') fetchAnalytics(); }, [activeTab, locale]);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(); }, [activeTab, logsPage]);

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.get('/admin/dashboard');
      const d = res.data;
      setStats({
        totalUsers: d.users?.total ?? 0,
        newUsersToday: d.users?.newToday ?? 0,
        totalJobs: d.jobs?.total ?? 0,
        activeJobs: d.jobs?.active ?? 0,
        pendingJobs: d.jobs?.pending ?? 0,
        totalCompanies: d.companies?.total ?? 0,
        verifiedCompanies: (d.companies?.total ?? 0) - (d.companies?.pending ?? 0),
        pendingCompanies: d.companies?.pending ?? 0,
        totalApplications: d.applications?.total ?? 0,
        pendingApplications: d.applications?.pending ?? 0,
      });
      setLastRefreshed(new Date());
    } catch {
      if (!silent) toast.error(t('admin.toast.loadError'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(usersPage), limit: '10' });
      if (usersSearch) params.append('search', usersSearch);
      if (usersRole) params.append('role', usersRole);
      const res = await api.get<PaginatedResponse<User>>(`/admin/users?${params}`);
      setUsers(res.data.data);
      setUsersTotal(res.data.meta.total);
    } catch { toast.error(t('admin.toast.usersError')); }
    finally { setIsLoading(false); }
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(jobsPage), limit: '10' });
      if (jobsSearch) {
        const translatedSearch = await translateToUk(jobsSearch, locale);
        params.append('search', translatedSearch);
      }
      if (jobsStatusFilter) params.append('status', jobsStatusFilter);
      const res = await api.get<PaginatedResponse<Job>>(`/admin/jobs?${params}`);
      setJobs(res.data.data);
      setJobsTotal(res.data.meta.total);
    } catch { toast.error(t('admin.toast.jobsError')); }
    finally { setIsLoading(false); }
  };

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(companiesPage), limit: '10' });
      if (companiesStatusFilter) params.append('status', companiesStatusFilter);
      const res = await api.get<PaginatedResponse<Company>>(`/admin/companies?${params}`);
      setCompanies(res.data.data);
      setCompaniesTotal(res.data.meta.total);
    } catch { toast.error(t('admin.toast.companiesError')); }
    finally { setIsLoading(false); }
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, skillsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/skills/top?limit=10'),
      ]);

      const a = analyticsRes.data;

      const userGrowth = (a.userGrowth ?? []).map((r: any) => ({
        date: new Date(r.date).toLocaleDateString(LOCALE_TO_BCP47[locale], { month: 'short', year: '2-digit' }),
        rawDate: new Date(r.date).toISOString().slice(0, 7),
        value: Number(r.count),
      }));

      const jobPostings = (a.jobPostings ?? []).map((r: any) => ({
        date: new Date(r.date).toLocaleDateString(LOCALE_TO_BCP47[locale], { month: 'short', year: '2-digit' }),
        rawDate: new Date(r.date).toISOString().slice(0, 7),
        value: Number(r.count),
      }));

      const appsByStatus = (a.applicationsByStatus ?? []).map((r: any) => ({
        name: t(`admin.analytics.appStatus.${r.status}`) || r.status,
        value: Number(r.count),
      }));

      const topCountries = (a.topCountries ?? []).map((r: any) => ({
        name: COUNTRY_KEY_MAP[r.country] ? t(COUNTRY_KEY_MAP[r.country]) : r.country,
        value: Number(r.count),
      }));

      const topIndustries = (a.topIndustries ?? []).map((r: any) => ({
        name: INDUSTRY_KEY_MAP[r.industry] ? t(INDUSTRY_KEY_MAP[r.industry]) : r.industry,
        value: Number(r.count),
      }));

      const topSkills = (skillsRes.data ?? []).map((r: any) => ({
        name: r.name,
        value: r.count,
      }));

      setAnalyticsData({ userGrowth, jobPostings, appsByStatus, topCountries, topIndustries, topSkills });
    } catch { toast.error(t('admin.toast.analyticsError')); }
    finally { setIsLoading(false); }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/audit-logs?page=${logsPage}&limit=20`);
      setAuditLogs(res.data.data ?? []);
      setLogsTotal(res.data.meta?.total ?? 0);
    } catch { toast.error(t('admin.toast.logsError')); }
    finally { setIsLoading(false); }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleBlockUser = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/admin/users/${id}/${isActive ? 'block' : 'unblock'}`);
      toast.success(isActive ? t('admin.toast.userBlocked') : t('admin.toast.userUnblocked'));
      fetchUsers();
    } catch { toast.error(t('admin.toast.error')); }
  };

  const handleChangeRole = async (id: string, role: string) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      toast.success(t('admin.toast.roleChanged'));
      fetchUsers();
    } catch { toast.error(t('admin.toast.error')); }
  };

  const handleModerateJob = async (id: string, status: string, reason = '') => {
    try {
      await api.put(`/admin/jobs/${id}/moderate`, { status, reason: reason || undefined });
      toast.success(status === 'active' ? t('admin.toast.jobApproved') : status === 'rejected' ? t('admin.toast.jobRejected') : t('admin.toast.statusUpdated'));
      setRejectTarget(null);
      fetchJobs();
    } catch { toast.error(t('admin.toast.error')); }
  };

  const handleBulkApprove = async () => {
    if (selectedJobIds.size === 0) return;
    try {
      await Promise.all([...selectedJobIds].map((id) => api.put(`/admin/jobs/${id}/moderate`, { status: 'active' })));
      toast.success(t('admin.toast.bulkApproved', { count: selectedJobIds.size }));
      setSelectedJobIds(new Set());
      fetchJobs();
    } catch { toast.error(t('admin.toast.bulkError')); }
  };

  const handleVerifyCompany = async (id: string) => {
    try {
      await api.post(`/admin/companies/${id}/verify`);
      toast.success(t('admin.toast.companyVerified'));
      fetchCompanies();
    } catch { toast.error(t('admin.toast.error')); }
  };

  const handleSuspendCompany = async (id: string) => {
    try {
      await api.put(`/admin/companies/${id}/suspend`);
      toast.success(t('admin.toast.companySuspended'));
      fetchCompanies();
    } catch { toast.error(t('admin.toast.error')); }
  };

  const filteredGrowth = filterByRange(analyticsData?.userGrowth ?? [], reportDateFrom, reportDateTo);
  const filteredJobPostings = filterByRange(analyticsData?.jobPostings ?? [], reportDateFrom, reportDateTo);

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const handleReportSummary = () => {
    const now = new Date();
    const months = Math.max(analyticsData?.userGrowth?.length ?? 1, 1);
    const approvalRate = stats.totalJobs > 0 ? ((stats.activeJobs / stats.totalJobs) * 100).toFixed(1) : '0';
    const verifRate = stats.totalCompanies > 0 ? ((stats.verifiedCompanies / stats.totalCompanies) * 100).toFixed(1) : '0';
    const avgApps = stats.totalJobs > 0 ? (stats.totalApplications / stats.totalJobs).toFixed(1) : '0';
    const report: ProfessionalReport = {
      title: '🏢 ЗВЕДЕНИЙ ЗВІТ ПЛАТФОРМИ',
      subtitle: 'Комплексна аналітика показників платформи StartWay',
      generatedAt: now.toLocaleString('uk-UA', { dateStyle: 'full', timeStyle: 'long' }),
      dateRange: { from: reportDateFrom, to: reportDateTo },
      summary: {
        '👥 Всього користувачів': stats.totalUsers.toLocaleString('uk-UA'),
        '🆕 Нових сьогодні': stats.newUsersToday.toLocaleString('uk-UA'),
        '💼 Всього вакансій': stats.totalJobs.toLocaleString('uk-UA'),
        '✅ Активних вакансій': `${stats.activeJobs.toLocaleString('uk-UA')} (${approvalRate}%)`,
        '🏗️ Всього компаній': stats.totalCompanies.toLocaleString('uk-UA'),
        '📋 Всього заявок': stats.totalApplications.toLocaleString('uk-UA'),
      },
      sections: [
        {
          title: '👥 користувачі',
          rows: [
            { показник: 'Всього зареєстровано', значення: stats.totalUsers, деталі: '' },
            { показник: 'Нових за сьогодні', значення: stats.newUsersToday, деталі: `+${((stats.newUsersToday / (stats.totalUsers || 1)) * 100).toFixed(2)}% за добу` },
            { показник: 'Ср. реєстрацій/місяць', значення: Math.round(stats.totalUsers / months), деталі: 'за весь час спостереження' },
          ],
        },
        {
          title: '💼 вакансії',
          rows: [
            { показник: 'Всього вакансій', значення: stats.totalJobs, деталі: '' },
            { показник: 'Активних вакансій', значення: stats.activeJobs, деталі: `${approvalRate}% від всіх` },
            { показник: 'На модерації', значення: stats.pendingJobs, деталі: `${((stats.pendingJobs / (stats.totalJobs || 1)) * 100).toFixed(1)}% від всіх` },
          ],
        },
        {
          title: '🏗️ компанії',
          rows: [
            { показник: 'Всього компаній', значення: stats.totalCompanies, деталі: '' },
            { показник: 'Верифіковано', значення: stats.verifiedCompanies, деталі: `${verifRate}% від всіх` },
            { показник: 'Очікують перевірки', значення: stats.pendingCompanies, деталі: '' },
          ],
        },
        {
          title: '📋 заявки',
          rows: [
            { показник: 'Всього заявок', значення: stats.totalApplications, деталі: '' },
            { показник: 'Очікують розгляду', значення: stats.pendingApplications, деталі: `${((stats.pendingApplications / (stats.totalApplications || 1)) * 100).toFixed(1)}% від всіх` },
            { показник: 'Ср. заявок на вакансію', значення: avgApps, деталі: '' },
          ],
        },
      ],
    };
    openReportAsPDF(report);
  };

  const handleReportUserGrowth = () => {
    if (!filteredGrowth.length) return toast.error(t('admin.toast.analyticsError'));
    let cumulative = 0;
    const rows = filteredGrowth.map((r: any, i: number) => {
      const prev = i > 0 ? filteredGrowth[i - 1].value : null;
      cumulative += r.value;
      const pct = prev != null && prev > 0 ? `${(((r.value - prev) / prev) * 100).toFixed(1)}%` : '—';
      return {
        місяць: r.date, 'YYYY-MM': r.rawDate,
        нових_реєстрацій: r.value,
        наростаючий_підсумок: cumulative,
        зміна_відн_попереднього: pct,
        тренд: prev == null ? '—' : r.value > prev ? '📈 зростання' : r.value < prev ? '📉 спадання' : '➡️ стабільно',
      };
    });
    const totalReg = cumulative;
    const avgMonthly = Math.round(totalReg / filteredGrowth.length);
    const bestMonth = rows.reduce((b, c) => c.нових_реєстрацій > b.нових_реєстрацій ? c : b, rows[0]);
    const worstMonth = rows.reduce((b, c) => c.нових_реєстрацій < b.нових_реєстрацій ? c : b, rows[0]);
    const report: ProfessionalReport = {
      title: '📊 ЗВІТ ЗРОСТАННЯ КОРИСТУВАЧІВ',
      subtitle: 'Динаміка реєстрацій та активності користувачів на платформі StartWay',
      generatedAt: new Date().toLocaleString('uk-UA', { dateStyle: 'full', timeStyle: 'long' }),
      dateRange: { from: reportDateFrom, to: reportDateTo },
      summary: {
        'Всього зареєстрованих': `${totalReg.toLocaleString('uk-UA')} осіб`,
        'Середньомісячний приріст': `${avgMonthly.toLocaleString('uk-UA')} осіб/міс`,
        'Найактивніший місяць': `${bestMonth.місяць} (${bestMonth.нових_реєстрацій} нових)`,
        'Найменш активний місяць': `${worstMonth.місяць} (${worstMonth.нових_реєстрацій} нових)`,
        'Темп зростання за період': calcGrowthRate(rows, 'нових_реєстрацій'),
      },
      sections: [
        { title: 'користувачі', rows, metadata: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' } },
        { title: 'аналітика трендів', rows: generateTrendAnalysis(rows, 'нових_реєстрацій'), metadata: { backgroundColor: '#ECFDF5', borderColor: '#10B981' } },
      ],
    };
    openReportAsPDF(report);
  };

  const handleReportJobPostings = () => {
    if (!filteredJobPostings.length) return toast.error(t('admin.toast.analyticsError'));
    let cumulative = 0;
    const rows = filteredJobPostings.map((r: any, i: number) => {
      const prev = i > 0 ? filteredJobPostings[i - 1].value : null;
      cumulative += r.value;
      const pct = prev != null && prev > 0 ? `${(((r.value - prev) / prev) * 100).toFixed(1)}%` : '—';
      return {
        місяць: r.date, 'YYYY-MM': r.rawDate,
        нових_вакансій: r.value,
        наростаючий_підсумок: cumulative,
        зміна_відн_попереднього: pct,
        тренд: prev == null ? '—' : r.value > prev ? '📈 зростання' : r.value < prev ? '📉 спадання' : '➡️ стабільно',
      };
    });
    const activeRate = stats.totalJobs > 0
      ? `${((stats.activeJobs / stats.totalJobs) * 100).toFixed(1)}%`
      : '0%';
    const report: ProfessionalReport = {
      title: '💼 ЗВІТ ВАКАНСІЙ',
      subtitle: 'Аналітика публікацій вакансій та ринку праці на платформі StartWay',
      generatedAt: new Date().toLocaleString('uk-UA', { dateStyle: 'full', timeStyle: 'long' }),
      dateRange: { from: reportDateFrom, to: reportDateTo },
      summary: {
        'Всього опубліковано': `${cumulative.toLocaleString('uk-UA')} вакансій`,
        'Активних вакансій': `${stats.activeJobs.toLocaleString('uk-UA')} (${activeRate})`,
        'На модерації': `${stats.pendingJobs.toLocaleString('uk-UA')} вакансій`,
        'Середньомісячна публікація': `${Math.round(cumulative / filteredJobPostings.length).toLocaleString('uk-UA')} вакансій/міс`,
        'Темп зростання за період': calcGrowthRate(rows, 'нових_вакансій'),
      },
      sections: [
        { title: 'вакансії', rows, metadata: { backgroundColor: '#F5F3FF', borderColor: '#8B5CF6' } },
        { title: 'метрики ефективності', rows: generateJobMetrics(rows), metadata: { backgroundColor: '#FFF7ED', borderColor: '#F97316' } },
      ],
    };
    openReportAsPDF(report);
  };

  const handleReportApplications = () => {
    if (!analyticsData?.appsByStatus?.length) return toast.error(t('admin.toast.analyticsError'));
    const total = analyticsData.appsByStatus.reduce((s: number, r: any) => s + r.value, 0);
    const pendingRate = stats.totalApplications > 0
      ? `${((stats.pendingApplications / stats.totalApplications) * 100).toFixed(1)}%`
      : '0%';
    const statusRows = analyticsData.appsByStatus.map((r: any, i: number) => ({
      місце: i + 1,
      статус: getStatusWithEmoji(r.name),
      кількість: r.value,
      відсоток: total > 0 ? `${((r.value / total) * 100).toFixed(1)}%` : '0%',
      візуалізація: generateProgressBar(r.value, total),
      бейдж: getStatusBadge(r.name),
    }));
    const report: ProfessionalReport = {
      title: '📋 ЗВІТ ЗАЯВОК',
      subtitle: 'Статистика відгуків та процесів найму на платформі StartWay',
      generatedAt: new Date().toLocaleString('uk-UA', { dateStyle: 'full', timeStyle: 'long' }),
      dateRange: { from: reportDateFrom, to: reportDateTo },
      summary: {
        'Всього заявок': `${total.toLocaleString('uk-UA')}`,
        'Очікують розгляду': `${stats.pendingApplications.toLocaleString('uk-UA')} (${pendingRate})`,
        'Ср. заявок на вакансію': `${stats.totalJobs > 0 ? (stats.totalApplications / stats.totalJobs).toFixed(1) : '0'} заявок/вакансія`,
        'Загальна конверсія (прийнято)': calcConversionRate(analyticsData.appsByStatus),
      },
      sections: [
        { title: 'розподіл за статусами', rows: statusRows, metadata: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' } },
        { title: 'аналітика ефективності', rows: generateApplicationInsights(analyticsData.appsByStatus, stats.totalJobs, stats.totalApplications), metadata: { backgroundColor: '#E0F2FE', borderColor: '#0EA5E9' } },
      ],
    };
    openReportAsPDF(report);
  };

  const handleReportSkills = () => {
    if (!analyticsData?.topSkills?.length) return toast.error(t('admin.toast.analyticsError'));
    const total = analyticsData.topSkills.reduce((s: number, r: any) => s + r.value, 0);
    const top = analyticsData.topSkills[0]?.value || 1;
    const rows = analyticsData.topSkills.map((r: any, i: number) => ({
      місце: i + 1,
      навичка: r.name,
      кількість_вакансій: r.value,
      відсоток: total > 0 ? `${((r.value / total) * 100).toFixed(1)}%` : '0%',
      відносно_топу: `${((r.value / top) * 100).toFixed(0)}%`,
      рейтинг: '★'.repeat(Math.min(5, Math.max(1, Math.round((r.value / top) * 5)))),
    }));
    const total2 = analyticsData.topSkills.reduce((s: number, r: any) => s + r.value, 0);
    const report: ProfessionalReport = {
      title: '🎯 ЗВІТ ТОП НАВИЧОК',
      subtitle: 'Рейтинг затребуваних навичок серед вакансій платформи StartWay',
      generatedAt: new Date().toLocaleString('uk-UA', { dateStyle: 'full', timeStyle: 'long' }),
      dateRange: { from: reportDateFrom, to: reportDateTo },
      summary: {
        'Всього навичок у рейтингу': rows.length,
        'Топ навичка': `${rows[0]?.навичка ?? '—'} (${rows[0]?.кількість_вакансій ?? 0} вакансій)`,
        'Загальна кількість вакансій': total2.toLocaleString('uk-UA'),
      },
      sections: [
        { title: '🏆 рейтинг навичок', rows },
      ],
    };
    openReportAsPDF(report);
  };

  const handleReportFull = () => {
    if (!analyticsData) return toast.error(t('admin.toast.analyticsError'));
    const totalApps = analyticsData.appsByStatus.reduce((s: number, r: any) => s + r.value, 0);
    const totalSkills = analyticsData.topSkills.reduce((s: number, r: any) => s + r.value, 0);
    const report = {
      metadata: {
        platform: 'StartWay',
        title: 'Повний аналітичний звіт платформи',
        generated_at: new Date().toISOString(),
        date_range: { from: reportDateFrom, to: reportDateTo },
        data_points: { user_growth_months: filteredGrowth.length, job_postings_months: filteredJobPostings.length },
        version: '2.0',
      },
      summary: {
        users: {
          total: stats.totalUsers, new_today: stats.newUsersToday,
          daily_growth_pct: stats.totalUsers > 0 ? +((stats.newUsersToday / stats.totalUsers) * 100).toFixed(2) : 0,
        },
        jobs: {
          total: stats.totalJobs, active: stats.activeJobs, pending_moderation: stats.pendingJobs,
          active_rate_pct: stats.totalJobs > 0 ? +((stats.activeJobs / stats.totalJobs) * 100).toFixed(1) : 0,
        },
        companies: {
          total: stats.totalCompanies, verified: stats.verifiedCompanies, pending: stats.pendingCompanies,
          verification_rate_pct: stats.totalCompanies > 0 ? +((stats.verifiedCompanies / stats.totalCompanies) * 100).toFixed(1) : 0,
        },
        applications: {
          total: stats.totalApplications, pending: stats.pendingApplications,
          avg_per_job: stats.totalJobs > 0 ? +(stats.totalApplications / stats.totalJobs).toFixed(2) : 0,
          pending_rate_pct: stats.totalApplications > 0 ? +((stats.pendingApplications / stats.totalApplications) * 100).toFixed(1) : 0,
        },
      },
      trends: {
        user_growth: filteredGrowth.map((r: any) => ({ month: r.date, period: r.rawDate, registrations: r.value })),
        job_postings: filteredJobPostings.map((r: any) => ({ month: r.date, period: r.rawDate, postings: r.value })),
      },
      distributions: {
        by_application_status: analyticsData.appsByStatus.map((r: any) => ({
          status: r.name, count: r.value,
          pct: totalApps > 0 ? +((r.value / totalApps) * 100).toFixed(1) : 0,
        })),
        by_country: analyticsData.topCountries.map((r: any) => ({ country: r.name, users: r.value })),
        by_industry: analyticsData.topIndustries.map((r: any) => ({ industry: r.name, jobs: r.value })),
      },
      top_skills: analyticsData.topSkills.map((r: any, i: number) => ({
        rank: i + 1, skill: r.name, job_count: r.value,
        pct_of_tracked: totalSkills > 0 ? +((r.value / totalSkills) * 100).toFixed(1) : 0,
      })),
      computed_metrics: {
        avg_applications_per_job: stats.totalJobs > 0 ? +(stats.totalApplications / stats.totalJobs).toFixed(2) : 0,
        job_active_rate_pct: stats.totalJobs > 0 ? +((stats.activeJobs / stats.totalJobs) * 100).toFixed(1) : 0,
        company_verification_rate_pct: stats.totalCompanies > 0 ? +((stats.verifiedCompanies / stats.totalCompanies) * 100).toFixed(1) : 0,
        total_pending_review: stats.pendingJobs + stats.pendingApplications + stats.pendingCompanies,
      },
    };
    triggerJSONDownload(report, `startway_full_report_${todayStr()}.json`);
  };

  const toggleJobSelect = (id: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllJobs = () => {
    if (selectedJobIds.size === jobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(jobs.map((j) => j.id)));
    }
  };

  // ── Report definitions (sidebar list) ───────────────────────────────────────
  const reportDefs = [
    { id: 'summary', name: t('admin.analytics.reports.summary'), desc: t('admin.analytics.reports.summaryDesc'), icon: BarChart3, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', format: 'PDF' as const, handler: handleReportSummary, disabled: false },
    { id: 'userGrowth', name: t('admin.analytics.reports.userGrowth'), desc: t('admin.analytics.reports.userGrowthDesc'), icon: TrendingUp, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', format: 'PDF' as const, handler: handleReportUserGrowth, disabled: !filteredGrowth.length },
    { id: 'jobPostings', name: t('admin.analytics.reports.jobPostings'), desc: t('admin.analytics.reports.jobPostingsDesc'), icon: Briefcase, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', format: 'PDF' as const, handler: handleReportJobPostings, disabled: !filteredJobPostings.length },
    { id: 'applications', name: t('admin.analytics.reports.applications'), desc: t('admin.analytics.reports.applicationsDesc'), icon: Activity, iconBg: 'bg-orange-100', iconColor: 'text-orange-600', format: 'PDF' as const, handler: handleReportApplications, disabled: !analyticsData?.appsByStatus?.length },
    { id: 'skills', name: t('admin.analytics.reports.skills'), desc: t('admin.analytics.reports.skillsDesc'), icon: Award, iconBg: 'bg-green-100', iconColor: 'text-green-600', format: 'PDF' as const, handler: handleReportSkills, disabled: !analyticsData?.topSkills?.length },
    { id: 'full', name: t('admin.analytics.reports.full'), desc: t('admin.analytics.reports.fullDesc'), icon: Globe, iconBg: 'bg-gray-100', iconColor: 'text-gray-600', format: 'JSON' as const, handler: handleReportFull, disabled: !analyticsData },
  ];

  // ── Tabs config ──────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'dashboard', label: t('admin.tabs.dashboard'), icon: BarChart3 },
    { id: 'analytics', label: t('admin.tabs.analytics'), icon: TrendingUp },
    { id: 'users', label: t('admin.tabs.users'), icon: Users },
    { id: 'jobs', label: t('admin.tabs.jobs'), icon: Briefcase },
    { id: 'companies', label: t('admin.tabs.companies'), icon: Building },
    { id: 'logs', label: t('admin.tabs.logs'), icon: Activity },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      {rejectTarget && (
        <RejectModal
          job={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => handleModerateJob(rejectTarget.id, 'rejected', reason)}
        />
      )}
      {selectedUser && (
        <UserSlideOver user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('admin.title')}</h1>
              <p className="text-xs text-gray-500">{t('admin.subtitle')}</p>
            </div>
          </div>
          {lastRefreshed && activeTab === 'dashboard' && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <RefreshCw size={12} />
              {t('admin.updated')} {lastRefreshed.toLocaleTimeString(LOCALE_TO_BCP47[locale], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.id === 'jobs' && stats.pendingJobs > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.pendingJobs}
                </span>
              )}
              {tab.id === 'companies' && stats.pendingCompanies > 0 && (
                <span className="bg-purple-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.pendingCompanies}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t('admin.dashboard.cards.users'), value: stats.totalUsers, icon: Users, color: 'blue', sub: t('admin.dashboard.cards.today', { count: stats.newUsersToday }), badge: stats.newUsersToday },
                { label: t('admin.dashboard.cards.jobs'), value: stats.totalJobs, icon: Briefcase, color: 'indigo', sub: t('admin.dashboard.cards.activeJobs', { count: stats.activeJobs }) },
                { label: t('admin.dashboard.cards.companies'), value: stats.totalCompanies, icon: Building, color: 'purple', sub: t('admin.dashboard.cards.verified', { count: stats.verifiedCompanies }) },
                { label: t('admin.dashboard.cards.pending'), value: stats.pendingJobs, icon: Clock, color: 'yellow', sub: t('admin.dashboard.cards.pendingJobs') },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl p-6 border border-gray-200 relative overflow-hidden">
                  {card.badge && card.badge > 0 && (
                    <span className="absolute top-3 right-3 bg-green-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t('admin.dashboard.cards.new')}</span>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    card.color === 'blue' ? 'bg-blue-100' : card.color === 'indigo' ? 'bg-indigo-100' :
                    card.color === 'purple' ? 'bg-purple-100' : 'bg-yellow-100'
                  }`}>
                    <card.icon size={20} className={
                      card.color === 'blue' ? 'text-blue-600' : card.color === 'indigo' ? 'text-indigo-600' :
                      card.color === 'purple' ? 'text-purple-600' : 'text-yellow-600'
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
              <h2 className="font-semibold text-gray-900 mb-4">{t('admin.dashboard.quickActions.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: t('admin.dashboard.quickActions.moderateJobs'), count: stats.pendingJobs, tab: 'jobs', color: 'yellow' },
                  { label: t('admin.dashboard.quickActions.verifyCompanies'), count: stats.pendingCompanies, tab: 'companies', color: 'purple' },
                  { label: t('admin.dashboard.quickActions.pendingApps'), count: stats.pendingApplications, tab: 'analytics', color: 'green' },
                  { label: t('admin.dashboard.quickActions.totalApps'), count: stats.totalApplications, tab: 'analytics', color: 'indigo' },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setActiveTab(action.tab as Tab)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm ${
                      action.color === 'yellow' ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300' :
                      action.color === 'purple' ? 'border-purple-200 bg-purple-50 hover:border-purple-300' :
                      action.color === 'green' ? 'border-green-200 bg-green-50 hover:border-green-300' :
                      'border-indigo-200 bg-indigo-50 hover:border-indigo-300'
                    }`}
                  >
                    <p className={`text-2xl font-bold ${
                      action.color === 'yellow' ? 'text-yellow-700' : action.color === 'purple' ? 'text-purple-700' :
                      action.color === 'green' ? 'text-green-700' : 'text-indigo-700'
                    }`}>{action.count}</p>
                    <p className="text-sm text-gray-600 mt-1">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-48 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={usersSearch}
                  onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
                  placeholder={t('admin.users.search')}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <select value={usersRole} onChange={(e) => { setUsersRole(e.target.value); setUsersPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('admin.users.allRoles')}</option>
                <option value="job_seeker">{t('admin.users.roles.job_seeker')}</option>
                <option value="employer">{t('admin.users.roles.employer')}</option>
                <option value="admin">{t('admin.users.roles.admin')}</option>
              </select>
              <span className="px-3 py-2 text-sm text-gray-500">{t('admin.users.total')} {usersTotal}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {isLoading ? <LoadingSpinner /> : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.users.table.user')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.users.table.role')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.users.table.status')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.users.table.date')}</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.users.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <button onClick={() => setSelectedUser(user)} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
                            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-700 shrink-0">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm underline decoration-dashed decoration-indigo-300">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <select value={user.role} onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border font-medium focus:outline-none cursor-pointer ${
                              user.role === 'admin' ? 'bg-red-50 border-red-200 text-red-700' :
                              user.role === 'employer' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                              'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                            <option value="job_seeker">{t('admin.users.roles.job_seeker')}</option>
                            <option value="employer">{t('admin.users.roles.employer')}</option>
                            <option value="admin">{t('admin.users.roles.admin')}</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                            user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.isActive ? <><CheckCircle size={10} />{t('admin.users.status.active')}</> : <><XCircle size={10} />{t('admin.users.status.blocked')}</>}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">{formatRelativeDate(user.createdAt, t)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleBlockUser(user.id, user.isActive)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              user.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}>
                            {user.isActive ? <><Ban size={12} className="inline mr-1" />{t('admin.users.block')}</> : <><UserCheck size={12} className="inline mr-1" />{t('admin.users.unblock')}</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Pagination page={usersPage} total={usersTotal} limit={10} onChange={setUsersPage} />
          </div>
        )}

        {/* ── JOBS TAB ── */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-48 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={jobsSearch} onChange={(e) => { setJobsSearch(e.target.value); setJobsPage(1); }}
                  placeholder={t('admin.jobs.search')}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <select value={jobsStatusFilter} onChange={(e) => { setJobsStatusFilter(e.target.value); setJobsPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('admin.jobs.allStatuses')}</option>
                <option value="pending">{t('admin.jobs.filterStatus.pending')}</option>
                <option value="active">{t('admin.jobs.filterStatus.active')}</option>
                <option value="rejected">{t('admin.jobs.filterStatus.rejected')}</option>
                <option value="inactive">{t('admin.jobs.filterStatus.inactive')}</option>
              </select>
              {selectedJobIds.size > 0 && (
                <button onClick={handleBulkApprove}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  <Zap size={14} />
                  {t('admin.jobs.bulkApprove', { count: selectedJobIds.size })}
                </button>
              )}
              <span className="px-3 py-2 text-sm text-gray-500">{t('admin.jobs.total')} {jobsTotal}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {isLoading ? <LoadingSpinner /> : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={selectedJobIds.size === jobs.length && jobs.length > 0}
                          onChange={toggleAllJobs}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.jobs.table.job')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.jobs.table.employer')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.jobs.table.status')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.jobs.table.date')}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.jobs.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map((job) => (
                      <AdminJobRow
                        key={job.id}
                        job={job}
                        selected={selectedJobIds.has(job.id)}
                        onSelect={() => toggleJobSelect(job.id)}
                        onModerate={handleModerateJob}
                        onReject={setRejectTarget}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Pagination page={jobsPage} total={jobsTotal} limit={10} onChange={setJobsPage} />
          </div>
        )}

        {/* ── COMPANIES TAB ── */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
              <select value={companiesStatusFilter} onChange={(e) => { setCompaniesStatusFilter(e.target.value); setCompaniesPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('admin.companies.allStatuses')}</option>
                <option value="pending">{t('admin.companies.filterStatus.pending')}</option>
                <option value="active">{t('admin.companies.filterStatus.active')}</option>
                <option value="verified">{t('admin.companies.filterStatus.verified')}</option>
                <option value="suspended">{t('admin.companies.filterStatus.suspended')}</option>
              </select>
              <span className="px-3 py-2 text-sm text-gray-500">{t('admin.companies.total')} {companiesTotal}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {isLoading ? <LoadingSpinner /> : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.companies.table.company')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.companies.table.industry')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.companies.table.status')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.companies.table.jobs')}</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.companies.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {companies.map((company) => (
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
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {company.industry ? (INDUSTRY_KEY_MAP[company.industry] ? t(INDUSTRY_KEY_MAP[company.industry]) : company.industry) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              company.status === 'verified' ? 'bg-green-100 text-green-700' :
                              company.status === 'active' ? 'bg-blue-100 text-blue-700' :
                              company.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              company.status === 'suspended' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {company.status === 'verified' ? t('admin.companies.companyStatus.verified') :
                               company.status === 'active' ? t('admin.companies.companyStatus.active') :
                               company.status === 'pending' ? t('admin.companies.companyStatus.pending') :
                               company.status === 'suspended' ? t('admin.companies.companyStatus.suspended') : company.status}
                            </span>
                            {company.isVerified && <CheckCircle size={14} className="text-green-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{company.totalJobsPosted || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!company.isVerified && company.status !== 'suspended' && (
                              <button onClick={() => handleVerifyCompany(company.id)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
                                <CheckCircle size={12} className="inline mr-1" />{t('admin.companies.verify')}
                              </button>
                            )}
                            {company.status !== 'suspended' && (
                              <button onClick={() => handleSuspendCompany(company.id)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                                <Ban size={12} className="inline mr-1" />{t('admin.companies.suspend')}
                              </button>
                            )}
                            {company.status === 'suspended' && (
                              <span className="text-xs text-red-500 font-medium">{t('admin.companies.suspendedLabel')}</span>
                            )}
                          </div>
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

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {isLoading ? <LoadingSpinner tall /> : !analyticsData ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-gray-400">{t('admin.noData')}</div>
            ) : (
              <>
                {/* Date range filter */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
                  <Calendar size={15} className="text-indigo-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{t('admin.analytics.dateRange.label')}</span>
                  <input
                    type="month" value={reportDateFrom} max={reportDateTo}
                    onChange={e => setReportDateFrom(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-gray-400 text-sm">—</span>
                  <input
                    type="month" value={reportDateTo} min={reportDateFrom}
                    onChange={e => setReportDateTo(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
                      setReportDateFrom(d.toISOString().slice(0, 7));
                      setReportDateTo(new Date().toISOString().slice(0, 7));
                    }}
                    className="text-xs text-indigo-600 hover:underline px-1"
                  >
                    {t('admin.analytics.dateRange.reset')}
                  </button>
                  {filteredGrowth.length < (analyticsData.userGrowth?.length ?? 0) && (
                    <span className="ml-auto text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      {t('admin.analytics.dateRange.filtered', { shown: filteredGrowth.length, total: analyticsData.userGrowth?.length ?? 0 })}
                    </span>
                  )}
                </div>

                <div className="flex gap-5 items-start">
                  {/* ── Reports sidebar ── */}
                  <div className="w-72 shrink-0">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={15} className="text-indigo-500" />
                        <h3 className="font-semibold text-gray-900 text-sm">{t('admin.analytics.reports.title')}</h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-4 leading-snug">{t('admin.analytics.reports.desc')}</p>
                      <div className="space-y-1.5">
                        {reportDefs.map(r => (
                          <button
                            key={r.id}
                            onClick={r.handler}
                            disabled={r.disabled}
                            className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-gray-100"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.iconBg}`}>
                              <r.icon size={14} className={r.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 leading-tight">{r.name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{r.desc}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.format === 'PDF' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {r.format}
                              </span>
                              <Download size={11} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-300 mt-4 text-center leading-snug">{t('admin.analytics.reports.rangeNote')}</p>
                    </div>
                  </div>

                  {/* ── Charts area ── */}
                  <div className="flex-1 min-w-0 space-y-5">
                    {/* Row 1: Growth charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <ChartCard title={t('admin.analytics.registrations')} icon={<Users size={16} className="text-indigo-500" />}>
                        {filteredGrowth.length === 0 ? <NoData /> : (
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={filteredGrowth}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                              <Tooltip />
                              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} name={t('admin.analytics.registrationsCount')} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>

                      <ChartCard title={t('admin.analytics.jobPostings')} icon={<Briefcase size={16} className="text-purple-500" />}>
                        {filteredJobPostings.length === 0 ? <NoData /> : (
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={filteredJobPostings}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                              <Tooltip />
                              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t('admin.analytics.jobs')} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>
                    </div>

                    {/* Row 2: Top skills + Applications by status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <ChartCard title={t('admin.analytics.topSkills')} icon={<Award size={16} className="text-green-500" />}>
                        {analyticsData.topSkills.length === 0 ? <NoData /> : (
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={analyticsData.topSkills} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name={t('admin.analytics.jobs')} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>

                      <ChartCard title={t('admin.analytics.appsByStatus')} icon={<Activity size={16} className="text-orange-500" />}>
                        {analyticsData.appsByStatus.length === 0 ? <NoData /> : (
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={analyticsData.appsByStatus}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} name={t('admin.analytics.applicationsCount')} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>
                    </div>

                    {/* Row 3: Top countries + Top industries */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <ChartCard title={t('admin.analytics.topCountries')} icon={<Globe size={16} className="text-blue-500" />}>
                        {analyticsData.topCountries.length === 0 ? <NoData /> : (
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={analyticsData.topCountries} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                              <Tooltip />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]} name={t('admin.analytics.jobs')}>
                                {analyticsData.topCountries.map((_: any, i: number) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>

                      <ChartCard title={t('admin.analytics.byIndustry')} icon={<BarChart3 size={16} className="text-indigo-500" />}>
                        {analyticsData.topIndustries.length === 0 ? <NoData /> : (
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={analyticsData.topIndustries} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name={t('admin.analytics.jobs')} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>
                    </div>

                    {/* Row 4: Status pie + App distribution pie */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <ChartCard title={t('admin.analytics.jobTypes')} icon={<Briefcase size={16} className="text-purple-500" />}>
                        <PieFromAnalytics data={analyticsData.topIndustries.slice(0, 5)} />
                      </ChartCard>
                      <ChartCard title={t('admin.analytics.appDistribution')} icon={<TrendingUp size={16} className="text-green-500" />}>
                        {analyticsData.appsByStatus.length === 0 ? <NoData /> : (
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={analyticsData.appsByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                                {analyticsData.appsByStatus.map((_: any, i: number) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('admin.logs.total')} {logsTotal}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {isLoading ? <LoadingSpinner /> : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Activity size={32} className="mx-auto mb-3 text-gray-300" />
                  <p>{t('admin.logs.empty')}</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.logs.table.action')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.logs.table.user')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.logs.table.resource')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('admin.logs.table.time')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            log.action?.includes('delete') || log.action?.includes('block') || log.action?.includes('suspend')
                              ? 'bg-red-100 text-red-700'
                              : log.action?.includes('create') || log.action?.includes('verified')
                              ? 'bg-green-100 text-green-700'
                              : log.action?.includes('update') || log.action?.includes('moderate')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action ? (t(`admin.logs.actions.${log.action}`) || log.action) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {log.user?.firstName} {log.user?.lastName}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {log.entityType ? `${t(`admin.logs.entityTypes.${log.entityType}`) || log.entityType} #${log.entityId?.slice(0, 8)}` : '—'}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-400">{formatRelativeDate(log.createdAt, t)}</td>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function LoadingSpinner({ tall }: { tall?: boolean }) {
  return (
    <div className={`flex justify-center items-center ${tall ? 'py-24' : 'py-12'}`}>
      <Loader2 size={28} className="animate-spin text-indigo-600" />
    </div>
  );
}

function NoData() {
  const { t } = useI18n();
  return <p className="text-gray-400 text-sm text-center py-8">{t('admin.noData')}</p>;
}

function AdminJobRow({ job, selected, onSelect, onModerate, onReject }: {
  job: Job; selected: boolean; onSelect: () => void;
  onModerate: (id: string, status: string) => void; onReject: (job: Job) => void;
}) {
  const { t } = useI18n();
  const title   = useAutoTranslate(job.title);
  const city    = useAutoTranslate(job.city);
  const country = useAutoTranslate(job.country);
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${selected ? 'bg-indigo-50' : ''}`}>
      <td className="px-4 py-4">
        <input type="checkbox" checked={selected} onChange={onSelect}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-gray-900 text-sm">{title || job.title}</p>
        <p className="text-xs text-gray-400">{city || job.city}, {country || job.country}</p>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">{job.employer?.firstName} {job.employer?.lastName}</td>
      <td className="px-4 py-4">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          job.status === 'active' ? 'bg-green-100 text-green-700' :
          job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          job.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {job.status === 'active' ? t('admin.jobs.jobStatus.active') :
           job.status === 'pending' ? t('admin.jobs.jobStatus.pending') :
           job.status === 'rejected' ? t('admin.jobs.jobStatus.rejected') : job.status}
        </span>
      </td>
      <td className="px-4 py-4 text-xs text-gray-400">{formatRelativeDate(job.createdAt, t)}</td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {job.status === 'pending' && (
            <>
              <button onClick={() => onModerate(job.id, 'active')}
                className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
                <CheckCircle size={12} className="inline mr-1" />{t('admin.jobs.approve')}
              </button>
              <button onClick={() => onReject(job)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                <XCircle size={12} className="inline mr-1" />{t('admin.jobs.reject')}
              </button>
            </>
          )}
          {job.status === 'active' && (
            <button onClick={() => onModerate(job.id, 'inactive')}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              {t('admin.jobs.deactivate')}
            </button>
          )}
          {job.status === 'rejected' && (
            <button onClick={() => onModerate(job.id, 'active')}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
              {t('admin.jobs.restore')}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

function PieFromAnalytics({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value"
          label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
          {data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
