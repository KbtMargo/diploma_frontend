'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Briefcase, Clock, Users, BookmarkPlus, BookmarkCheck, ArrowLeft, Building, Calendar, Globe, Loader2 } from 'lucide-react';
import { Job } from '@/types';
import { JOB_TYPES, EXPERIENCE_LEVELS, WORK_FORMATS, ROUTES } from '@/lib/constants';
import { formatSalary, formatDate, formatRelativeDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await api.get<Job>(`/jobs/${id}`);
      setJob(response.data);
    } catch {
      toast.error('Вакансію не знайдено');
      router.push(ROUTES.JOBS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    try {
      await api.post(`/jobs/${id}/save`);
      setIsSaved(!isSaved);
      toast.success(isSaved ? 'Видалено зі збережених' : 'Збережено!');
    } catch {
      toast.error('Помилка');
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    setIsApplying(true);
    try {
      await api.post('/applications', {
        jobId: id,
        coverLetter,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
      });
      toast.success('Заявку подано успішно!');
      setShowApplyForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка подачі заявки');
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href={ROUTES.JOBS} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
        <ArrowLeft size={18} /> Назад до вакансій
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job header */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {job.isUrgent && <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">Терміново</span>}
                  {job.isFeatured && <span className="bg-yellow-100 text-yellow-600 text-xs font-medium px-2 py-0.5 rounded-full">Топ вакансія</span>}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-gray-500 mt-1">{job.employer?.firstName} {job.employer?.lastName}</p>
              </div>
              <button
                onClick={handleSave}
                className={`p-2 rounded-lg border transition-colors ${isSaved ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-400 hover:border-indigo-200 hover:text-indigo-600'}`}
              >
                {isSaved ? <BookmarkCheck size={20} /> : <BookmarkPlus size={20} />}
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {job.city && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={16} className="text-gray-400" />
                  {job.city}, {job.country}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Briefcase size={16} className="text-gray-400" />
                {JOB_TYPES.find(t => t.value === job.jobType)?.label}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users size={16} className="text-gray-400" />
                {EXPERIENCE_LEVELS.find(l => l.value === job.experienceLevel)?.label}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Globe size={16} className="text-gray-400" />
                {WORK_FORMATS.find(f => f.value === job.workFormat)?.label}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Clock size={16} className="text-gray-400" />
                {formatRelativeDate(job.createdAt)}
              </span>
            </div>

            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {job.requiredSkills.map(skill => (
                  <span key={skill.id} className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Опис вакансії</h2>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>

          {job.requirements && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Вимоги</h2>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
            </div>
          )}

          {job.responsibilities && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Обов'язки</h2>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{job.responsibilities}</p>
            </div>
          )}

          {job.benefits && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Що ми пропонуємо</h2>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{job.benefits}</p>
            </div>
          )}

          {/* Apply form */}
          {showApplyForm && (
            <div className="bg-white rounded-2xl p-6 border border-indigo-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Подати заявку</h2>
              {isAuthenticated && user?.role === 'job_seeker' && job.employer && (
              <button
                onClick={() => router.push(`/chat?userId=${job.employer?.id}`)}
                className="w-full py-3 rounded-lg font-medium transition-colors mt-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Написати роботодавцю
              </button>
            )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Супровідний лист
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Розкажіть чому ви підходите для цієї позиції..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Очікувана зарплата (USD)
                  </label>
                  <input
                    type="number"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    placeholder="1500"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isApplying ? <><Loader2 size={18} className="animate-spin" /> Відправка...</> : 'Надіслати заявку'}
                  </button>
                  <button
                    onClick={() => setShowApplyForm(false)}
                    className="px-6 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Salary card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <p className="text-2xl font-bold text-indigo-600">
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
            </p>
            {job.isSalaryNegotiable && (
              <p className="text-sm text-gray-500 mt-1">Зарплата обговорюється</p>
            )}

            {user?.role !== 'employer' && user?.role !== 'admin' && (
              <button
                onClick={() => setShowApplyForm(true)}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors mt-4"
              >
                Подати заявку
              </button>
            )}

            <button
              onClick={handleSave}
              className={`w-full py-3 rounded-lg font-medium transition-colors mt-2 border ${isSaved ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-200'}`}
            >
              {isSaved ? 'Збережено' : 'Зберегти'}
            </button>
          </div>

          {/* Details card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-900">Деталі вакансії</h3>
            <div className="space-y-3 text-sm">
              {job.applicationDeadline && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>Дедлайн: {formatDate(job.applicationDeadline)}</span>
                </div>
              )}
              {job.applicationsCount !== undefined && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={16} className="text-gray-400" />
                  <span>{job.applicationsCount} заявок</span>
                </div>
              )}
              {job.views !== undefined && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe size={16} className="text-gray-400" />
                  <span>{job.views} переглядів</span>
                </div>
              )}
              {job.category && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building size={16} className="text-gray-400" />
                  <span>{job.category}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}