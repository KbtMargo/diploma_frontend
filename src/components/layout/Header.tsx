'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bell, Menu, X, Briefcase, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('До побачення!');
    router.push(ROUTES.LOGIN);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Briefcase size={20} />
            </div>
            <span className="font-bold text-xl text-gray-900">JobPlatform</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href={ROUTES.JOBS} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Вакансії
            </Link>
            <Link href={ROUTES.COMPANIES} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Компанії
            </Link>
            {user?.role === 'employer' && (
              <Link href={ROUTES.EMPLOYER.DASHBOARD} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                Кабінет
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link href={ROUTES.ADMIN.DASHBOARD} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                Адмін
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${user.avatarUrl}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                    )}
                    <span className="hidden md:block text-sm font-medium text-gray-700">
                      {user.firstName}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <Link
                        href={ROUTES.PROFILE}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User size={16} />
                        Профіль
                      </Link>
                      <Link
                        href={ROUTES.APPLICATIONS}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Briefcase size={16} />
                        Мої заявки
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut size={16} />
                        Вийти
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={ROUTES.LOGIN}
                  className="text-gray-600 hover:text-indigo-600 font-medium px-4 py-2 transition-colors"
                >
                  Увійти
                </Link>
                <Link
                  href={ROUTES.REGISTER}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Реєстрація
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-500"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col gap-2">
              <Link href={ROUTES.JOBS} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                Вакансії
              </Link>
              <Link href={ROUTES.COMPANIES} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                Компанії
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}