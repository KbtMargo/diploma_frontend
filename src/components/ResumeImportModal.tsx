'use client';

import { useState } from 'react';
import {
  X, User, FileText, Briefcase, GraduationCap, Zap, Globe,
  AlertCircle, Check, Loader2,
} from 'lucide-react';

export interface ExtractedResumeData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  summary?: string;
  education?: {
    institution: string; degree: string; field: string;
    startDate?: string; endDate?: string; grade?: string; description?: string;
  }[];
  workExperience?: {
    company: string; position: string; startDate?: string; endDate?: string;
    current: boolean; description: string; achievements?: string[];
  }[];
  matchedSkills?: { id: string; name: string }[];
  unmatchedSkills?: string[];
  languages?: string[];
}

interface Section {
  key: 'personal' | 'summary' | 'work' | 'education' | 'skills' | 'languages';
  icon: React.ReactNode;
  label: string;
  hasData: boolean;
}

interface ResumeImportModalProps {
  data: ExtractedResumeData;
  onConfirm: (sections: Set<string>) => Promise<void>;
  onClose: () => void;
  isApplying: boolean;
  t: (k: string, v?: any) => string;
}

export default function ResumeImportModal({ data, onConfirm, onClose, isApplying, t }: ResumeImportModalProps) {
  const hasPersonal = !!(data.firstName || data.lastName || data.phoneNumber || data.country || data.city);
  const hasSummary = !!data.summary;
  const hasWork = !!(data.workExperience?.length);
  const hasEdu = !!(data.education?.length);
  const hasSkills = !!(data.matchedSkills?.length);
  const hasLangs = !!(data.languages?.length);

  const sections: Section[] = [
    { key: 'personal',  icon: <User size={16} />,        label: t('profile.import.sections.personal'),   hasData: hasPersonal },
    { key: 'summary',   icon: <FileText size={16} />,    label: t('profile.import.sections.summary'),    hasData: hasSummary },
    { key: 'work',      icon: <Briefcase size={16} />,   label: t('profile.import.sections.work'),       hasData: hasWork },
    { key: 'education', icon: <GraduationCap size={16}/>, label: t('profile.import.sections.education'), hasData: hasEdu },
    { key: 'skills',    icon: <Zap size={16} />,         label: t('profile.import.sections.skills'),     hasData: hasSkills },
    { key: 'languages', icon: <Globe size={16} />,       label: t('profile.import.sections.languages'),  hasData: hasLangs },
  ];

  const [selected, setSelected] = useState<Set<string>>(
    new Set(sections.filter(s => s.hasData).map(s => s.key)),
  );

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('profile.import.title')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('profile.import.subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {sections.map(sec => (
            <div
              key={sec.key}
              className={`rounded-xl border transition-colors ${
                !sec.hasData ? 'border-gray-100 bg-gray-50 opacity-50' :
                selected.has(sec.key) ? 'border-indigo-200 bg-indigo-50/40' :
                'border-gray-200 bg-white'
              }`}
            >
              <button
                disabled={!sec.hasData}
                onClick={() => toggle(sec.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                  selected.has(sec.key) && sec.hasData
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-gray-300 bg-white'
                }`}>
                  {selected.has(sec.key) && sec.hasData && <Check size={12} className="text-white" />}
                </div>
                <span className={`text-indigo-600 ${!sec.hasData ? 'text-gray-400' : ''}`}>{sec.icon}</span>
                <span className="font-medium text-sm text-gray-900 flex-1">{sec.label}</span>
                {!sec.hasData && <span className="text-xs text-gray-400">{t('profile.import.notFound')}</span>}
                {sec.hasData && sec.key === 'work' && (
                  <span className="text-xs text-gray-500">{data.workExperience!.length} {t('profile.import.entries')}</span>
                )}
                {sec.hasData && sec.key === 'education' && (
                  <span className="text-xs text-gray-500">{data.education!.length} {t('profile.import.entries')}</span>
                )}
              </button>

              {/* Preview */}
              {sec.hasData && selected.has(sec.key) && (
                <div className="px-4 pb-3 text-sm text-gray-600 border-t border-gray-100 mt-0 pt-2 space-y-1">
                  {sec.key === 'personal' && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {data.firstName && <span>{data.firstName} {data.lastName}</span>}
                      {data.email && <span>{data.email}</span>}
                      {data.phoneNumber && <span>{data.phoneNumber}</span>}
                      {data.city && <span>{data.city}{data.country ? `, ${data.country}` : ''}</span>}
                    </div>
                  )}
                  {sec.key === 'summary' && (
                    <p className="text-xs text-gray-500 line-clamp-3">{data.summary}</p>
                  )}
                  {sec.key === 'work' && (
                    <ul className="space-y-0.5">
                      {data.workExperience!.slice(0, 3).map((w, i) => (
                        <li key={i} className="text-xs text-gray-500">
                          • {w.position} @ {w.company}
                          {w.startDate && <span className="text-gray-400"> ({w.startDate.slice(0, 7)}–{w.current ? t('common.present') : w.endDate?.slice(0, 7)})</span>}
                        </li>
                      ))}
                      {data.workExperience!.length > 3 && <li className="text-xs text-gray-400">+{data.workExperience!.length - 3} {t('profile.import.more')}</li>}
                    </ul>
                  )}
                  {sec.key === 'education' && (
                    <ul className="space-y-0.5">
                      {data.education!.map((e, i) => (
                        <li key={i} className="text-xs text-gray-500">
                          • {e.institution} — {e.degree}, {e.field}
                        </li>
                      ))}
                    </ul>
                  )}
                  {sec.key === 'skills' && (
                    <div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.matchedSkills!.map(s => (
                          <span key={s.id} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{s.name}</span>
                        ))}
                      </div>
                      {(data.unmatchedSkills?.length ?? 0) > 0 && (
                        <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                          <AlertCircle size={11} />
                          {t('profile.import.unmatchedSkills')}: {data.unmatchedSkills!.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  {sec.key === 'languages' && (
                    <div className="flex flex-wrap gap-1">
                      {data.languages!.map(l => (
                        <span key={l} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <p className="text-xs text-amber-600 flex items-start gap-1.5 pt-1">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {t('profile.import.replaceWarning')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={isApplying} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={isApplying || selected.size === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isApplying ? <><Loader2 size={14} className="animate-spin" /> {t('profile.import.applying')}</> : t('profile.import.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
