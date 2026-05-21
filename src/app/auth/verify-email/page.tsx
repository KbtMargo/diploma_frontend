'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import api from '@/lib/axios';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';

type Status = 'loading' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token');
  const [errorMsg, setErrorMsg] = useState('');
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (!token || hasCalledRef.current) return;
    hasCalledRef.current = true;
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(e => {
        setErrorMsg(e.response?.data?.message || 'Помилка підтвердження');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6">
          <Mail size={28} className="text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Підтвердження email</h1>

        {status === 'loading' && (
          <div className="py-6">
            <Loader2 size={36} className="animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-500">Перевіряємо токен...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold mb-1">Email підтверджено!</p>
            <p className="text-gray-500 text-sm mb-6">Тепер ви можете користуватися всіма функціями платформи.</p>
            <Link
              href={ROUTES.LOGIN}
              className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Увійти в акаунт
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold mb-1">Помилка підтвердження</p>
            <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
            <Link
              href={ROUTES.LOGIN}
              className="inline-block text-indigo-600 border border-indigo-200 px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
            >
              На сторінку входу
            </Link>
          </div>
        )}

        {status === 'no-token' && (
          <div className="py-4">
            <XCircle size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm mb-6">Токен підтвердження відсутній. Перевірте посилання у листі.</p>
            <Link
              href={ROUTES.LOGIN}
              className="inline-block text-indigo-600 border border-indigo-200 px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
            >
              На сторінку входу
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
