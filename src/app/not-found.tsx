'use client';

import Link from 'next/link';
import { Briefcase, ArrowLeft, Search } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="bg-indigo-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Briefcase size={36} className="text-indigo-600" />
        </div>
        <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('notFound.title')}</h2>
        <p className="text-gray-500 mb-8">{t('notFound.subtitle')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft size={18} /> {t('notFound.back')}
          </Link>
          <Link
            href="/jobs"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <Search size={18} /> {t('notFound.browse')}
          </Link>
        </div>
      </div>
    </div>
  );
}
