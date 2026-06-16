export const API_URL = typeof window !== 'undefined' ? '/api-proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function getFileUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // /uploads/* paths are proxied by Next.js (next.config.ts rewrite) — use as-is (same-origin).
  // This avoids CORS/CORP issues when the frontend and backend are on different domains.
  return path;
}

export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  VERIFY_EMAIL: '/auth/verify-email',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  JOBS: '/jobs',
  JOB_DETAIL: (id: string) => `/jobs/${id}`,
  PROFILE: '/profile',
  RESUME: '/profile/resume',
  SAVED_JOBS: '/profile/saved-jobs',
  APPLICATIONS: '/applications',
  COMPANIES: '/companies',
  COMPANY_DETAIL: (id: string) => `/companies/${id}`,
  EMPLOYER: {
    DASHBOARD: '/employer/dashboard',
    JOBS: '/employer/jobs',
    APPLICATIONS: '/employer/applications',
    COMPANY: '/employer/company',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    JOBS: '/admin/jobs',
    COMPANIES: '/admin/companies',
  },
  EDUCATION: '/education',
  PRICING: '/pricing',
};

export const JOB_TYPES = [
  { value: 'full_time', label: 'Повна зайнятість' },
  { value: 'part_time', label: 'Часткова зайнятість' },
  { value: 'internship', label: 'Стажування' },
  { value: 'remote', label: 'Віддалено' },
  { value: 'freelance', label: 'Фріланс' },
  { value: 'contract', label: 'Контракт' },
];

export const EXPERIENCE_LEVELS = [
  { value: 'intern', label: 'Стажер' },
  { value: 'junior', label: 'Junior' },
  { value: 'middle', label: 'Middle' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
];

export const WORK_FORMATS = [
  { value: 'office', label: 'Офіс' },
  { value: 'remote', label: 'Віддалено' },
  { value: 'hybrid', label: 'Гібрид' },
];

export const JOB_CATEGORIES = [
  { value: 'it', label: 'IT та розробка' },
  { value: 'design', label: 'Дизайн' },
  { value: 'marketing', label: 'Маркетинг' },
  { value: 'finance', label: 'Фінанси' },
  { value: 'education', label: 'Освіта' },
  { value: 'medicine', label: 'Медицина' },
  { value: 'law', label: 'Юриспруденція' },
  { value: 'logistics', label: 'Логістика' },
  { value: 'sales', label: 'Продажі' },
  { value: 'hr', label: 'HR та рекрутинг' },
];

export const JOB_LANGUAGES = [
  { value: 'ukrainian', label: 'Українська' },
  { value: 'english', label: 'Англійська' },
  { value: 'polish', label: 'Польська' },
  { value: 'german', label: 'Німецька' },
  { value: 'french', label: 'Французька' },
  { value: 'spanish', label: 'Іспанська' },
];

export const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 співробітників' },
  { value: '11-50', label: '11-50 співробітників' },
  { value: '51-200', label: '51-200 співробітників' },
  { value: '201-500', label: '201-500 співробітників' },
  { value: '500+', label: '500+ співробітників' },
];

export const USER_ROLES = {
  JOB_SEEKER: 'job_seeker',
  EMPLOYER: 'employer',
  ADMIN: 'admin',
} as const;

export const APPLICATION_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Очікує', color: 'gray' },
  reviewed: { label: 'Переглянуто', color: 'blue' },
  shortlisted: { label: 'Відібрано', color: 'purple' },
  interview_scheduled: { label: 'Співбесіда', color: 'yellow' },
  interviewed: { label: 'Проведено співбесіду', color: 'orange' },
  offered: { label: 'Пропозиція', color: 'green' },
  accepted: { label: 'Прийнято', color: 'green' },
  rejected: { label: 'Відхилено', color: 'red' },
  withdrawn: { label: 'Відкликано', color: 'gray' },
};