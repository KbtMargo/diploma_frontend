'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MapPin, DollarSign, Clock, Briefcase, Users, Heart, Share2,
  CheckCircle2, ArrowLeft, Building, Loader2,
  CalendarX2, X,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Job } from '@/types';
import { ROUTES, USER_ROLES } from '@/lib/constants';
import { formatSalary, formatRelativeDate } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoTranslate, useAutoTranslateLines } from '@/hooks/useAutoTranslate';

function SkillTag({ name }: { name: string }) {
  const translated = useAutoTranslate(name);
  return (
    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium border border-indigo-100">
      {translated || name}
    </span>
  );
}

function SimilarJobItem({ sj }: { sj: Job }) {
  const title = useAutoTranslate(sj.title);
  const employerName = useAutoTranslate(sj.employer ? `${sj.employer.firstName} ${sj.employer.lastName}` : '');
  return (
    <Link href={`/jobs/${sj.id}`}>
      <div className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
        <p className="font-medium text-sm text-gray-900 mb-0.5 line-clamp-1">{title || sj.title}</p>
        <p className="text-xs text-gray-400 mb-2">{employerName || `${sj.employer?.firstName} ${sj.employer?.lastName}`}</p>
        <span className="text-xs font-semibold text-indigo-600">
          {formatSalary(sj.salaryMin, sj.salaryMax, sj.salaryCurrency, t)}
        </span>
      </div>
    </Link>
  );
}

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useI18n();

  const [job, setJob] = useState<Job | null>(null);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const translatedTitle = useAutoTranslate(job?.title);
  const translatedDescription = useAutoTranslate(job?.description);
  const translatedRequirements = useAutoTranslateLines(job?.requirements);
  const translatedResponsibilities = useAutoTranslateLines(job?.responsibilities);
  const translatedBenefits = useAutoTranslateLines(job?.benefits);
  const translatedCompanyDesc = useAutoTranslate(
    job?.employer?.company?.shortDescription || job?.employer?.company?.description
  );
  const translatedCity = useAutoTranslate(job?.city);
  const translatedCountry = useAutoTranslate(job?.country);
  const translatedEmployerName = useAutoTranslate(
    job?.employer ? `${job.employer.firstName} ${job.employer.lastName}` : undefined
  );
  const translatedCategory = useAutoTranslate(job?.category);

  useEffect(() => {
    if (jobId) {
      fetchJob();
      if (isAuthenticated) {
        Promise.all([checkIfApplied(), checkIfSaved()]);
      }
    }
  }, [jobId, isAuthenticated]);

  const fetchJob = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/jobs/${jobId}`);
      const data = response.data;
      setJob(data);
      api.post(`/jobs/${jobId}/view`).catch(() => {});
      if (data.category) {
        api.get(`/jobs?category=${encodeURIComponent(data.category)}&limit=4`)
          .then(r => setSimilarJobs((r.data.data || []).filter((j: Job) => j.id !== jobId).slice(0, 3)))
          .catch(() => {});
      }
    } catch {
      toast.error(t('jobDetail.error.load'));
      router.push(ROUTES.JOBS);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfApplied = async () => {
    try {
      const r = await api.get(`/jobs/applications/check/${jobId}`);
      setHasApplied(r.data.hasApplied);
    } catch {}
  };

  const checkIfSaved = async () => {
    try {
      const r = await api.get(`/jobs/${jobId}/saved`);
      setIsSaved(r.data.isSaved);
    } catch {}
  };

  const handleApply = async () => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    setIsSubmitting(true);
    try {
      await api.post(`/jobs/${jobId}/apply`, { coverLetter });
      toast.success(t('jobDetail.success.applied'));
      setHasApplied(true);
      setShowApplyModal(false);
      setCoverLetter('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('jobDetail.error.apply'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    try {
      if (isSaved) {
        await api.delete(`/jobs/${jobId}/save`);
        setIsSaved(false);
        toast.success(t('jobDetail.success.unsaved'));
      } else {
        await api.post(`/jobs/${jobId}/save`);
        setIsSaved(true);
        toast.success(t('jobDetail.success.saved'));
      }
    } catch {
      toast.error(t('jobDetail.error.save'));
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: job?.title, url: window.location.href }); } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t('jobDetail.share'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('jobDetail.notFound')}</h1>
        <Link href={ROUTES.JOBS} className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
          {t('jobDetail.notFoundBack')}
        </Link>
      </div>
    );
  }

  const deadlineDate = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors text-sm">
        <ArrowLeft size={16} /> {t('jobDetail.back')}
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Job header card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Briefcase size={24} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{translatedTitle || job.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 text-sm flex-wrap">
                  <Building size={14} />
                  <span className="font-medium">{translatedEmployerName || `${job.employer?.firstName} ${job.employer?.lastName}`}</span>
                  <span>·</span>
                  <MapPin size={14} />
                  <span>{job.city ? `${translatedCity || job.city}, ` : ''}{translatedCountry || job.country}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {job.isUrgent && <span className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">{t('jobDetail.urgent')}</span>}
              {job.isFeatured && <span className="bg-yellow-50 text-yellow-600 text-xs font-semibold px-3 py-1 rounded-full">{t('jobDetail.top')}</span>}
              {job.jobType && <span className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">{t(`jobTypes.${job.jobType}`)}</span>}
              {job.workFormat && <span className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">{t(`workFormats.${job.workFormat}`)}</span>}
              {job.experienceLevel && <span className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">{t(`experienceLevels.${job.experienceLevel}`)}</span>}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-indigo-600">
                  <DollarSign size={15} />
                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, t)}
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Clock size={15} />
                  {formatRelativeDate(job.createdAt, t)}
                </span>
                {(user?.role === USER_ROLES.EMPLOYER || user?.role === USER_ROLES.ADMIN) && (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Users size={15} />
                    {t('jobDetail.views', { count: String(job.views || 0) })}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className={`p-2 rounded-lg border transition-colors ${isSaved ? 'text-red-500 border-red-200 bg-red-50' : 'text-gray-400 border-gray-200 hover:border-red-200 hover:text-red-400'}`}
                >
                  <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Description + Requirements + Skills */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
            {job.description && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">{t('jobDetail.description')}</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{translatedDescription || job.description}</p>
              </div>
            )}

            {job.description && job.requirements && <hr className="border-gray-100" />}

            {job.requirements && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">{t('jobDetail.requirements')}</h2>
                <ul className="space-y-2">
                  {translatedRequirements.split('\n').map((req, idx) =>
                    req.trim() && (
                      <li key={idx} className="flex items-start gap-2.5 text-gray-600">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req.trim()}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {job.responsibilities && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{t('jobDetail.responsibilities')}</h2>
                  <ul className="space-y-2">
                    {translatedResponsibilities.split('\n').map((r, idx) =>
                      r.trim() && (
                        <li key={idx} className="flex items-start gap-2.5 text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" />
                          <span>{r.trim()}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </>
            )}

            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{t('jobDetail.skills')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map(skill => (
                      <SkillTag key={skill.id} name={skill.name} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {job.benefits && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{t('jobDetail.benefits')}</h2>
                  <ul className="space-y-1.5">
                    {translatedBenefits.split('\n').map((b, idx) =>
                      b.trim() && (
                        <li key={idx} className="flex gap-2 text-gray-600">
                          <span className="text-indigo-400 font-bold">•</span> {b.trim()}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Company card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {t('jobDetail.company.title', { name: job.employer?.company?.name || '' })}
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              {translatedCompanyDesc || t('jobDetail.company.noInfo')}
            </p>
            {job.employer?.company?.id && (
              <Link
                href={`/companies/${job.employer.company.id}`}
                className="inline-flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline"
              >
                {t('jobDetail.company.viewProfile')}
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="sticky top-6 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              {user?.role === USER_ROLES.EMPLOYER ? null : hasApplied ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{t('jobDetail.applied')}</p>
                    <p className="text-xs text-emerald-600">{t('jobDetail.appliedDesc')}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => isAuthenticated ? setShowApplyModal(true) : router.push(ROUTES.LOGIN)}
                  className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  {t('jobDetail.apply')}
                </button>
              )}

              <button
                onClick={handleSave}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-colors ${
                  isSaved ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? t('jobDetail.saved') : t('jobDetail.save')}
              </button>

              <hr className="border-gray-100" />

              <div className="space-y-2.5 text-sm">
                {deadlineDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5"><CalendarX2 size={14} /> {t('jobDetail.deadline')}</span>
                    <span className={`font-medium ${isExpired ? 'text-red-500' : 'text-orange-500'}`}>
                      {deadlineDate.toLocaleDateString()}
                    </span>
                  </div>
                )}
                {job.jobType && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('jobDetail.type')}</span>
                    <span className="font-medium text-gray-700">{t(`jobTypes.${job.jobType}`)}</span>
                  </div>
                )}
                {job.workFormat && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('jobDetail.format')}</span>
                    <span className="font-medium text-gray-700">{t(`workFormats.${job.workFormat}`)}</span>
                  </div>
                )}
                {job.experienceLevel && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('jobDetail.level')}</span>
                    <span className="font-medium text-gray-700">{t(`experienceLevels.${job.experienceLevel}`)}</span>
                  </div>
                )}
                {job.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('jobDetail.category')}</span>
                    <span className="font-medium text-gray-700">{translatedCategory || job.category}</span>
                  </div>
                )}
                {(user?.role === USER_ROLES.EMPLOYER || user?.role === USER_ROLES.ADMIN) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('jobDetail.views', { count: '' }).replace(' ', '')}</span>
                    <span className="font-medium text-gray-700">{job.views || 0}</span>
                  </div>
                )}
              </div>
            </div>

            {similarJobs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-4">{t('jobDetail.similar')}</h3>
                <div className="space-y-3">
                  {similarJobs.map(sj => (
                    <SimilarJobItem key={sj.id} sj={sj} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{t('jobDetail.modal.title')}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{t('jobDetail.modal.subtitle')}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('jobDetail.modal.coverLetter')} <span className="text-gray-400 font-normal">{t('jobDetail.modal.optional')}</span>
                </label>
                <textarea
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  placeholder={t('jobDetail.modal.placeholder')}
                  rows={6}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('jobDetail.modal.cancel')}
                </button>
                <button
                  onClick={handleApply}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t('jobDetail.modal.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
