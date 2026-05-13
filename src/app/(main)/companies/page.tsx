'use client';

import { useState, useEffect } from 'react';
import { Search, Building, Users, Star, Briefcase, Loader2 } from 'lucide-react';
import { Company } from '@/types';
import { COMPANY_SIZES } from '@/lib/constants';
import { companiesService } from '@/services/companies.service';
import { useI18n } from '@/contexts/I18nContext';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import Link from 'next/link';

const INDUSTRIES = [
  { value: 'Інформаційні технології', key: 'companies.industries.it' },
  { value: 'IT-аутсорсинг', key: 'companies.industries.outsourcing' },
  { value: 'Стартапи та продуктова розробка', key: 'companies.industries.startups' },
  { value: 'Мобільна розробка', key: 'companies.industries.mobile' },
  { value: 'Аналіз даних', key: 'companies.industries.data' },
  { value: 'Дизайн', key: 'companies.industries.design' },
  { value: 'DevOps & Cloud', key: 'companies.industries.devops' },
];

function CompanyCard({ company, t }: { company: Company; t: (k: string, v?: any) => string }) {
  const shortDesc = useAutoTranslate(company.shortDescription);
  const industry = useAutoTranslate(company.industry);
  return (
    <Link href={`/companies/${company.id}`}>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          {company.logoUrl ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}${company.logoUrl}`}
              alt={company.name}
              className="w-14 h-14 rounded-2xl object-cover border border-gray-100"
            />
          ) : (
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <Building size={24} className="text-indigo-600" />
            </div>
          )}
          <div className="flex items-center gap-1">
            {company.isVerified && (
              <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">
                ✓ {t('companies.verified')}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors text-lg">{company.name}</h3>
          {company.industry && <p className="text-indigo-600 text-sm mt-0.5">{industry || company.industry}</p>}
          {company.shortDescription && (
            <p className="text-gray-500 text-sm mt-2 line-clamp-2">{shortDesc || company.shortDescription}</p>
          )}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          {company.size && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Users size={12} />
              {t(`companySizes.${company.size}`) || company.size}
            </span>
          )}
          {company.totalJobsPosted !== undefined && company.totalJobsPosted > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Briefcase size={12} />
              {company.totalJobsPosted} {t('companies.jobs')}
            </span>
          )}
          {company.rating !== undefined && company.rating > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Star size={12} className="text-yellow-500" />
              {company.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CompaniesPage() {
  const { t } = useI18n();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', industry: '', size: '' });

  useEffect(() => {
    fetchCompanies();
  }, [page, filters]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await companiesService.getCompanies(page, filters);
      setCompanies(data.data);
      setTotal(data.meta.total);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ search: '', industry: '', size: '' });
    setPage(1);
  };

  const translatedSizes = COMPANY_SIZES.map(s => ({
    value: s.value,
    label: t(`companySizes.${s.value}`),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('companies.title')}</h1>
        <p className="text-gray-500 mt-1">{t('companies.found', { count: String(total) })}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder={t('companies.filters.search')}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filters.industry}
            onChange={(e) => setFilters(f => ({ ...f, industry: e.target.value }))}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">{t('companies.filters.allIndustries')}</option>
            {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{t(i.key)}</option>)}
          </select>
          <select
            value={filters.size}
            onChange={(e) => setFilters(f => ({ ...f, size: e.target.value }))}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">{t('companies.filters.size')}</option>
            {translatedSizes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {(filters.search || filters.industry || filters.size) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              {t('companies.filters.reset')}
            </button>
          )}
        </div>
      </div>

      {/* Companies grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <Building size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-500">{t('companies.empty.title')}</h3>
          <p className="text-gray-400 mt-2">{t('companies.empty.subtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(company => (
            <CompanyCard key={company.id} company={company} t={t} />
          ))}
        </div>
      )}

      {total > 12 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors"
          >
            {t('companies.pagination.prev')}
          </button>
          <span className="px-4 py-2 text-gray-600">{page} / {Math.ceil(total / 12)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 12)}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors"
          >
            {t('companies.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
