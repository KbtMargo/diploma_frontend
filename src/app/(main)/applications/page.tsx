'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Clock, ChevronRight, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Application } from '@/types';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';
import { formatRelativeDate } from '@/lib/utils';
import { SalaryDisplay } from '@/components/SalaryDisplay';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { applicationsService } from '@/services/applications.service';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

const STATUS_COLORS: Record<string, string> = {
  pending: 'gray', reviewed: 'blue', shortlisted: 'purple',
  interview_scheduled: 'yellow', interviewed: 'orange',
  offered: 'green', accepted: 'green', rejected: 'red', withdrawn: 'gray',
};

function ApplicationItem({ app, t, handleWithdraw }: {
  app: Application;
  t: (k: string, v?: any) => string;
  handleWithdraw: (id: string) => void;
}) {
  const jobTitle = useAutoTranslate(app.job?.title);
  const jobCity = useAutoTranslate(app.job?.city);
  const jobCountry = useAutoTranslate(app.job?.country);
  const color = STATUS_COLORS[app.status] || 'gray';
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-200 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/jobs/${app.jobId}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
              {jobTitle || app.job?.title}
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              color === 'green'  ? 'bg-green-100 text-green-700' :
              color === 'red'    ? 'bg-red-100 text-red-700' :
              color === 'blue'   ? 'bg-blue-100 text-blue-700' :
              color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
              color === 'purple' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {t(`applications.status.${app.status}`)}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
            {app.job?.city && <span>{jobCity || app.job.city}, {jobCountry || app.job.country}</span>}
            {app.job?.salaryMin && <SalaryDisplay min={app.job.salaryMin} max={app.job.salaryMax} currency={app.job.salaryCurrency} t={t} size="sm" />}
            <span className="flex items-center gap-1"><Clock size={14} />{formatRelativeDate(app.createdAt, t)}</span>
          </div>
          {app.coverLetter && <p className="text-sm text-gray-600 mt-3 line-clamp-2">{app.coverLetter}</p>}
          {app.employerNotes && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-1">{t('applications.employerNote')}</p>
              <p className="text-sm text-blue-600">{app.employerNotes}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {app.expectedSalary && (
            <p className="text-sm font-medium text-indigo-600">{app.expectedSalary} {app.expectedSalaryCurrency}</p>
          )}
          {app.status === 'pending' && (
            <button onClick={() => handleWithdraw(app.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              <X size={14} /> {t('applications.withdraw')}
            </button>
          )}
          <Link href={`/jobs/${app.jobId}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
            {t('applications.details')} <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useI18n();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  const APPLICATION_STATUS_KEYS = [
    'pending', 'reviewed', 'shortlisted', 'interview_scheduled',
    'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn',
  ] as const;

  useEffect(() => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    fetchApplications();
  }, [isAuthenticated, page]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const data = await applicationsService.getMyApplications(page);
      setApplications(data.data);
      setTotal(data.meta.total);
    } catch {
      toast.error(t('applications.error.load'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm(t('applications.confirmWithdraw'))) return;
    try {
      await applicationsService.withdraw(id);
      toast.success(t('applications.withdrawn'));
      fetchApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('applications.error.withdraw'));
    }
  };

  const filtered = filter ? applications.filter(a => a.status === filter) : applications;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('applications.title')}</h1>
        <p className="text-gray-500 mt-1">{t('applications.total', { count: total })}</p>
      </div>

      {/* Filter by status */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!filter ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
        >
          {t('applications.all')} ({applications.length})
        </button>
        {APPLICATION_STATUS_KEYS.map(key => {
          const count = applications.filter(a => a.status === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
            >
              {t(`applications.status.${key}`)} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">{t('applications.empty.title')}</h3>
          <p className="text-gray-400 mt-2">{t('applications.empty.subtitle')}</p>
          <Link href={ROUTES.JOBS} className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            {t('applications.empty.browse')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => (
            <ApplicationItem key={app.id} app={app} t={t} handleWithdraw={handleWithdraw} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 10 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors">
            {t('jobs.pagination.prev')}
          </button>
          <span className="px-4 py-2 text-gray-600">{page} / {Math.ceil(total / 10)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 10)} className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors">
            {t('jobs.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
