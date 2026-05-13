'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const registerSchema = z.object({
    firstName: z.string().min(2, t('auth.validation.firstNameMin2')),
    lastName: z.string().min(2, t('auth.validation.lastNameMin2')),
    email: z.string().email(t('auth.validation.emailInvalid')),
    password: z.string().min(8, t('auth.validation.passwordMin8')),
    confirmPassword: z.string(),
    role: z.enum(['job_seeker', 'employer']),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.validation.passwordsMismatch'),
    path: ['confirmPassword'],
  });

  type RegisterForm = z.infer<typeof registerSchema>;

  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'job_seeker' },
  });

  const role = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      await authService.register(registerData);
      toast.success(t('auth.register.success'));
      router.push(ROUTES.LOGIN);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.register.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('auth.register.title')}</h1>
          <p className="text-gray-500 mt-2">{t('auth.register.subtitle')}</p>
        </div>

        {/* Role selector */}
        <div className="flex gap-3 mb-6">
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${role === 'job_seeker' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
            <input {...register('role')} type="radio" value="job_seeker" className="hidden" />
            <span className="text-lg">👤</span>
            <span className="font-medium text-sm">{t('auth.register.jobSeeker')}</span>
          </label>
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${role === 'employer' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
            <input {...register('role')} type="radio" value="employer" className="hidden" />
            <span className="text-lg">🏢</span>
            <span className="font-medium text-sm">{t('auth.register.employer')}</span>
          </label>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.firstName')}</label>
              <input
                {...register('firstName')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.lastName')}</label>
              <input
                {...register('lastName')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.email')}</label>
            <input
              {...register('email')}
              type="email"
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.password')}</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
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
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.confirmPassword')}</label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading
              ? <><Loader2 size={20} className="animate-spin" />{t('auth.register.submitting')}</>
              : t('auth.register.submit')}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6">
          {t('auth.register.hasAccount')}{' '}
          <Link href={ROUTES.LOGIN} className="text-indigo-600 hover:text-indigo-800 font-medium">
            {t('auth.register.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
