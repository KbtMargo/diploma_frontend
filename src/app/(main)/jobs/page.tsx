'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, X, LayoutGrid, List, Heart, SlidersHorizontal } from 'lucide-react';
import { Job, PaginatedResponse } from '@/types';
import { JOB_TYPES, EXPERIENCE_LEVELS, WORK_FORMATS, JOB_CATEGORIES, JOB_LANGUAGES } from '@/lib/constants';
import { formatSalary, formatRelativeDate } from '@/lib/utils';
import { useSavedJobs } from '@/lib/hooks/useSavedJobs';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { translateToUk } from '@/lib/translate';
import api from '@/lib/axios';
import Link from 'next/link';

type ViewMode = 'list' | 'grid';

function FilterGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="pb-4 mb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={value === opt.value}
              onChange={() => onChange(value === opt.value ? '' : opt.value)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function calcMatch(jobSkills: { id: string }[], userSkillIds: Set<string>): number {
  if (!jobSkills?.length || !userSkillIds.size) return 0;
  const matched = jobSkills.filter(s => userSkillIds.has(s.id)).length;
  return Math.round((matched / jobSkills.length) * 100);
}

function MatchBadge({ score, label }: { score: number; label: string }) {
  if (score === 0) return null;
  const color = score >= 70 ? 'bg-green-100 text-green-700' : score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500';
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

function ListJobCard({ job, savedIds, toggleSave, matchScore, t }: { job: Job; savedIds: Set<string>; toggleSave: (id: string, e: React.MouseEvent) => void; matchScore: number; t: (k: string, v?: any) => string }) {
  const title = useAutoTranslate(job.title);
  const city = useAutoTranslate(job.city);
  const country = useAutoTranslate(job.country);
  const employerName = useAutoTranslate(job.employer ? `${job.employer.firstName} ${job.employer.lastName}` : '');
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {job.isUrgent && <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">{t('common.urgent')}</span>}
              {job.isFeatured && <span className="bg-yellow-100 text-yellow-600 text-xs font-medium px-2 py-0.5 rounded-full">{t('common.top')}</span>}
              {job.jobType === 'internship' && (
                job.isPaid
                  ? <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">{t('common.paid')}</span>
                  : <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">{t('common.unpaid')}</span>
              )}
              <MatchBadge score={matchScore} label={t('jobs.match', { score: matchScore })} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{title || job.title}</h3>
            <p className="text-gray-500 text-sm mt-1">{employerName || `${job.employer?.firstName} ${job.employer?.lastName}`}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              {job.city && <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin size={14} /> {city || job.city}, {country || job.country}</span>}
              <span className="flex items-center gap-1 text-sm text-gray-500"><Briefcase size={14} />{t(`jobTypes.${job.jobType}`)}</span>
            </div>
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {job.requiredSkills.slice(0, 5).map(skill => (
                  <span key={skill.id} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{skill.name}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button onClick={(e) => toggleSave(job.id, e)} className={`p-2 rounded-lg transition-colors ${savedIds.has(job.id) ? 'text-red-500 hover:text-red-600' : 'text-gray-300 hover:text-red-400'}`} title={savedIds.has(job.id) ? t('jobs.unsave') : t('jobs.save')}><Heart size={18} fill={savedIds.has(job.id) ? 'currentColor' : 'none'} /></button>
            <p className="font-semibold text-indigo-600">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, t)}</p>
            <p className="text-xs text-gray-400">{formatRelativeDate(job.createdAt, t)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function GridJobCard({ job, savedIds, toggleSave, matchScore, t }: { job: Job; savedIds: Set<string>; toggleSave: (id: string, e: React.MouseEvent) => void; matchScore: number; t: (k: string, v?: any) => string }) {
  const title = useAutoTranslate(job.title);
  const city = useAutoTranslate(job.city);
  const country = useAutoTranslate(job.country);
  const employerName = useAutoTranslate(job.employer ? `${job.employer.firstName} ${job.employer.lastName}` : '');
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all h-full group flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Briefcase size={18} className="text-indigo-600" />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {job.isUrgent && <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">{t('common.urgent')}</span>}
            {job.jobType === 'internship' && (
              job.isPaid
                ? <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">{t('common.paid')}</span>
                : <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">{t('common.unpaid')}</span>
            )}
            <MatchBadge score={matchScore} label={t('jobs.match', { score: matchScore })} />
            <button onClick={(e) => toggleSave(job.id, e)} className={`p-2 rounded-lg transition-colors ${savedIds.has(job.id) ? 'text-red-500 hover:text-red-600' : 'text-gray-300 hover:text-red-400'}`} title={savedIds.has(job.id) ? t('jobs.unsave') : t('jobs.save')}><Heart size={18} fill={savedIds.has(job.id) ? 'currentColor' : 'none'} /></button>
          </div>
        </div>
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 line-clamp-2">{title || job.title}</h3>
        <p className="text-sm text-gray-500 mb-2">{employerName || `${job.employer?.firstName} ${job.employer?.lastName}`}</p>
        <div className="flex items-center gap-1 text-sm text-gray-400 mb-3">
          <MapPin size={13} />
          <span className="truncate">{job.city ? `${city || job.city}, ` : ''}{country || job.country}</span>
        </div>
        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.requiredSkills.slice(0, 3).map(skill => (
              <span key={skill.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{skill.name}</span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="font-semibold text-indigo-600 text-sm">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, t)}</span>
          <span className="text-xs text-gray-400">{t(`jobTypes.${job.jobType}`)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function JobsPage() {
  const { savedIds, toggleSave } = useSavedJobs();
  const { user } = useAuthStore();
  const { t, locale } = useI18n();
  const userSkillIds = new Set<string>((user?.skills || []).map((s: any) => s.id));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('jobs-view') as ViewMode) || 'list';
    }
    return 'list';
  });

  const [filters, setFilters] = useState({
    search: '', country: '', city: '', jobType: '', experienceLevel: '',
    workFormat: '', salaryMin: '', salaryMax: '', category: '', language: '', isPaid: '',
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      const [search, city, country] = await Promise.all([
        filters.search ? translateToUk(filters.search, locale) : Promise.resolve(''),
        filters.city   ? translateToUk(filters.city,   locale) : Promise.resolve(''),
        filters.country? translateToUk(filters.country,locale) : Promise.resolve(''),
      ]);
      if (cancelled) return;
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '12');
      const translated = { ...filters, search, city, country };
      Object.entries(translated).forEach(([key, value]) => { if (value) params.append(key, value); });
      api.get<PaginatedResponse<Job>>(`/jobs?${params}`)
        .then(r => { if (!cancelled) { setJobs(r.data.data); setTotal(r.data.meta.total); } })
        .catch(console.error)
        .finally(() => { if (!cancelled) setIsLoading(false); });
    };
    run();
    return () => { cancelled = true; };
  }, [page, filters, locale]);

  const clearFilters = () => {
    setFilters({ search: '', country: '', city: '', jobType: '', experienceLevel: '', workFormat: '', salaryMin: '', salaryMax: '', category: '', language: '', isPaid: '' });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const totalPages = Math.ceil(total / 12);

  const translatedJobTypes      = JOB_TYPES.map(o => ({ value: o.value, label: t(`jobTypes.${o.value}`) }));
  const translatedExpLevels     = EXPERIENCE_LEVELS.map(o => ({ value: o.value, label: t(`experienceLevels.${o.value}`) }));
  const translatedWorkFormats   = WORK_FORMATS.map(o => ({ value: o.value, label: t(`workFormats.${o.value}`) }));
  const translatedCategories    = JOB_CATEGORIES.map(o => ({ value: o.value, label: t(`jobCategories.${o.value}`) }));
  const translatedJobLanguages  = JOB_LANGUAGES.map(o => ({ value: o.value, label: t(`jobLanguages.${o.value}`) }));

  const sidebarContent = (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
      <div className="flex items-center justify-between mb-5">
        <span className="font-semibold text-gray-900">{t('jobs.filters.title')}</span>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
            {t('jobs.filters.clear')}
          </button>
        )}
      </div>

      <FilterGroup title={t('jobs.filters.industry')}   options={translatedCategories}   value={filters.category}         onChange={(v) => { setFilters(f => ({ ...f, category: v }));         setPage(1); }} />
      <FilterGroup title={t('jobs.filters.jobType')}    options={translatedJobTypes}      value={filters.jobType}          onChange={(v) => { setFilters(f => ({ ...f, jobType: v }));          setPage(1); }} />
      <FilterGroup title={t('jobs.filters.workFormat')} options={translatedWorkFormats}   value={filters.workFormat}       onChange={(v) => { setFilters(f => ({ ...f, workFormat: v }));       setPage(1); }} />
      <FilterGroup title={t('jobs.filters.language')}   options={translatedJobLanguages}  value={filters.language}         onChange={(v) => { setFilters(f => ({ ...f, language: v }));         setPage(1); }} />
      <FilterGroup title={t('jobs.filters.experience')} options={translatedExpLevels}     value={filters.experienceLevel}  onChange={(v) => { setFilters(f => ({ ...f, experienceLevel: v }));  setPage(1); }} />

      {/* Country */}
      <div className="pb-4 mb-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('jobs.filters.country')}</p>
        <input
          value={filters.country}
          onChange={(e) => { setFilters(f => ({ ...f, country: e.target.value })); setPage(1); }}
          placeholder={t('jobs.filters.countryPlaceholder')}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Salary */}
      <div className="pb-4 mb-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('jobs.filters.salary')}</p>
        <div className="flex gap-2">
          <input type="number" value={filters.salaryMin} onChange={(e) => { setFilters(f => ({ ...f, salaryMin: e.target.value })); setPage(1); }} placeholder={t('jobs.filters.from')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="number" value={filters.salaryMax} onChange={(e) => { setFilters(f => ({ ...f, salaryMax: e.target.value })); setPage(1); }} placeholder={t('jobs.filters.to')}   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Paid internship */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('jobs.filters.internship')}</p>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.isPaid === 'true'}
            onChange={() => { setFilters(f => ({ ...f, isPaid: f.isPaid === 'true' ? '' : 'true' })); setPage(1); }}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">{t('jobs.filters.paidOnly')}</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('jobs.title')}</h1>
        <p className="text-gray-500">{t('jobs.found', { count: total })}</p>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              placeholder={t('jobs.search.placeholder')}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.city}
              onChange={(e) => { setFilters(f => ({ ...f, city: e.target.value })); setPage(1); }}
              placeholder={t('jobs.search.cityPlaceholder')}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
            />
          </div>

          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${showMobileFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}
          >
            <SlidersHorizontal size={18} />
            {t('jobs.filters.toggle')}
            {hasActiveFilters && <span className="w-2 h-2 bg-red-500 rounded-full" />}
          </button>

          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setView('list'); localStorage.setItem('jobs-view', 'list'); }} className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><List size={18} /></button>
            <button onClick={() => { setView('grid'); localStorage.setItem('jobs-view', 'grid'); }} className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
          </div>
        </div>
      </div>

      {showMobileFilters && <div className="lg:hidden mb-6">{sidebarContent}</div>}

      <div className="flex gap-6 items-start">
        <aside className="hidden lg:block w-60 shrink-0">{sidebarContent}</aside>

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border border-gray-100">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-500">{t('jobs.notFound.title')}</h3>
              <p className="text-gray-400 mt-2">{t('jobs.notFound.subtitle')}</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-4 flex items-center gap-1 mx-auto px-4 py-2 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <X size={16} /> {t('jobs.notFound.reset')}
                </button>
              )}
            </div>
          ) : view === 'list' ? (
            <div className="space-y-4">
              {jobs.map(job => (
                <ListJobCard key={job.id} job={job} savedIds={savedIds} toggleSave={toggleSave} matchScore={calcMatch(job.requiredSkills || [], userSkillIds)} t={t} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map(job => (
                <GridJobCard key={job.id} job={job} savedIds={savedIds} toggleSave={toggleSave} matchScore={calcMatch(job.requiredSkills || [], userSkillIds)} t={t} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors">
                {t('jobs.pagination.prev')}
              </button>
              <span className="px-4 py-2 text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors">
                {t('jobs.pagination.next')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
