'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';
import toast from 'react-hot-toast';

type Form = { newPassword: string; confirmPassword: string };

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const token = searchParams.get('token');

  const schema = z.object({
    newPassword: z.string().min(8, t('auth.validation.passwordMin8')),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t('auth.validation.passwordsMismatch'),
    path: ['confirmPassword'],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    if (!token) {
      toast.error(t('auth.resetPassword.invalidLink'));
      return;
    }
    setIsLoading(true);
    try {
      await authService.resetPassword(token, data.newPassword);
      setIsDone(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.resetPassword.invalidLink'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.invalidLink')}</h2>
          <p className="text-gray-500 mb-6">{t('auth.resetPassword.invalidLink')}</p>
          <Link
            href={ROUTES.FORGOT_PASSWORD}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-block"
          >
            {t('auth.forgotPassword.resend')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        {!isDone ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t('auth.resetPassword.title')}</h1>
              <p className="text-gray-500 mt-2">{t('auth.resetPassword.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.resetPassword.password')}</label>
                <div className="relative">
                  <input
                    {...register('newPassword')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.resetPassword.confirmPassword')}</label>
                <div className="relative">
                  <input
                    {...register('confirmPassword')}
                    type={showConfirm ? 'text' : 'password'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> {t('auth.resetPassword.submitting')}</>
                ) : (
                  t('auth.resetPassword.submit')
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.success')}</h2>
            <p className="text-gray-500 mb-6">{t('auth.resetPassword.subtitle')}</p>
            <button
              onClick={() => router.push(ROUTES.LOGIN)}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('nav.login')}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href={ROUTES.LOGIN}
            className="flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> {t('auth.resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
