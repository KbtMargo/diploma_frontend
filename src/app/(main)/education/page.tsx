'use client';

import { useState, useEffect } from 'react';
import {
  GraduationCap, Plus, Edit2, Trash2, X, Save, Loader2,
  Briefcase, Building2, MapPin, ExternalLink, ChevronRight, Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users.service';
import { getFileUrl, ROUTES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import api from '@/lib/axios';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { Education, Job, Company } from '@/types';

const toInputDate = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
};

type EduForm = {
  institution: string; degree: string; field: string;
  startDate: string; endDate: string; grade: string; description: string;
};
const EMPTY: EduForm = { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '', description: '' };

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function EducationPage() {
  const { user, isAuthenticated } = useAuthStore();
  const isJobSeeker = isAuthenticated && user?.role === 'job_seeker';

  const [education, setEducation] = useState<Education[]>([]);
  const [eduLoaded, setEduLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [form, setForm] = useState<EduForm>(EMPTY);

  const [internships, setInternships] = useState<Job[]>([]);
  const [internshipsLoading, setInternshipsLoading] = useState(true);

  const [partners, setPartners] = useState<Company[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);

  useEffect(() => {
    if (isJobSeeker && !eduLoaded) {
      usersService.getResume().then(data => {
        setEducation(data.education || []);
        setEduLoaded(true);
      }).catch(() => toast.error('Не вдалося завантажити освіту'));
    }
  }, [isJobSeeker, eduLoaded]);

  useEffect(() => {
    api.get('/jobs?jobType=internship&limit=6')
      .then(res => setInternships(res.data?.data || []))
      .catch(() => {})
      .finally(() => setInternshipsLoading(false));
  }, []);

  useEffect(() => {
    api.get('/companies?limit=6')
      .then(res => setPartners(res.data?.data || []))
      .catch(() => {})
      .finally(() => setPartnersLoading(false));
  }, []);

  const saveResume = async (list: Education[]) => {
    const current = await usersService.getResume();
    await usersService.updateResume({ ...current, education: list });
  };

  const startAdd = () => { setForm(EMPTY); setEditingIdx(null); setShowForm(true); };
  const startEdit = (idx: number) => {
    const e = education[idx];
    setForm({ institution: e.institution, degree: e.degree, field: e.field, startDate: toInputDate(e.startDate), endDate: toInputDate(e.endDate), grade: e.grade || '', description: e.description || '' });
    setEditingIdx(idx);
    setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditingIdx(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.institution || !form.degree || !form.field || !form.startDate) {
      toast.error('Заповніть обовʼязкові поля: заклад, ступінь, спеціальність, дата початку');
      return;
    }
    setSaving(true);
    try {
      const entry: Education = {
        institution: form.institution, degree: form.degree, field: form.field,
        startDate: form.startDate, endDate: form.endDate || undefined,
        grade: form.grade || undefined, description: form.description || undefined,
      };
      const newList = editingIdx !== null
        ? education.map((e, i) => i === editingIdx ? entry : e)
        : [...education, entry];
      setEducation(newList);
      cancelForm();
      await saveResume(newList);
      toast.success('Освіту збережено');
    } catch { toast.error('Помилка збереження'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (idx: number) => {
    const newList = education.filter((_, i) => i !== idx);
    setEducation(newList);
    try { await saveResume(newList); toast.success('Запис видалено'); }
    catch { toast.error('Помилка видалення'); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Hero */}
      <div className="bg-linear-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/15 p-2.5 rounded-xl">
            <GraduationCap size={24} />
          </div>
          <h1 className="text-2xl font-bold">Навчальний кабінет</h1>
        </div>
        <p className="text-indigo-100 max-w-xl">
          Керуйте своєю освітою, знаходьте стажування від навчальних закладів та переглядайте освітніх партнерів платформи.
        </p>
      </div>

      {/* My Education — job_seeker only */}
      {isJobSeeker && (
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-600" />
              Моя освіта
            </h2>
            {!showForm && (
              <button
                onClick={startAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} /> Додати
              </button>
            )}
          </div>

          {showForm && (
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-4">
                {editingIdx !== null ? 'Редагування запису' : 'Новий запис'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Навчальний заклад *</label>
                  <input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="КПІ ім. Ігоря Сікорського" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ступінь *</label>
                  <input value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} placeholder="Бакалавр" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Спеціальність *</label>
                  <input value={form.field} onChange={e => setForm(f => ({ ...f, field: e.target.value }))} placeholder="Програмна інженерія" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Оцінка / GPA</label>
                  <input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="4.5 / 5.0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Дата початку *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Дата закінчення</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Опис</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Курсові роботи, досягнення, проєкти..." className={`${inputCls} resize-none`} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={cancelForm} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <X size={14} /> Скасувати
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Зберегти
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {!eduLoaded ? (
              <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-indigo-500" /></div>
            ) : education.length === 0 && !showForm ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">
                <GraduationCap size={36} className="mx-auto mb-2 opacity-20" />
                <p>Ще немає записів про освіту</p>
                <button onClick={startAdd} className="mt-3 text-indigo-600 hover:underline text-sm">Додати перший запис</button>
              </div>
            ) : education.map((edu, idx) => (
              <div key={idx} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-gray-900">{edu.institution}</h4>
                    {edu.grade && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">{edu.grade}</span>}
                  </div>
                  <p className="text-indigo-600 text-sm mt-0.5">{edu.degree} — {edu.field}</p>
                  <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                    <Calendar size={11} />
                    {formatDate(edu.startDate)} — {edu.endDate ? formatDate(edu.endDate) : 'дотепер'}
                  </p>
                  {edu.description && <p className="text-gray-500 text-sm mt-1">{edu.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(idx)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Internships */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase size={20} className="text-indigo-600" />
            Стажування для студентів
          </h2>
          <Link href={`${ROUTES.JOBS}?jobType=internship`} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Всі стажування <ChevronRight size={16} />
          </Link>
        </div>

        {internshipsLoading ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-indigo-500" /></div>
        ) : internships.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 text-center text-gray-400 text-sm">
            <Briefcase size={36} className="mx-auto mb-2 opacity-20" />
            <p>Наразі немає активних стажувань</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {internships.map(job => (
              <Link
                key={job.id}
                href={ROUTES.JOB_DETAIL(job.id)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    {job.employer?.company?.logoUrl
                      ? <img src={getFileUrl(job.employer.company.logoUrl)} alt="" className="w-8 h-8 object-contain rounded" />
                      : <Briefcase size={18} className="text-indigo-500" />}
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium shrink-0">Стажування</span>
                </div>
                <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1">{job.title}</h3>
                {job.employer?.company?.name && (
                  <p className="text-sm text-indigo-600">{job.employer.company.name}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(job.city || job.country) && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={11} /> {[job.city, job.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {job.isRemote && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Remote</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Education partners */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 size={20} className="text-indigo-600" />
            Навчальні партнери
          </h2>
          <Link href={ROUTES.COMPANIES} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Всі компанії <ChevronRight size={16} />
          </Link>
        </div>

        {partnersLoading ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-indigo-500" /></div>
        ) : partners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 text-center text-gray-400 text-sm">
            <Building2 size={36} className="mx-auto mb-2 opacity-20" />
            <p>Компаній ще немає</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map(company => (
              <Link
                key={company.id}
                href={ROUTES.COMPANY_DETAIL(company.slug)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {company.logoUrl
                    ? <img src={getFileUrl(company.logoUrl)} alt="" className="w-10 h-10 object-contain" />
                    : <Building2 size={20} className="text-gray-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{company.name}</h3>
                    {company.isVerified && <span className="text-indigo-500 shrink-0" title="Верифіковано">✓</span>}
                  </div>
                  {company.shortDescription && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{company.shortDescription}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {company.totalJobsPosted ? (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <ExternalLink size={11} /> {company.totalJobsPosted} вакансій
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
