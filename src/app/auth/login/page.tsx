'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t('auth.validation.emailInvalid')),
    password: z.string().min(6, t('auth.validation.passwordMin6')),
  });
  type LoginForm = z.infer<typeof loginSchema>;

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      setAuth(response.user, response.accessToken, response.refreshToken);
      toast.success(t('auth.login.welcome'));

      if (response.user.role === 'admin') {
        router.push(ROUTES.ADMIN.DASHBOARD);
      } else if (response.user.role === 'employer') {
        router.push(ROUTES.EMPLOYER.DASHBOARD);
      } else {
        router.push(ROUTES.JOBS);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('auth.login.title')}</h1>
          <p className="text-gray-500 mt-2">{t('auth.login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.login.email')}
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.login.password')}
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm text-gray-600">{t('auth.login.rememberMe')}</span>
            </label>
            <Link
              href={ROUTES.FORGOT_PASSWORD}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {t('auth.login.submitting')}
              </>
            ) : (
              t('auth.login.submit')
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6">
          {t('auth.login.noAccount')}{' '}
          <Link href={ROUTES.REGISTER} className="text-indigo-600 hover:text-indigo-800 font-medium">
            {t('auth.login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
