'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Briefcase, Users, ArrowRight, TrendingUp, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Job } from '@/types';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';
import api from '@/lib/axios';
import { formatSalary } from '@/lib/utils';
import { useSavedJobs } from '@/lib/hooks/useSavedJobs';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

function FeaturedJobCard({ job, savedIds, toggleSave, t }: {
  job: Job;
  savedIds: Set<string>;
  toggleSave: (id: string, e: React.MouseEvent) => void;
  t: (k: string, v?: any) => string;
}) {
  const title = useAutoTranslate(job.title);
  const city = useAutoTranslate(job.city);
  const country = useAutoTranslate(job.country);
  const employerName = useAutoTranslate(job.employer ? `${job.employer.firstName} ${job.employer.lastName}` : '');
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all h-full group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Briefcase size={18} className="text-indigo-600" />
          </div>
          <div className="flex items-center gap-2">
            {job.isUrgent && (
              <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {t('common.urgent')}
              </span>
            )}
            <button
              onClick={(e) => toggleSave(job.id, e)}
              className={`p-1.5 rounded-lg transition-colors ${savedIds.has(job.id) ? 'text-red-500 hover:text-red-600' : 'text-gray-300 hover:text-red-400'}`}
              title={savedIds.has(job.id) ? t('jobs.unsave') : t('jobs.save')}
            >
              <Heart size={16} fill={savedIds.has(job.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
          {title || job.title}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {employerName || `${job.employer?.firstName} ${job.employer?.lastName}`}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <MapPin size={14} />
          <span>{(city || job.city) || t('common.remote')}, {country || job.country}</span>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-semibold text-indigo-600 text-sm">
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
          </span>
          <span className="text-xs text-gray-400">
            {t(`jobTypes.${job.jobType}`)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const { savedIds, toggleSave } = useSavedJobs();
  const [search, setSearch] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ jobs: 0, companies: 0, users: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, companiesRes] = await Promise.all([
        api.get('/jobs?limit=6'),
        api.get('/companies?limit=1').catch(() => ({ data: { meta: { total: 0 } } })),
      ]);
      setFeaturedJobs(jobsRes.data.data || []);
      setStats({
        jobs: jobsRes.data.meta?.total || 0,
        companies: companiesRes.data.meta?.total || 0,
        users: 0,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${ROUTES.JOBS}?search=${search}`);
  };

  const categories = [
    { key: 'it',        icon: '💻', count: '2,500+' },
    { key: 'design',    icon: '🎨', count: '800+' },
    { key: 'marketing', icon: '📈', count: '1,200+' },
    { key: 'finance',   icon: '💰', count: '600+' },
    { key: 'education', icon: '📚', count: '400+' },
    { key: 'medicine',  icon: '🏥', count: '300+' },
    { key: 'law',       icon: '⚖️', count: '250+' },
    { key: 'logistics', icon: '🚚', count: '500+' },
  ] as const;

  return (
    <div>
      {/* Hero section */}
      <section className="bg-linear-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <TrendingUp size={14} />
            <span>{t('home.badge')}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {t('home.hero.title1')}<br />
            <span className="text-yellow-300">{t('home.hero.title2')}</span>
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            {t('home.hero.subtitle')}
          </p>

          {/* Search form */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl p-2 flex gap-2 max-w-2xl mx-auto shadow-xl">
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search size={20} className="text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('home.hero.searchPlaceholder')}
                className="w-full text-gray-900 focus:outline-none py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors shrink-0"
            >
              {t('home.hero.search')}
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
              { value: stats.jobs > 0 ? stats.jobs.toLocaleString() : '—', label: t('home.stats.jobs') },
              { value: stats.companies > 0 ? stats.companies.toLocaleString() : '—', label: t('home.stats.companies') },
              { value: '50,000+', label: t('home.stats.jobSeekers') },
              { value: '30+', label: t('home.stats.countries') },
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
              <h2 className="text-2xl font-bold text-gray-900">{t('home.featured.title')}</h2>
              <p className="text-gray-500 mt-1">{t('home.featured.subtitle')}</p>
            </div>
            <Link
              href={ROUTES.JOBS}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {t('home.featured.all')} <ArrowRight size={18} />
            </Link>
          </div>

          {featuredJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
              <p>{t('home.featured.loading')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredJobs.map(job => (
                <FeaturedJobCard key={job.id} job={job} savedIds={savedIds} toggleSave={toggleSave} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Job categories */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">{t('home.categories.title')}</h2>
            <p className="text-gray-500 mt-2">{t('home.categories.subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => router.push(`${ROUTES.JOBS}?category=${cat.key}`)}
                className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-2xl transition-all group text-left"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-indigo-600 text-sm transition-colors">
                    {t(`home.categories.${cat.key}`)}
                  </p>
                  <p className="text-xs text-gray-400">{cat.count} {t('home.categories.vacancies')}</p>
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
            <h2 className="text-2xl font-bold text-gray-900">{t('home.howItWorks.title')}</h2>
            <p className="text-gray-500 mt-2">{t('home.howItWorks.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {([
              { step: '01', key: 'step1', icon: Users,    color: 'indigo' },
              { step: '02', key: 'step2', icon: Search,   color: 'purple' },
              { step: '03', key: 'step3', icon: Briefcase, color: 'green' },
            ] as const).map(item => (
              <div key={item.step} className="text-center">
                <div className={`w-16 h-16 bg-${item.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon size={28} className={`text-${item.color}-600`} />
                </div>
                <div className="text-4xl font-bold text-gray-200 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(`home.howItWorks.${item.key}.title`)}</h3>
                <p className="text-gray-500">{t(`home.howItWorks.${item.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-indigo-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t('home.cta.title')}</h2>
          <p className="text-indigo-100 text-lg mb-8">{t('home.cta.subtitle')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={ROUTES.REGISTER}
              className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
            >
              {t('home.cta.register')}
            </Link>
            <Link
              href={ROUTES.JOBS}
              className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              {t('home.cta.browse')}
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
              <p className="text-sm">{t('home.footer.tagline')}</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">{t('home.footer.jobSeekers')}</h4>
              <div className="space-y-2 text-sm">
                <Link href={ROUTES.JOBS} className="block hover:text-white transition-colors">{t('nav.jobs')}</Link>
                <Link href={ROUTES.COMPANIES} className="block hover:text-white transition-colors">{t('nav.companies')}</Link>
                <Link href={ROUTES.PROFILE} className="block hover:text-white transition-colors">{t('nav.profile')}</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">{t('home.footer.employers')}</h4>
              <div className="space-y-2 text-sm">
                <Link href={ROUTES.EMPLOYER.DASHBOARD} className="block hover:text-white transition-colors">{t('nav.dashboard')}</Link>
                <Link href={ROUTES.REGISTER} className="block hover:text-white transition-colors">{t('nav.register')}</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">{t('home.footer.contacts')}</h4>
              <div className="space-y-2 text-sm">
                <p>info@startway.ua</p>
                <p>Ukraine</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm">
            <p>{t('home.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
