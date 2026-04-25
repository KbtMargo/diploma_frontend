'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building, Globe, Users, Briefcase, Star, Calendar,
  ArrowLeft, Check, Loader2, ExternalLink, MessageSquare, Plus, X, MapPin,
} from 'lucide-react';
import { Company, Job } from '@/types';
import { COMPANY_SIZES, JOB_TYPES } from '@/lib/constants';
import { companiesService } from '@/services/companies.service';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { formatRelativeDate, formatSalary } from '@/lib/utils';
import toast from 'react-hot-toast';

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            size={22}
            className={n <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ title: '', content: '', rating: 0, position: '', isRecommended: true });
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    companiesService.getCompany(id)
      .then(c => {
        setCompany(c);
        if (c.owner?.id) {
          api.get<{ data: Job[]; meta: { total: number } }>(`/jobs/employer/${c.owner.id}?limit=10&status=active`)
            .then(r => { setJobs(r.data.data || []); setJobsTotal(r.data.meta?.total || 0); })
            .catch(() => {});
        }
      })
      .catch(() => router.push('/companies'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    setReviewsLoading(true);
    companiesService.getReviews(id, reviewsPage)
      .then(data => { setReviews(data.data || []); setReviewsTotal(data.meta?.total || 0); })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [id, reviewsPage]);

  const handleSubmitReview = async () => {
    if (!reviewForm.rating) { toast.error('Оберіть оцінку'); return; }
    if (!reviewForm.title.trim() || !reviewForm.content.trim()) { toast.error('Заповніть заголовок і текст'); return; }
    setReviewSaving(true);
    try {
      await companiesService.addReview(id, reviewForm);
      toast.success('Відгук додано!');
      setShowReviewForm(false);
      setReviewForm({ title: '', content: '', rating: 0, position: '', isRecommended: true });
      setReviewsPage(1);
      const data = await companiesService.getReviews(id, 1);
      setReviews(data.data || []);
      setReviewsTotal(data.meta?.total || 0);
      const updated = await companiesService.getCompany(id);
      setCompany(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка додавання відгуку');
    } finally {
      setReviewSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!company) return null;

  const totalPages = Math.ceil(reviewsTotal / 10);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={18} /> Назад
      </button>

      {/* Company card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {company.coverImageUrl ? (
          <div className="h-48 bg-indigo-50 overflow-hidden">
            <img src={`${process.env.NEXT_PUBLIC_API_URL}${company.coverImageUrl}`} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-r from-indigo-50 to-purple-50" />
        )}

        <div className="p-8">
          <div className="flex items-start gap-5 -mt-16 mb-6">
            {company.logoUrl ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${company.logoUrl}`}
                alt={company.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-indigo-100 flex items-center justify-center">
                <Building size={32} className="text-indigo-600" />
              </div>
            )}
          </div>

          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                {company.isVerified && (
                  <span className="bg-green-100 text-green-600 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Check size={11} /> Верифіковано
                  </span>
                )}
              </div>
              {company.industry && <p className="text-indigo-600 font-medium mt-1">{company.industry}</p>}
            </div>
            {company.website && (
              <a
                href={company.website} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Globe size={15} /> Сайт <ExternalLink size={13} />
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-6 py-4 border-y border-gray-100 mb-6">
            {company.size && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} className="text-gray-400" />
                {COMPANY_SIZES.find(s => s.value === company.size)?.label || company.size}
              </div>
            )}
            {company.foundedYear && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                Засновано {company.foundedYear}
              </div>
            )}
            {company.totalJobsPosted !== undefined && company.totalJobsPosted > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase size={16} className="text-gray-400" />
                {company.totalJobsPosted} вакансій
              </div>
            )}
            {company.rating !== undefined && company.rating > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                {company.rating.toFixed(1)} ({company.reviewsCount} відгуків)
              </div>
            )}
          </div>

          {company.shortDescription && <p className="text-gray-700 font-medium mb-4">{company.shortDescription}</p>}
          {company.description && <p className="text-gray-600 leading-relaxed whitespace-pre-line">{company.description}</p>}
        </div>
      </div>

      {/* Jobs section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase size={18} className="text-indigo-600" />
            Вакансії компанії
            {jobsTotal > 0 && <span className="text-gray-400 font-normal">({jobsTotal})</span>}
          </h2>
        </div>
        {jobs.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Briefcase size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Немає активних вакансій</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {job.isUrgent && (
                          <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">Терміново</span>
                        )}
                        {job.isFeatured && (
                          <span className="bg-yellow-100 text-yellow-600 text-xs font-medium px-2 py-0.5 rounded-full">Топ</span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {job.city && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={12} /> {job.city}, {job.country}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {JOB_TYPES.find(t => t.value === job.jobType)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-indigo-600 text-sm">
                        {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(job.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Reviews section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-600" />
            Відгуки {reviewsTotal > 0 && <span className="text-gray-400 font-normal">({reviewsTotal})</span>}
          </h2>
          {isAuthenticated && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus size={14} /> Написати відгук
            </button>
          )}
        </div>

        {/* Review form */}
        {showReviewForm && (
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Ваш відгук</h3>
              <button onClick={() => setShowReviewForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Загальна оцінка *</label>
                <StarPicker value={reviewForm.rating} onChange={r => setReviewForm(f => ({ ...f, rating: r }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок *</label>
                <input
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Коротко про враження"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Відгук *</label>
                <textarea
                  value={reviewForm.content}
                  onChange={e => setReviewForm(f => ({ ...f, content: e.target.value }))}
                  rows={4}
                  placeholder="Розкажіть про свій досвід роботи в компанії..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Посада</label>
                <input
                  value={reviewForm.position}
                  onChange={e => setReviewForm(f => ({ ...f, position: e.target.value }))}
                  placeholder="Наприклад: Frontend Developer"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewForm.isRecommended}
                  onChange={e => setReviewForm(f => ({ ...f, isRecommended: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">Рекомендую цю компанію</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {reviewSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Опублікувати
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reviews list */}
        {reviewsLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <MessageSquare size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Відгуків ще немає</p>
            {isAuthenticated && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="mt-3 text-indigo-600 text-sm hover:underline"
              >
                Будьте першим!
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review: any) => (
              <div key={review.id} className="p-6">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900">{review.title}</h4>
                      {review.isRecommended && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> Рекомендує
                        </span>
                      )}
                    </div>
                    {review.position && <p className="text-xs text-gray-500 mt-0.5">{review.position}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={14} className={n <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{review.content}</p>
                <p className="text-xs text-gray-400 mt-2">{formatRelativeDate(review.createdAt)}</p>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
              disabled={reviewsPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Назад
            </button>
            <span className="text-sm text-gray-500">{reviewsPage} / {totalPages}</span>
            <button
              onClick={() => setReviewsPage(p => Math.min(totalPages, p + 1))}
              disabled={reviewsPage >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Далі
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
