'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MapPin, DollarSign, Clock, Briefcase, Users, Heart, Share2,
  ChevronLeft, AlertCircle, Check, GraduationCap, Zap,
  Loader2, BookOpen, Code, Award, Building, CalendarX2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Job } from '@/types';
import { ROUTES, JOB_TYPES, EXPERIENCE_LEVELS, WORK_FORMATS } from '@/lib/constants';
import { formatSalary, formatRelativeDate } from '@/lib/utils';

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;
  const { user, isAuthenticated } = useAuthStore();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJob();
      if (isAuthenticated) {
        checkIfApplied();
        checkIfSaved();
      }
    }
  }, [jobId, isAuthenticated]);

  const fetchJob = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/jobs/${jobId}`);
      setJob(response.data);
      api.post(`/jobs/${jobId}/view`).catch(() => {});
    } catch {
      toast.error('Помилка завантаження вакансії');
      router.push(ROUTES.JOBS);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfApplied = async () => {
    try {
      const response = await api.get(`/jobs/applications/check/${jobId}`);
      setHasApplied(response.data.hasApplied);
    } catch {}
  };

  const checkIfSaved = async () => {
    try {
      const response = await api.get(`/jobs/${jobId}/saved`);
      setIsSaved(response.data.isSaved);
    } catch {}
  };

  const handleApply = async () => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    setIsSubmitting(true);
    try {
      await api.post(`/jobs/${jobId}/apply`, {});
      toast.success('Заявку подано!');
      setHasApplied(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка подачі заявки');
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
        toast.success('Видалено зі збережених');
      } else {
        await api.post(`/jobs/${jobId}/save`);
        setIsSaved(true);
        toast.success('Збережено!');
      }
    } catch {
      toast.error('Помилка');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: job?.title, url: window.location.href }); } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Посилання скопійовано');
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
        <h1 className="text-2xl font-bold text-gray-900">Вакансію не знайдено</h1>
        <Link href={ROUTES.JOBS} className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
          Повернутися до вакансій
        </Link>
      </div>
    );
  }

  const jobType = JOB_TYPES.find(t => t.value === job.jobType);
  const experienceLevel = EXPERIENCE_LEVELS.find(l => l.value === job.experienceLevel);
  const workFormat = WORK_FORMATS.find(f => f.value === job.workFormat);

  const deadlineDate = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Назад</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isSaved ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">{isSaved ? 'Збережено' : 'Зберегти'}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Поділитися</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Header card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {job.isUrgent && (
              <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">
                <AlertCircle size={12} /> Терміново
              </span>
            )}
            {job.isFeatured && (
              <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full text-xs font-semibold">
                <Zap size={12} /> Топ
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{job.title}</h1>
          <p className="text-gray-500 mb-5">{job.employer?.firstName} {job.employer?.lastName}</p>

          {/* Key meta */}
          <div className="flex flex-wrap gap-5 text-sm text-gray-600 pb-5 border-b border-gray-100 mb-5">
            <span className="flex items-center gap-1.5">
              <MapPin size={16} className="text-indigo-400" />
              {job.city ? `${job.city}, ` : ''}{job.country}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-gray-900">
              <DollarSign size={16} className="text-indigo-400" />
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={16} className="text-indigo-400" />
              {formatRelativeDate(job.createdAt)}
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Briefcase, label: 'Зайнятість', value: jobType?.label || job.jobType },
              { icon: GraduationCap, label: 'Рівень', value: experienceLevel?.label || job.experienceLevel },
              { icon: Building, label: 'Формат', value: workFormat?.label || job.workFormat },
              ...(user?.role === 'employer' || user?.role === 'admin'
                ? [{ icon: Users, label: 'Переглядів', value: `${job.views || 0}` }]
                : []),
            ].map((item, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <item.icon size={16} className="text-indigo-500 mb-1.5" />
                <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Стек / навички</p>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map(skill => (
                  <span
                    key={skill.id}
                    className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium border border-indigo-100"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Main content + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: text sections */}
          <div className="lg:col-span-2 space-y-5">
            {job.description && (
              <div className="bg-white rounded-2xl p-7 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-indigo-500" /> Про вакансію
                </h2>
                <div className="text-gray-600 leading-relaxed space-y-2">
                  {job.description.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
                </div>
              </div>
            )}

            {job.requirements && (
              <div className="bg-white rounded-2xl p-7 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award size={20} className="text-indigo-500" /> Вимоги
                </h2>
                <ul className="space-y-2.5">
                  {job.requirements.split('\n').map((req, idx) =>
                    req.trim() && (
                      <li key={idx} className="flex gap-3 text-gray-600">
                        <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req.trim()}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {job.responsibilities && (
              <div className="bg-white rounded-2xl p-7 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Code size={20} className="text-indigo-500" /> Обов'язки
                </h2>
                <ul className="space-y-2.5">
                  {job.responsibilities.split('\n').map((resp, idx) =>
                    resp.trim() && (
                      <li key={idx} className="flex gap-3 text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" />
                        <span>{resp.trim()}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {job.benefits && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-7 border border-indigo-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">✨ Переваги</h2>
                <ul className="space-y-2">
                  {job.benefits.split('\n').map((benefit, idx) =>
                    benefit.trim() && (
                      <li key={idx} className="flex gap-2 text-gray-700">
                        <span className="text-indigo-500 font-bold">•</span>
                        {benefit.trim()}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-5">
            {/* Apply */}
            <div className="sticky top-20">
              {user?.role === 'employer' ? null : hasApplied ? (
                <div className="bg-emerald-50 rounded-2xl p-5 border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Check size={20} className="text-emerald-600" />
                    <h3 className="font-bold text-emerald-900">Заявку подано!</h3>
                  </div>
                  <p className="text-sm text-emerald-700">Роботодавець розглядає вашу заявку.</p>
                </div>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Подати заявку'}
                </button>
              )}

              {/* Deadline */}
              {deadlineDate && (
                <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${isExpired ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                  <CalendarX2 size={16} />
                  {isExpired ? 'Дедлайн минув: ' : 'Дедлайн: '}
                  {deadlineDate.toLocaleDateString('uk-UA')}
                </div>
              )}

              {/* Company */}
              <div className="mt-5 bg-white rounded-2xl p-5 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Про компанію</h3>
                {job.employer?.company?.logoUrl && (
                  <img
                    src={job.employer.company.logoUrl}
                    alt={job.employer.company.name}
                    className="w-full h-32 object-cover rounded-xl mb-3"
                  />
                )}
                {job.employer?.company?.name && (
                  <p className="font-semibold text-gray-800 mb-1">{job.employer.company.name}</p>
                )}
                <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                  {job.employer?.company?.shortDescription || job.employer?.company?.description || 'Немає опису'}
                </p>
                {job.employer?.company?.id && (
                  <Link
                    href={`/companies/${job.employer.company.id}`}
                    className="block w-full text-center px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors text-sm border border-indigo-100"
                  >
                    Переглянути компанію
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
