'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Briefcase, MapPin, Phone, Mail, Edit2, Save, X, Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users.service';
import { ROUTES } from '@/lib/constants';
import { getInitials, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'resume' | 'portfolio'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    country: '',
    city: '',
    summary: '',
    languages: [] as string[],
    preferredCountries: [] as string[],
    preferredJobTypes: [] as string[],
  });

  const [newLanguage, setNewLanguage] = useState('');
  const [newCountry, setNewCountry] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        country: user.country || '',
        city: user.city || '',
        summary: user.summary || '',
        languages: user.languages || [],
        preferredCountries: user.preferredCountries || [],
        preferredJobTypes: user.preferredJobTypes || [],
      });
    }
  }, [user, isAuthenticated]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updated = await usersService.updateProfile(formData);
      updateUser(updated);
      toast.success('Профіль оновлено!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка збереження');
    } finally {
      setIsLoading(false);
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

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(f => ({ ...f, languages: [...f.languages, newLanguage.trim()] }));
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData(f => ({ ...f, languages: f.languages.filter(l => l !== lang) }));
  };

  const addCountry = () => {
    if (newCountry.trim() && !formData.preferredCountries.includes(newCountry.trim())) {
      setFormData(f => ({ ...f, preferredCountries: [...f.preferredCountries, newCountry.trim()] }));
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    setFormData(f => ({ ...f, preferredCountries: f.preferredCountries.filter(c => c !== country) }));
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        {/* Cover */}
        <div className="h-32 bg-linear-to-r from-indigo-500 to-purple-600" />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            {/* Avatar */}
            <div className="relative">
              {user.avatarUrl ? (
                <img src={`${process.env.NEXT_PUBLIC_API_URL}${user.avatarUrl}`} alt="" className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-md" />
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

            {/* Edit button */}
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
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Зберегти
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={16} /> Редагувати
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я</label>
                <input
                  value={formData.firstName}
                  onChange={(e) => setFormData(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище</label>
                <input
                  value={formData.lastName}
                  onChange={(e) => setFormData(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Країна</label>
                <input
                  value={formData.country}
                  onChange={(e) => setFormData(f => ({ ...f, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Місто</label>
                <input
                  value={formData.city}
                  onChange={(e) => setFormData(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Про себе</label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(f => ({ ...f, summary: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
              <p className="text-indigo-600 font-medium mt-0.5">
                {user.role === 'job_seeker' ? 'Шукач роботи' : user.role === 'employer' ? 'Роботодавець' : 'Адміністратор'}
              </p>
              <div className="flex flex-wrap gap-4 mt-3">
                {user.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail size={14} /> {user.email}
                  </span>
                )}
                {user.phoneNumber && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone size={14} /> {user.phoneNumber}
                  </span>
                )}
                {user.city && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin size={14} /> {user.city}, {user.country}
                  </span>
                )}
              </div>
              {user.summary && (
                <p className="text-gray-600 mt-4 leading-relaxed">{user.summary}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6">
        {[
          { id: 'profile', label: 'Профіль' },
          { id: 'resume', label: 'Резюме' },
          { id: 'portfolio', label: 'Портфоліо' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Languages */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Мови</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.languages.map(lang => (
                <span key={lang} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                  {lang}
                  {isEditing && (
                    <button onClick={() => removeLanguage(lang)}>
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLanguage()}
                  placeholder="Додати мову..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={addLanguage} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Preferred countries */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Бажані країни роботи</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.preferredCountries.map(country => (
                <span key={country} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                  {country}
                  {isEditing && (
                    <button onClick={() => removeCountry(country)}>
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <input
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCountry()}
                  placeholder="Додати країну..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={addCountry} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Навички</h3>
            {user.skills && user.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.skills.map(skill => (
                  <span key={skill.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Навички не додано</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'resume' && (
        <ResumeTab userId={user.id} />
      )}

      {activeTab === 'portfolio' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Портфоліо</h3>
          {user.portfolio && user.portfolio.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.portfolio.map((item, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
                      Переглянути →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Портфоліо порожнє</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResumeTab({ userId }: { userId: string }) {
  const [resume, setResume] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    usersService.getResume().then(data => {
      setResume(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      {/* Education */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Освіта</h3>
        {resume?.education && resume.education.length > 0 ? (
          <div className="space-y-4">
            {resume.education.map((edu: any, i: number) => (
              <div key={i} className="border-l-2 border-indigo-200 pl-4">
                <h4 className="font-medium text-gray-900">{edu.institution}</h4>
                <p className="text-indigo-600 text-sm">{edu.degree} — {edu.field}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {formatDate(edu.startDate)} — {edu.endDate ? formatDate(edu.endDate) : 'по теперішній час'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Освіта не додана</p>
        )}
      </div>

      {/* Work experience */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Досвід роботи</h3>
        {resume?.workExperience && resume.workExperience.length > 0 ? (
          <div className="space-y-4">
            {resume.workExperience.map((exp: any, i: number) => (
              <div key={i} className="border-l-2 border-green-200 pl-4">
                <h4 className="font-medium text-gray-900">{exp.position}</h4>
                <p className="text-green-600 text-sm">{exp.company}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {formatDate(exp.startDate)} — {exp.current ? 'по теперішній час' : exp.endDate ? formatDate(exp.endDate) : ''}
                </p>
                {exp.description && <p className="text-gray-600 text-sm mt-2">{exp.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Досвід роботи не додано</p>
        )}
      </div>
    </div>
  );
}