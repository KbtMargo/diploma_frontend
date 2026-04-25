'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Phone, Mail, Edit2, Save, X, Camera, Loader2, Plus, Building2, Shield,
  GraduationCap, Briefcase, Globe, Trash2, Check, Search, ExternalLink,
  Bookmark, FileText, ChevronLeft, ChevronRight, MessageCircle, Lock, Upload, Download,
  Share2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users.service';
import { ROUTES, JOB_TYPES } from '@/lib/constants';
import { getInitials, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import type { Education, WorkExperience, Portfolio, Skill } from '@/types';

const toInputDate = (d?: string | Date | null) => {
  if (!d) return '';
  try { return new Date(d as string).toISOString().split('T')[0]; } catch { return ''; }
};

type EduForm = {
  institution: string; degree: string; field: string;
  startDate: string; endDate: string; grade: string; description: string;
};
type WorkForm = {
  company: string; position: string; startDate: string;
  endDate: string; current: boolean; description: string; achievements: string;
};
type PortForm = { title: string; description: string; url: string; fileUrl?: string; fileType?: string };

const EMPTY_EDU: EduForm = { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '', description: '' };
const EMPTY_WORK: WorkForm = { company: '', position: '', startDate: '', endDate: '', current: false, description: '', achievements: '' };
const EMPTY_PORT: PortForm = { title: '', description: '', url: '', fileUrl: '', fileType: '' };

import dynamic from 'next/dynamic';
const PDFDownloadButton = dynamic(() => import('@/components/PDFDownloadButton'), {
  ssr: false,
  loading: () => null,
});

type CompletenessItem = { label: string; done: boolean; pts: number };

function computeCompleteness(
  user: any,
  skills: any[],
  education: any[],
  workExperience: any[],
  portfolio: any[],
): { score: number; items: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    { label: 'Фото профілю',       done: !!user?.avatarUrl,                        pts: 10 },
    { label: 'Про себе',            done: !!user?.summary,                           pts: 10 },
    { label: 'Навички',             done: skills.length > 0,                         pts: 15 },
    { label: 'Освіта',              done: education.length > 0,                      pts: 15 },
    { label: 'Досвід роботи',       done: workExperience.length > 0,                 pts: 15 },
    { label: 'Портфоліо',           done: portfolio.length > 0,                      pts: 10 },
    { label: 'Мови',                done: (user?.languages || []).length > 0,        pts: 5  },
    { label: 'Бажані країни',       done: (user?.preferredCountries || []).length > 0, pts: 5 },
    { label: 'Тип зайнятості',      done: (user?.preferredJobTypes || []).length > 0,  pts: 5 },
    { label: 'Номер телефону',      done: !!user?.phoneNumber,                       pts: 5  },
    { label: 'Місто та країна',     done: !!(user?.city && user?.country),           pts: 5  },
  ];
  const score = items.reduce((acc, i) => acc + (i.done ? i.pts : 0), 0);
  return { score, items };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'resume' | 'portfolio' | 'saved' | 'applications' | 'settings'>('profile');

  // Profile form state
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phoneNumber: '', country: '', city: '',
    summary: '', dateOfBirth: '',
    languages: [] as string[],
    preferredCountries: [] as string[],
    preferredJobTypes: [] as string[],
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [newCountry, setNewCountry] = useState('');

  // Skills
  const [userSkills, setUserSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState<Skill[]>([]);
  const [popularSkills, setPopularSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  // Password change
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Resume file upload
  const [resumeFileUploading, setResumeFileUploading] = useState(false);

  // Resume data
  const [education, setEducation] = useState<Education[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [resumeSaving, setResumeSaving] = useState(false);

  // Saved jobs
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [savedJobsLoading, setSavedJobsLoading] = useState(false);
  const [savedJobsPage, setSavedJobsPage] = useState(1);
  const [savedJobsMeta, setSavedJobsMeta] = useState<{ total: number; totalPages: number } | null>(null);

  // My applications
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsMeta, setApplicationsMeta] = useState<{ total: number; totalPages: number } | null>(null);

  // Education form
  const [editingEduIdx, setEditingEduIdx] = useState<number | null>(null);
  const [showEduForm, setShowEduForm] = useState(false);
  const [eduForm, setEduForm] = useState<EduForm>(EMPTY_EDU);

  // Work experience form
  const [editingWorkIdx, setEditingWorkIdx] = useState<number | null>(null);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [workForm, setWorkForm] = useState<WorkForm>(EMPTY_WORK);

  // Portfolio form
  const [editingPortIdx, setEditingPortIdx] = useState<number | null>(null);
  const [showPortForm, setShowPortForm] = useState(false);
  const [portForm, setPortForm] = useState<PortForm>(EMPTY_PORT);

  useEffect(() => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        country: user.country || '',
        city: user.city || '',
        summary: user.summary || '',
        dateOfBirth: toInputDate(user.dateOfBirth),
        languages: user.languages || [],
        preferredCountries: user.preferredCountries || [],
        preferredJobTypes: user.preferredJobTypes || [],
      });
      setUserSkills(user.skills || []);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if ((activeTab === 'resume' || activeTab === 'portfolio') && !resumeLoaded && isAuthenticated) {
      usersService.getResume().then(data => {
        setEducation(data.education || []);
        setWorkExperience(data.workExperience || []);
        setPortfolio(data.portfolio || []);
        setResumeLoaded(true);
      }).catch(() => toast.error('Помилка завантаження резюме'));
    }
  }, [activeTab, isAuthenticated, resumeLoaded]);

  // Load popular skills once when editing starts
  useEffect(() => {
    if (!isEditing || popularSkills.length > 0) return;
    api.get('/skills/popular?limit=30').then(res => {
      const all: Skill[] = res.data || [];
      setPopularSkills(all);
    }).catch(() => {});
  }, [isEditing]);

  // Load saved jobs when tab activates
  useEffect(() => {
    if (activeTab !== 'saved' || !isAuthenticated) return;
    setSavedJobsLoading(true);
    api.get(`/jobs/saved?page=${savedJobsPage}&limit=10`)
      .then(res => { setSavedJobs(res.data?.data || []); setSavedJobsMeta(res.data?.meta || null); })
      .catch(() => toast.error('Помилка завантаження'))
      .finally(() => setSavedJobsLoading(false));
  }, [activeTab, savedJobsPage, isAuthenticated]);

  // Load applications when tab activates
  useEffect(() => {
    if (activeTab !== 'applications' || !isAuthenticated) return;
    setApplicationsLoading(true);
    api.get(`/applications/my?page=${applicationsPage}&limit=10`)
      .then(res => { setMyApplications(res.data?.data || []); setApplicationsMeta(res.data?.meta || null); })
      .catch(() => toast.error('Помилка завантаження'))
      .finally(() => setApplicationsLoading(false));
  }, [activeTab, applicationsPage, isAuthenticated]);

  // Skills search with debounce
  useEffect(() => {
    if (!skillSearch.trim()) { setSkillResults([]); return; }
    const timer = setTimeout(async () => {
      setSkillsLoading(true);
      try {
        const res = await api.get(`/skills?search=${encodeURIComponent(skillSearch)}`);
        const all: Skill[] = res.data?.data || res.data || [];
        setSkillResults(all.filter(s => !userSkills.find(us => us.id === s.id)));
      } catch { setSkillResults([]); }
      finally { setSkillsLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [skillSearch, userSkills]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        skillIds: userSkills.map(s => s.id),
        dateOfBirth: formData.dateOfBirth || undefined,
      };
      const updated = await usersService.updateProfile(payload);
      updateUser(updated);
      toast.success('Профіль оновлено!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка збереження');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await usersService.uploadAvatar(file);
      updateUser({ avatarUrl: result.avatarUrl });
      toast.success('Аватар оновлено!');
    } catch {
      toast.error('Помилка завантаження аватара');
    }
  };

  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileUploading(true);
    try {
      const result = await usersService.uploadResumeFile(file);
      updateUser({ resumeUrl: result.resumeUrl });
      toast.success('Резюме завантажено!');
    } catch {
      toast.error('Помилка завантаження резюме');
    } finally {
      setResumeFileUploading(false);
      e.target.value = '';
    }
  };

  const handleResumeFileDelete = async () => {
    try {
      await api.delete('/users/resume-file');
      updateUser({ resumeUrl: undefined });
      toast.success('Резюме видалено');
    } catch {
      toast.error('Помилка видалення резюме');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast.error('Заповніть всі поля'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Паролі не збігаються'); return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Мінімум 6 символів'); return;
    }
    setPasswordSaving(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Пароль змінено!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка зміни пароля');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Languages
  const addLanguage = () => {
    const val = newLanguage.trim();
    if (val && !formData.languages.includes(val)) {
      setFormData(f => ({ ...f, languages: [...f.languages, val] }));
      setNewLanguage('');
    }
  };
  const removeLanguage = (l: string) => setFormData(f => ({ ...f, languages: f.languages.filter(x => x !== l) }));

  // Preferred countries
  const addCountry = () => {
    const val = newCountry.trim();
    if (val && !formData.preferredCountries.includes(val)) {
      setFormData(f => ({ ...f, preferredCountries: [...f.preferredCountries, val] }));
      setNewCountry('');
    }
  };
  const removeCountry = (c: string) => setFormData(f => ({ ...f, preferredCountries: f.preferredCountries.filter(x => x !== c) }));

  // Preferred job types
  const toggleJobType = (value: string) => {
    setFormData(f => ({
      ...f,
      preferredJobTypes: f.preferredJobTypes.includes(value)
        ? f.preferredJobTypes.filter(t => t !== value)
        : [...f.preferredJobTypes, value],
    }));
  };

  // Skills
  const addSkill = (skill: Skill) => {
    setUserSkills(prev => [...prev, skill]);
    setSkillSearch('');
    setSkillResults([]);
    setShowSkillDropdown(false);
  };
  const removeSkill = (id: string) => setUserSkills(prev => prev.filter(s => s.id !== id));

  const unsaveJob = async (jobId: string) => {
    try {
      await api.delete(`/jobs/${jobId}/save`);
      setSavedJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success('Вакансію видалено зі збережених');
    } catch { toast.error('Помилка'); }
  };

  const withdrawApplication = async (id: string) => {
    try {
      await api.put(`/applications/${id}/withdraw`);
      setMyApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'withdrawn' } : a));
      toast.success('Відгук відкликано');
    } catch { toast.error('Помилка відкликання'); }
  };

  // Resume save helper — always sends full arrays
  const saveResume = async (edu: Education[], work: WorkExperience[], port: Portfolio[]) => {
    setResumeSaving(true);
    try {
      await usersService.updateResume({ education: edu, workExperience: work, portfolio: port });
      toast.success('Збережено!');
    } catch {
      toast.error('Помилка збереження');
    } finally {
      setResumeSaving(false);
    }
  };

  // Education CRUD
  const startAddEdu = () => { setEduForm(EMPTY_EDU); setEditingEduIdx(null); setShowEduForm(true); };
  const startEditEdu = (idx: number) => {
    const e = education[idx];
    setEduForm({
      institution: e.institution, degree: e.degree, field: e.field,
      startDate: toInputDate(e.startDate), endDate: toInputDate(e.endDate),
      grade: e.grade || '', description: e.description || '',
    });
    setEditingEduIdx(idx);
    setShowEduForm(true);
  };
  const cancelEduForm = () => { setShowEduForm(false); setEditingEduIdx(null); setEduForm(EMPTY_EDU); };
  const saveEdu = async () => {
    if (!eduForm.institution || !eduForm.degree || !eduForm.field || !eduForm.startDate) {
      toast.error("Заповніть обов'язкові поля"); return;
    }
    const entry: Education = {
      institution: eduForm.institution, degree: eduForm.degree, field: eduForm.field,
      startDate: eduForm.startDate, endDate: eduForm.endDate || undefined,
      grade: eduForm.grade || undefined, description: eduForm.description || undefined,
    };
    const newList = editingEduIdx !== null
      ? education.map((e, i) => i === editingEduIdx ? entry : e)
      : [...education, entry];
    setEducation(newList);
    cancelEduForm();
    await saveResume(newList, workExperience, portfolio);
  };
  const deleteEdu = async (idx: number) => {
    const newList = education.filter((_, i) => i !== idx);
    setEducation(newList);
    await saveResume(newList, workExperience, portfolio);
  };

  // Work experience CRUD
  const startAddWork = () => { setWorkForm(EMPTY_WORK); setEditingWorkIdx(null); setShowWorkForm(true); };
  const startEditWork = (idx: number) => {
    const w = workExperience[idx];
    setWorkForm({
      company: w.company, position: w.position,
      startDate: toInputDate(w.startDate), endDate: toInputDate(w.endDate),
      current: w.current, description: w.description,
      achievements: (w.achievements || []).join('\n'),
    });
    setEditingWorkIdx(idx);
    setShowWorkForm(true);
  };
  const cancelWorkForm = () => { setShowWorkForm(false); setEditingWorkIdx(null); setWorkForm(EMPTY_WORK); };
  const saveWork = async () => {
    if (!workForm.company || !workForm.position || !workForm.startDate) {
      toast.error("Заповніть обов'язкові поля"); return;
    }
    const entry: WorkExperience = {
      company: workForm.company, position: workForm.position,
      startDate: workForm.startDate,
      endDate: workForm.current ? undefined : (workForm.endDate || undefined),
      current: workForm.current, description: workForm.description,
      achievements: workForm.achievements ? workForm.achievements.split('\n').filter(Boolean) : undefined,
    };
    const newList = editingWorkIdx !== null
      ? workExperience.map((e, i) => i === editingWorkIdx ? entry : e)
      : [...workExperience, entry];
    setWorkExperience(newList);
    cancelWorkForm();
    await saveResume(education, newList, portfolio);
  };
  const deleteWork = async (idx: number) => {
    const newList = workExperience.filter((_, i) => i !== idx);
    setWorkExperience(newList);
    await saveResume(education, newList, portfolio);
  };

  // Portfolio CRUD
  const startAddPort = () => { setPortForm(EMPTY_PORT); setEditingPortIdx(null); setShowPortForm(true); };
  const startEditPort = (idx: number) => {
    const p = portfolio[idx];
    setPortForm({ title: p.title, description: p.description, url: p.url || '', fileUrl: p.fileUrl || '', fileType: p.fileType || '' });
    setEditingPortIdx(idx);
    setShowPortForm(true);
  };
  const cancelPortForm = () => { setShowPortForm(false); setEditingPortIdx(null); setPortForm(EMPTY_PORT); };
  const savePort = async () => {
    if (!portForm.title || !portForm.description) {
      toast.error("Заповніть обов'язкові поля"); return;
    }
    const entry: Portfolio = {
      title: portForm.title, description: portForm.description,
      url: portForm.url || undefined,
      fileUrl: portForm.fileUrl || undefined,
      fileType: portForm.fileType || undefined,
    };
    const newList = editingPortIdx !== null
      ? portfolio.map((p, i) => i === editingPortIdx ? entry : p)
      : [...portfolio, entry];
    setPortfolio(newList);
    cancelPortForm();
    await saveResume(education, workExperience, newList);
  };
  const deletePort = async (idx: number) => {
    const newList = portfolio.filter((_, i) => i !== idx);
    setPortfolio(newList);
    await saveResume(education, workExperience, newList);
  };

  if (!user) return null;

  const isJobSeeker = user.role === 'job_seeker';
  const isEmployer = user.role === 'employer';
  const isAdmin = user.role === 'admin';

  const tabs = [
    ...(isJobSeeker
      ? [
          { id: 'profile', label: 'Профіль' },
          { id: 'resume', label: 'Резюме' },
          { id: 'portfolio', label: 'Портфоліо' },
          { id: 'saved', label: 'Збережені' },
          { id: 'applications', label: 'Відгуки' },
        ]
      : [{ id: 'profile', label: 'Профіль' }]),
    { id: 'settings', label: 'Налаштування' },
  ];

  const APP_STATUS: Record<string, { label: string; cls: string }> = {
    pending:             { label: 'На розгляді',  cls: 'bg-yellow-50 text-yellow-700' },
    reviewed:            { label: 'Переглянуто',  cls: 'bg-blue-50 text-blue-700' },
    shortlisted:         { label: 'Відібрано',    cls: 'bg-indigo-50 text-indigo-700' },
    interview_scheduled: { label: 'Запрошено',    cls: 'bg-purple-50 text-purple-700' },
    interviewed:         { label: 'Співбесіда',   cls: 'bg-purple-50 text-purple-700' },
    offered:             { label: 'Пропозиція',   cls: 'bg-green-50 text-green-700' },
    accepted:            { label: 'Прийнято',     cls: 'bg-green-100 text-green-800' },
    rejected:            { label: 'Відхилено',    cls: 'bg-red-50 text-red-700' },
    withdrawn:           { label: 'Відкликано',   cls: 'bg-gray-100 text-gray-500' },
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="h-32 bg-linear-to-r from-indigo-500 to-purple-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${user.avatarUrl}`}
                  alt=""
                  className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-white bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                  {getInitials(user.firstName, user.lastName)}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Camera size={14} className="text-gray-600" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            <div className="flex gap-2 mt-14">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <X size={16} /> Скасувати
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Зберегти
                  </button>
                </>
              ) : (
                <>
                  {isJobSeeker && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/users/${user.id}`);
                        toast.success('Посилання скопійовано!');
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Скопіювати публічне посилання"
                    >
                      <Share2 size={16} /> Поділитись
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 size={16} /> Редагувати
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Ім'я</label>
                <input value={formData.firstName} onChange={e => setFormData(f => ({ ...f, firstName: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Прізвище</label>
                <input value={formData.lastName} onChange={e => setFormData(f => ({ ...f, lastName: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Телефон</label>
                <input value={formData.phoneNumber} onChange={e => setFormData(f => ({ ...f, phoneNumber: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Дата народження</label>
                <input type="date" value={formData.dateOfBirth} onChange={e => setFormData(f => ({ ...f, dateOfBirth: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Країна</label>
                <input value={formData.country} onChange={e => setFormData(f => ({ ...f, country: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Місто</label>
                <input value={formData.city} onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Про себе</label>
                <textarea
                  value={formData.summary}
                  onChange={e => setFormData(f => ({ ...f, summary: e.target.value }))}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
              <p className="text-indigo-600 font-medium mt-0.5">
                {isJobSeeker ? 'Шукач роботи' : isEmployer ? 'Роботодавець' : 'Адміністратор'}
              </p>
              <div className="flex flex-wrap gap-4 mt-3">
                {user.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500"><Mail size={14} /> {user.email}</span>
                )}
                {user.phoneNumber && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500"><Phone size={14} /> {user.phoneNumber}</span>
                )}
                {user.city && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500"><MapPin size={14} /> {user.city}, {user.country}</span>
                )}
              </div>
              {user.summary && <p className="text-gray-600 mt-4 leading-relaxed">{user.summary}</p>}

              {/* Profile completeness — job seekers only */}
              {isJobSeeker && (() => {
                const { score, items } = computeCompleteness(user, userSkills, education, workExperience, portfolio);
                const missing = items.filter(i => !i.done);
                const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400';
                return (
                  <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Заповненість профілю</span>
                      <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
                    </div>
                    {missing.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Додайте: {missing.map(i => i.label).join(' · ')}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Languages */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={16} className="text-indigo-600" /> Мови
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.languages.map(lang => (
                <span key={lang} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                  {lang}
                  {isEditing && <button onClick={() => removeLanguage(lang)} className="ml-1 hover:text-red-500"><X size={11} /></button>}
                </span>
              ))}
              {formData.languages.length === 0 && !isEditing && <p className="text-gray-400 text-sm">Не вказано</p>}
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <input
                  value={newLanguage} onChange={e => setNewLanguage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLanguage()}
                  placeholder="Додати мову..."
                  className={inputCls}
                />
                <button onClick={addLanguage} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shrink-0"><Plus size={16} /></button>
              </div>
            )}
          </div>

          {/* Preferred countries — job seekers */}
          {isJobSeeker && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-600" /> Бажані країни роботи
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.preferredCountries.map(c => (
                  <span key={c} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                    {c}
                    {isEditing && <button onClick={() => removeCountry(c)} className="ml-1 hover:text-red-500"><X size={11} /></button>}
                  </span>
                ))}
                {formData.preferredCountries.length === 0 && !isEditing && <p className="text-gray-400 text-sm">Не вказано</p>}
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <input
                    value={newCountry} onChange={e => setNewCountry(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCountry()}
                    placeholder="Додати країну..."
                    className={inputCls}
                  />
                  <button onClick={addCountry} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shrink-0"><Plus size={16} /></button>
                </div>
              )}
            </div>
          )}

          {/* Preferred job types — job seekers */}
          {isJobSeeker && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase size={16} className="text-indigo-600" /> Типи зайнятості
              </h3>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map(jt => {
                  const selected = formData.preferredJobTypes.includes(jt.value);
                  return (
                    <button
                      key={jt.value}
                      onClick={() => isEditing && toggleJobType(jt.value)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : isEditing
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {selected && <Check size={11} />}
                      {jt.label}
                    </button>
                  );
                })}
              </div>
              {!isEditing && formData.preferredJobTypes.length === 0 && <p className="text-gray-400 text-sm mt-3">Не вказано</p>}
            </div>
          )}

          {/* Skills — job seekers */}
          {isJobSeeker && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-600" /> Навички
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {userSkills.map(skill => (
                  <span key={skill.id} className="flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                    {skill.name}
                    {isEditing && <button onClick={() => removeSkill(skill.id)} className="ml-1 hover:text-red-500"><X size={11} /></button>}
                  </span>
                ))}
                {userSkills.length === 0 && !isEditing && <p className="text-gray-400 text-sm">Навички не додано</p>}
              </div>
              {isEditing && (
                <div className="relative max-w-sm">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={skillSearch}
                    onChange={e => { setSkillSearch(e.target.value); setShowSkillDropdown(true); }}
                    onFocus={() => setShowSkillDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSkillDropdown(false), 150)}
                    placeholder="Пошук навичок..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {showSkillDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {skillsLoading ? (
                        <div className="p-3 text-center"><Loader2 size={16} className="animate-spin mx-auto text-indigo-600" /></div>
                      ) : skillSearch ? (
                        skillResults.length > 0 ? (
                          skillResults.map(skill => (
                            <button key={skill.id} onMouseDown={() => addSkill(skill)}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span>{skill.name}</span>
                              {skill.category && <span className="text-gray-400 text-xs">{skill.category.name}</span>}
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-gray-400 text-center">Нічого не знайдено</div>
                        )
                      ) : (
                        <>
                          <p className="px-4 pt-2.5 pb-1 text-xs text-gray-400 font-medium uppercase tracking-wide">Популярні</p>
                          {popularSkills
                            .filter(s => !userSkills.find(us => us.id === s.id))
                            .slice(0, 20)
                            .map(skill => (
                              <button key={skill.id} onMouseDown={() => addSkill(skill)}
                                className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm text-gray-700 transition-colors flex items-center justify-between"
                              >
                                <span>{skill.name}</span>
                                {skill.category && <span className="text-gray-400 text-xs">{skill.category.name}</span>}
                              </button>
                            ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Employer card */}
          {isEmployer && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Компанія</h3>
              <p className="text-sm text-gray-500 mb-4">Керуйте профілем вашої компанії, вакансіями та заявками в особистому кабінеті роботодавця.</p>
              <Link href="/employer/dashboard" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium w-fit">
                <Building2 size={16} /> Кабінет роботодавця
              </Link>
            </div>
          )}

          {/* Admin card */}
          {isAdmin && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Адміністрування</h3>
              <p className="text-sm text-gray-500 mb-4">Доступ до панелі адміністратора для управління користувачами, вакансіями та платформою.</p>
              <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium w-fit">
                <Shield size={16} /> Панель адміністратора
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── RESUME TAB ── */}
      {activeTab === 'resume' && isJobSeeker && (
        <div className="space-y-6">

          {/* Resume file upload */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" /> PDF-резюме
            </h3>
            <p className="text-sm text-gray-500 mb-4">Завантажте готове резюме у форматі PDF — роботодавці зможуть його скачати</p>
            <div className="flex items-center gap-3 flex-wrap">
              {user.resumeUrl && (
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}${user.resumeUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Download size={15} /> Переглянути резюме
                  </a>
                  <button
                    onClick={handleResumeFileDelete}
                    className="px-2 py-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 transition-colors border-l border-gray-200"
                    title="Видалити резюме"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              <PDFDownloadButton user={user} skills={userSkills} education={education} workExperience={workExperience} portfolio={portfolio} />
              <button
                onClick={() => resumeFileRef.current?.click()}
                disabled={resumeFileUploading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {resumeFileUploading
                  ? <><Loader2 size={15} className="animate-spin" /> Завантаження...</>
                  : <><Upload size={15} /> {user.resumeUrl ? 'Замінити резюме' : 'Завантажити резюме'}</>
                }
              </button>
              <input ref={resumeFileRef} type="file" accept=".pdf" onChange={handleResumeFileUpload} className="hidden" />
              {!user.resumeUrl && <span className="text-xs text-gray-400">Тільки PDF, до 10 МБ</span>}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <GraduationCap size={18} className="text-indigo-600" /> Освіта
              </h3>
              {!showEduForm && (
                <button onClick={startAddEdu} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus size={14} /> Додати
                </button>
              )}
            </div>

            {showEduForm && (
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-4">{editingEduIdx !== null ? 'Редагування' : 'Нова освіта'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Заклад освіти *</label>
                    <input value={eduForm.institution} onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))} placeholder="Назва університету" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Ступінь *</label>
                    <input value={eduForm.degree} onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))} placeholder="Бакалавр, Магістр..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Спеціальність *</label>
                    <input value={eduForm.field} onChange={e => setEduForm(f => ({ ...f, field: e.target.value }))} placeholder="Комп'ютерні науки..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Оцінка / GPA</label>
                    <input value={eduForm.grade} onChange={e => setEduForm(f => ({ ...f, grade: e.target.value }))} placeholder="4.0, відмінно..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Початок *</label>
                    <input type="date" value={eduForm.startDate} onChange={e => setEduForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Кінець</label>
                    <input type="date" value={eduForm.endDate} onChange={e => setEduForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Опис</label>
                    <textarea value={eduForm.description} onChange={e => setEduForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Додаткова інформація..." className={`${inputCls} resize-none`} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={cancelEduForm} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    <X size={14} /> Скасувати
                  </button>
                  <button onClick={saveEdu} disabled={resumeSaving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                    {resumeSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Зберегти
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {education.length === 0 && !showEduForm ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">
                  <GraduationCap size={32} className="mx-auto mb-2 opacity-25" />
                  Освіту не додано
                </div>
              ) : education.map((edu, idx) => (
                <div key={idx} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900">{edu.institution}</h4>
                      {edu.grade && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">{edu.grade}</span>}
                    </div>
                    <p className="text-indigo-600 text-sm mt-0.5">{edu.degree} — {edu.field}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {formatDate(edu.startDate)} — {edu.endDate ? formatDate(edu.endDate) : 'по теперішній час'}
                    </p>
                    {edu.description && <p className="text-gray-500 text-sm mt-1">{edu.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEditEdu(idx)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => deleteEdu(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-600" /> Досвід роботи
              </h3>
              {!showWorkForm && (
                <button onClick={startAddWork} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus size={14} /> Додати
                </button>
              )}
            </div>

            {showWorkForm && (
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-4">{editingWorkIdx !== null ? 'Редагування' : 'Новий досвід'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Компанія *</label>
                    <input value={workForm.company} onChange={e => setWorkForm(f => ({ ...f, company: e.target.value }))} placeholder="Назва компанії" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Посада *</label>
                    <input value={workForm.position} onChange={e => setWorkForm(f => ({ ...f, position: e.target.value }))} placeholder="Frontend Developer..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Початок *</label>
                    <input type="date" value={workForm.startDate} onChange={e => setWorkForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Кінець</label>
                    <input
                      type="date" value={workForm.endDate}
                      onChange={e => setWorkForm(f => ({ ...f, endDate: e.target.value }))}
                      disabled={workForm.current}
                      className={`${inputCls} disabled:opacity-50 disabled:bg-gray-50`}
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox" id="current-job" checked={workForm.current}
                      onChange={e => setWorkForm(f => ({ ...f, current: e.target.checked, endDate: e.target.checked ? '' : f.endDate }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="current-job" className="text-sm text-gray-700">Працюю тут зараз</label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Опис обов'язків</label>
                    <textarea value={workForm.description} onChange={e => setWorkForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Ваші обов'язки..." className={`${inputCls} resize-none`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Досягнення <span className="font-normal text-gray-400 text-xs">(кожне з нового рядка)</span></label>
                    <textarea
                      value={workForm.achievements}
                      onChange={e => setWorkForm(f => ({ ...f, achievements: e.target.value }))}
                      rows={3}
                      placeholder={"Впровадив нову систему...\nЗбільшив продуктивність на 30%..."}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={cancelWorkForm} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    <X size={14} /> Скасувати
                  </button>
                  <button onClick={saveWork} disabled={resumeSaving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                    {resumeSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Зберегти
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {workExperience.length === 0 && !showWorkForm ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">
                  <Briefcase size={32} className="mx-auto mb-2 opacity-25" />
                  Досвід роботи не додано
                </div>
              ) : workExperience.map((exp, idx) => (
                <div key={idx} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900">{exp.position}</h4>
                      {exp.current && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Поточне</span>}
                    </div>
                    <p className="text-indigo-600 text-sm mt-0.5">{exp.company}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {formatDate(exp.startDate)} — {exp.current ? 'по теперішній час' : exp.endDate ? formatDate(exp.endDate) : ''}
                    </p>
                    {exp.description && <p className="text-gray-600 text-sm mt-2">{exp.description}</p>}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {exp.achievements.map((a, ai) => (
                          <li key={ai} className="text-gray-500 text-sm flex gap-1.5">
                            <span className="text-indigo-400 mt-0.5 shrink-0">•</span>{a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEditWork(idx)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => deleteWork(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SAVED JOBS TAB ── */}
      {activeTab === 'saved' && isJobSeeker && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bookmark size={18} className="text-indigo-600" /> Збережені вакансії
            </h3>
            {savedJobsMeta && <span className="text-sm text-gray-400">{savedJobsMeta.total} вакансій</span>}
          </div>

          {savedJobsLoading ? (
            <div className="py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-indigo-600" /></div>
          ) : savedJobs.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-400 text-sm">
              <Bookmark size={36} className="mx-auto mb-3 opacity-20" />
              <p>Збережених вакансій немає</p>
              <p className="mt-1 text-xs">Натискайте на серце на сторінці вакансій, щоб зберегти</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {savedJobs.map(job => (
                  <div key={job.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                          {job.title}
                        </a>
                        {job.isUrgent && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Терміново</span>}
                      </div>
                      {job.employer?.company?.name && (
                        <p className="text-sm text-indigo-600 mt-0.5">{job.employer.company.name}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        {(job.city || job.country) && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={11} /> {[job.city, job.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {(job.salaryMin || job.salaryMax) && (
                          <span className="text-xs text-gray-500">
                            {job.salaryMin && job.salaryMax
                              ? `${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()} ${job.salaryCurrency || 'USD'}`
                              : job.isSalaryNegotiable ? 'Договірна' : ''}
                          </span>
                        )}
                        {job.jobType && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {JOB_TYPES.find(t => t.value === job.jobType)?.label ?? job.jobType}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/jobs/${job.id}`}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Переглянути вакансію"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => unsaveJob(job.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Видалити зі збережених"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {savedJobsMeta && savedJobsMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <button
                    onClick={() => setSavedJobsPage(p => Math.max(1, p - 1))}
                    disabled={savedJobsPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Назад
                  </button>
                  <span className="text-sm text-gray-400">{savedJobsPage} / {savedJobsMeta.totalPages}</span>
                  <button
                    onClick={() => setSavedJobsPage(p => Math.min(savedJobsMeta.totalPages, p + 1))}
                    disabled={savedJobsPage === savedJobsMeta.totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    Далі <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── APPLICATIONS TAB ── */}
      {activeTab === 'applications' && isJobSeeker && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" /> Мої відгуки
            </h3>
            {applicationsMeta && <span className="text-sm text-gray-400">{applicationsMeta.total} відгуків</span>}
          </div>

          {applicationsLoading ? (
            <div className="py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-indigo-600" /></div>
          ) : myApplications.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-400 text-sm">
              <FileText size={36} className="mx-auto mb-3 opacity-20" />
              <p>Відгуків ще немає</p>
              <p className="mt-1 text-xs">Відгукніться на вакансії на сторінці пошуку</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {myApplications.map(app => {
                  const status = APP_STATUS[app.status] ?? { label: app.status, cls: 'bg-gray-100 text-gray-500' };
                  const canWithdraw = ['pending', 'reviewed', 'shortlisted'].includes(app.status);
                  return (
                    <div key={app.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={`/jobs/${app.jobId}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                              {app.job?.title ?? 'Вакансія'}
                            </a>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                          </div>
                          {app.job?.employer?.company?.name && (
                            <p className="text-sm text-indigo-600 mt-0.5">{app.job.employer.company.name}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {(app.job?.city || app.job?.country) && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin size={11} /> {[app.job.city, app.job.country].filter(Boolean).join(', ')}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              Відгукнувся {formatDate(app.createdAt)}
                            </span>
                          </div>
                          {app.employerNotes && (
                            <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                              <span className="font-medium text-gray-700">Коментар: </span>{app.employerNotes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <a
                            href={`/jobs/${app.jobId}`}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Переглянути вакансію"
                          >
                            <ExternalLink size={14} />
                          </a>
                          {app.job?.employer?.id && (
                            <a
                              href={`/chat?userId=${app.job.employer.id}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <MessageCircle size={12} /> Написати
                            </a>
                          )}
                          {canWithdraw && (
                            <button
                              onClick={() => withdrawApplication(app.id)}
                              className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              Відкликати
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {applicationsMeta && applicationsMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <button
                    onClick={() => setApplicationsPage(p => Math.max(1, p - 1))}
                    disabled={applicationsPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Назад
                  </button>
                  <span className="text-sm text-gray-400">{applicationsPage} / {applicationsMeta.totalPages}</span>
                  <button
                    onClick={() => setApplicationsPage(p => Math.min(applicationsMeta.totalPages, p + 1))}
                    disabled={applicationsPage === applicationsMeta.totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    Далі <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Lock size={16} className="text-indigo-600" /> Зміна пароля
            </h3>
            <p className="text-sm text-gray-500 mb-5">Введіть поточний пароль і новий для його зміни</p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Поточний пароль</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, oldPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Новий пароль</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Мінімум 6 символів"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Підтвердіть новий пароль</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={passwordSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {passwordSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Змінити пароль
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTFOLIO TAB ── */}
      {activeTab === 'portfolio' && isJobSeeker && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Проєкти</h3>
            {!showPortForm && (
              <button onClick={startAddPort} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus size={14} /> Додати проєкт
              </button>
            )}
          </div>

          {showPortForm && (
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-4">{editingPortIdx !== null ? 'Редагування проєкту' : 'Новий проєкт'}</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelCls}>Назва проєкту *</label>
                  <input value={portForm.title} onChange={e => setPortForm(f => ({ ...f, title: e.target.value }))} placeholder="Мій проєкт" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Опис *</label>
                  <textarea value={portForm.description} onChange={e => setPortForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Коротко про проєкт, технології..." className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>Посилання</label>
                  <input value={portForm.url} onChange={e => setPortForm(f => ({ ...f, url: e.target.value }))} placeholder="https://github.com/..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Файл проєкту <span className="text-gray-400 font-normal">(зображення, PDF, презентація)</span></label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors">
                      <Upload size={14} />
                      {portForm.fileUrl ? 'Замінити файл' : 'Завантажити файл'}
                      <input
                        type="file"
                        accept="image/*,.pdf,.pptx,.zip"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append('file', file);
                          try {
                            const res = await api.post('/users/portfolio-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                            setPortForm(f => ({ ...f, fileUrl: res.data.fileUrl, fileType: res.data.fileType }));
                            toast.success('Файл завантажено');
                          } catch { toast.error('Помилка завантаження'); }
                        }}
                      />
                    </label>
                    {portForm.fileUrl && (
                      <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Файл додано</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={cancelPortForm} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <X size={14} /> Скасувати
                </button>
                <button onClick={savePort} disabled={resumeSaving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {resumeSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Зберегти
                </button>
              </div>
            </div>
          )}

          {portfolio.length === 0 && !showPortForm ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              <ExternalLink size={32} className="mx-auto mb-2 opacity-25" />
              Портфоліо порожнє
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolio.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEditPort(idx)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => deletePort(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 text-sm hover:underline">
                        <ExternalLink size={13} /> Посилання
                      </a>
                    )}
                    {item.fileUrl && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}${item.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-600 text-sm hover:underline"
                      >
                        <Download size={13} /> {item.fileType === 'image' ? 'Зображення' : 'Файл'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
