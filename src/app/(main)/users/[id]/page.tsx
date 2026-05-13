'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Mail, Phone, Globe, GraduationCap, Briefcase,
  ExternalLink, MessageCircle, Loader2, ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { getInitials, formatDate } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/axios';
import type { User } from '@/types';

function EduItem({ edu, t }: { edu: any; t: (k: string) => string }) {
  const desc = useAutoTranslate(edu.description);
  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="font-medium text-gray-900">{edu.institution}</h4>
        {edu.grade && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">{edu.grade}</span>}
      </div>
      <p className="text-indigo-600 text-sm mt-0.5">{edu.degree} — {edu.field}</p>
      <p className="text-gray-400 text-xs mt-1">
        {formatDate(edu.startDate)} — {edu.endDate ? formatDate(edu.endDate) : t('publicProfile.present')}
      </p>
      {edu.description && <p className="text-gray-500 text-sm mt-1">{desc || edu.description}</p>}
    </div>
  );
}

function WorkItem({ exp, t }: { exp: any; t: (k: string) => string }) {
  const desc = useAutoTranslate(exp.description);
  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="font-medium text-gray-900">{exp.position}</h4>
        {exp.current && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{t('publicProfile.current')}</span>}
      </div>
      <p className="text-indigo-600 text-sm mt-0.5">{exp.company}</p>
      <p className="text-gray-400 text-xs mt-1">
        {formatDate(exp.startDate)} — {exp.current ? t('publicProfile.present') : exp.endDate ? formatDate(exp.endDate) : ''}
      </p>
      {exp.description && <p className="text-gray-600 text-sm mt-2">{desc || exp.description}</p>}
      {exp.achievements && exp.achievements.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {exp.achievements.map((a: string, ai: number) => (
            <li key={ai} className="text-gray-500 text-sm flex gap-1.5">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>{a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { t } = useI18n();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const translatedSummary = useAutoTranslate(profile?.summary);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    api.get(`/users/${id}`)
      .then(res => setProfile(res.data))
      .catch(() => router.push('/jobs'))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }
  if (!profile) return null;

  const resume = profile as any;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> {t('publicProfile.back')}
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="h-28 bg-linear-to-r from-indigo-500 to-purple-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div>
              {profile.avatarUrl ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${profile.avatarUrl}`}
                  alt=""
                  className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-white bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                  {getInitials(profile.firstName, profile.lastName)}
                </div>
              )}
            </div>
            <Link
              href={`/chat?userId=${profile.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium mt-14"
            >
              <MessageCircle size={16} /> {t('publicProfile.message')}
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
          <p className="text-indigo-600 font-medium mt-0.5">
            {t(`publicProfile.roles.${profile.role}`) || profile.role}
          </p>
          <div className="flex flex-wrap gap-4 mt-3">
            {profile.email && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><Mail size={14} />{profile.email}</span>
            )}
            {profile.phoneNumber && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><Phone size={14} />{profile.phoneNumber}</span>
            )}
            {(profile.city || profile.country) && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin size={14} />{[profile.city, profile.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          {profile.summary && (
            <p className="text-gray-600 mt-4 leading-relaxed">{translatedSummary || profile.summary}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {profile.skills && profile.skills.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-600" /> {t('publicProfile.skills')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(s => (
                  <span key={s.id} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.languages && profile.languages.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Globe size={16} className="text-indigo-600" /> {t('publicProfile.languages')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map(l => (
                  <span key={l} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">{l}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          {resume.education && resume.education.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap size={18} className="text-indigo-600" /> {t('publicProfile.education')}
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {resume.education.map((edu: any, idx: number) => (
                  <EduItem key={idx} edu={edu} t={t} />
                ))}
              </div>
            </div>
          )}

          {resume.workExperience && resume.workExperience.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-600" /> {t('publicProfile.workExperience')}
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {resume.workExperience.map((exp: any, idx: number) => (
                  <WorkItem key={idx} exp={exp} t={t} />
                ))}
              </div>
            </div>
          )}

          {resume.portfolio && resume.portfolio.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{t('publicProfile.portfolio')}</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resume.portfolio.map((item: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-indigo-600 text-sm hover:underline mt-2">
                        <ExternalLink size={13} /> {t('publicProfile.view')}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
