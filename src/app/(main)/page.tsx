'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Briefcase, Users, Building, ArrowRight, Star, TrendingUp, Globe, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Job, Company } from '@/types';
import { ROUTES, JOB_TYPES } from '@/lib/constants';
import { formatSalary, formatRelativeDate } from '@/lib/utils';
import api from '@/lib/axios';

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ jobs: 0, companies: 0, users: 0 });

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  try {
    const allJobs = await api.get('/jobs?limit=6');
    setFeaturedJobs(allJobs.data.data || []);
    setStats(s => ({ ...s, jobs: allJobs.data.meta?.total || 0 }));
  } catch (error) {
    console.error(error);
  }
};

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${ROUTES.JOBS}?search=${search}`);
  };

  return (
    <div>
      {/* Hero section */}
      <section className="bg-linear-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <TrendingUp size={14} />
            <span>Платформа пошуку роботи для молоді</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Знайди роботу<br />
            <span className="text-yellow-300">своєї мрії</span>
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Тисячі вакансій та стажувань в Україні та за кордоном. Розпочни кар'єру вже сьогодні.
          </p>

          {/* Search form */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl p-2 flex gap-2 max-w-2xl mx-auto shadow-xl">
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search size={20} className="text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Посада, компанія, навичка..."
                className="w-full text-gray-900 focus:outline-none py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors shrink-0"
            >
              Знайти
            </button>
          </form>

          {/* Quick filters */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['JavaScript', 'Python', 'Design', 'Marketing', 'Remote'].map(tag => (
              <button
                key={tag}
                onClick={() => router.push(`${ROUTES.JOBS}?search=${tag}`)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full text-sm transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '10,000+', label: 'Вакансій' },
              { value: '500+', label: 'Компаній' },
              { value: '50,000+', label: 'Шукачів роботи' },
              { value: '30+', label: 'Країн' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-indigo-600">{stat.value}</p>
                <p className="text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured jobs */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Актуальні вакансії</h2>
              <p className="text-gray-500 mt-1">Найкращі пропозиції для вас</p>
            </div>
            <Link
              href={ROUTES.JOBS}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Всі вакансії <ArrowRight size={18} />
            </Link>
          </div>

          {featuredJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Вакансії завантажуються...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredJobs.map(job => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all h-full group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Briefcase size={18} className="text-indigo-600" />
                      </div>
                      {job.isUrgent && (
                        <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          Терміново
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {job.employer?.firstName} {job.employer?.lastName}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <MapPin size={14} />
                      <span>{job.city || 'Віддалено'}, {job.country}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-semibold text-indigo-600 text-sm">
                        {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {JOB_TYPES.find(t => t.value === job.jobType)?.label}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Job categories */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">Популярні категорії</h2>
            <p className="text-gray-500 mt-2">Знайдіть роботу у своїй сфері</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'IT та розробка', icon: '💻', count: '2,500+' },
              { label: 'Дизайн', icon: '🎨', count: '800+' },
              { label: 'Маркетинг', icon: '📈', count: '1,200+' },
              { label: 'Фінанси', icon: '💰', count: '600+' },
              { label: 'Освіта', icon: '📚', count: '400+' },
              { label: 'Медицина', icon: '🏥', count: '300+' },
              { label: 'Юриспруденція', icon: '⚖️', count: '250+' },
              { label: 'Логістика', icon: '🚚', count: '500+' },
            ].map(cat => (
              <button
                key={cat.label}
                onClick={() => router.push(`${ROUTES.JOBS}?category=${cat.label}`)}
                className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-2xl transition-all group text-left"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-indigo-600 text-sm transition-colors">
                    {cat.label}
                  </p>
                  <p className="text-xs text-gray-400">{cat.count} вакансій</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">Як це працює</h2>
            <p className="text-gray-500 mt-2">Три простих кроки до роботи мрії</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Створіть профіль',
                desc: 'Заповніть резюме, додайте навички та досвід роботи',
                icon: Users,
                color: 'indigo',
              },
              {
                step: '02',
                title: 'Знайдіть вакансію',
                desc: 'Шукайте за фільтрами: країна, галузь, зарплата',
                icon: Search,
                color: 'purple',
              },
              {
                step: '03',
                title: 'Подайте заявку',
                desc: 'Надішліть резюме та супровідний лист роботодавцю',
                icon: Briefcase,
                color: 'green',
              },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className={`w-16 h-16 bg-${item.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon size={28} className={`text-${item.color}-600`} />
                </div>
                <div className="text-4xl font-bold text-gray-100 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-indigo-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Готові почати?</h2>
          <p className="text-indigo-100 text-lg mb-8">
            Зареєструйтесь безкоштовно і отримайте доступ до тисяч вакансій
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={ROUTES.REGISTER}
              className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
            >
              Зареєструватись
            </Link>
            <Link
              href={ROUTES.JOBS}
              className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Переглянути вакансії
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                  <Briefcase size={16} />
                </div>
                <span className="font-bold text-white">StartWay</span>
              </div>
              <p className="text-sm">Платформа пошуку роботи та стажувань для молоді</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Пошукачам</h4>
              <div className="space-y-2 text-sm">
                <Link href={ROUTES.JOBS} className="block hover:text-white transition-colors">Вакансії</Link>
                <Link href={ROUTES.COMPANIES} className="block hover:text-white transition-colors">Компанії</Link>
                <Link href={ROUTES.PROFILE} className="block hover:text-white transition-colors">Профіль</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Роботодавцям</h4>
              <div className="space-y-2 text-sm">
                <Link href={ROUTES.EMPLOYER.DASHBOARD} className="block hover:text-white transition-colors">Кабінет</Link>
                <Link href={ROUTES.REGISTER} className="block hover:text-white transition-colors">Реєстрація</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Контакти</h4>
              <div className="space-y-2 text-sm">
                <p>info@jobplatform.ua</p>
                <p>Україна</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm">
            <p>© 2026 StartWay. Всі права захищені.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}