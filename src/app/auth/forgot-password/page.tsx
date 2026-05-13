'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const schema = z.object({
    email: z.string().email(t('auth.validation.emailInvalid')),
  });
  type Form = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSentEmail(data.email);
      setIsSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.forgotPassword.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        {!isSent ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t('auth.forgotPassword.title')}</h1>
              <p className="text-gray-500 mt-2">{t('auth.forgotPassword.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.forgotPassword.email')}</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> {t('auth.forgotPassword.submitting')}</>
                ) : (
                  t('auth.forgotPassword.submit')
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.forgotPassword.sent')}</h2>
            <p className="text-gray-500 mb-2">{t('auth.forgotPassword.sentDesc')}</p>
            <p className="font-medium text-indigo-600 mb-6">{sentEmail}</p>
            <p className="text-sm text-gray-400 mb-6">{t('auth.forgotPassword.checkSpam')}</p>
            <button
              onClick={() => setIsSent(false)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              {t('auth.forgotPassword.resend')}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href={ROUTES.LOGIN}
            className="flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
