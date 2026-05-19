'use client';

import { useState } from 'react';
import { Check, X, Zap, Star, Crown, Briefcase, Building2, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import toast from 'react-hot-toast';

type Audience = 'seeker' | 'employer';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number | null;
  period: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  features: PlanFeature[];
  cta: string;
  highlight: boolean;
}

const SEEKER_PLANS: Plan[] = [
  {
    id: 'seeker_free',
    name: 'Базовий',
    price: 0,
    period: '',
    description: 'Для тих, хто тільки починає шукати роботу',
    icon: <Briefcase size={22} />,
    features: [
      { text: 'Створення профілю та резюме', included: true },
      { text: 'Перегляд всіх вакансій', included: true },
      { text: 'Подача заявок на вакансії', included: true },
      { text: 'Збереження вакансій', included: true },
      { text: 'AI-парсинг резюме (PDF)', included: true },
      { text: 'Пріоритет у пошуку роботодавців', included: false },
      { text: 'Featured профіль', included: false },
      { text: 'Необмежені AI-підказки по резюме', included: false },
    ],
    cta: 'Поточний план',
    highlight: false,
  },
  {
    id: 'seeker_premium',
    name: 'Premium',
    price: 9.99,
    period: '/міс',
    description: 'Для тих, хто хоче виділитись серед інших кандидатів',
    icon: <Star size={22} />,
    badge: 'Популярний',
    badgeColor: 'bg-indigo-600',
    features: [
      { text: 'Все з Базового плану', included: true },
      { text: 'Пріоритет у пошуку роботодавців', included: true },
      { text: 'Featured профіль (значок ⭐)', included: true },
      { text: 'Необмежені AI-підказки по резюме', included: true },
      { text: 'Доступ до аналітики переглядів профілю', included: true },
      { text: 'Кар\'єрні консультації (1/міс)', included: true },
      { text: 'Пріоритетна підтримка', included: true },
    ],
    cta: 'Отримати Premium',
    highlight: true,
  },
];

const EMPLOYER_PLANS: Plan[] = [
  {
    id: 'employer_free',
    name: 'Стартер',
    price: 0,
    period: '',
    description: 'Для малого бізнесу та стартапів',
    icon: <Building2 size={22} />,
    features: [
      { text: 'До 2 активних вакансій', included: true },
      { text: 'Базовий профіль компанії', included: true },
      { text: 'Перегляд заявок кандидатів', included: true },
      { text: 'Пошук кандидатів', included: false },
      { text: 'Featured вакансії', included: false },
      { text: 'Аналітика вакансій', included: false },
      { text: 'Необмежені вакансії', included: false },
    ],
    cta: 'Поточний план',
    highlight: false,
  },
  {
    id: 'employer_basic',
    name: 'Basic',
    price: 29,
    period: '/міс',
    description: 'Для компаній, що активно наймають',
    icon: <Zap size={22} />,
    badge: 'Популярний',
    badgeColor: 'bg-indigo-600',
    features: [
      { text: 'До 10 активних вакансій', included: true },
      { text: 'Повний профіль компанії', included: true },
      { text: 'Перегляд заявок кандидатів', included: true },
      { text: 'Пошук кандидатів за фільтрами', included: true },
      { text: 'Email-сповіщення про нових кандидатів', included: true },
      { text: 'Аналітика вакансій', included: true },
      { text: 'Featured вакансії', included: false },
    ],
    cta: 'Підключити Basic',
    highlight: true,
  },
  {
    id: 'employer_pro',
    name: 'Pro',
    price: 79,
    period: '/міс',
    description: 'Для великих компаній та рекрутингових агенцій',
    icon: <Crown size={22} />,
    features: [
      { text: 'Необмежені активні вакансії', included: true },
      { text: 'Повний профіль компанії', included: true },
      { text: 'Перегляд заявок кандидатів', included: true },
      { text: 'Розширений пошук кандидатів', included: true },
      { text: 'Featured вакансії (пріоритет)', included: true },
      { text: 'Детальна аналітика', included: true },
      { text: 'Пріоритетна підтримка 24/7', included: true },
    ],
    cta: 'Підключити Pro',
    highlight: false,
  },
];

function PlanCard({ plan, onUpgrade, isCurrent }: { plan: Plan; onUpgrade: (plan: Plan) => void; isCurrent: boolean }) {
  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-8 transition-all ${
      plan.highlight
        ? 'border-indigo-500 shadow-xl shadow-indigo-100 scale-[1.02]'
        : 'border-gray-200 hover:border-indigo-200 hover:shadow-md'
    } bg-white`}>
      {plan.badge && (
        <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${plan.badgeColor} text-white text-xs font-semibold px-4 py-1 rounded-full`}>
          {plan.badge}
        </div>
      )}

      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
        plan.highlight ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
      }`}>
        {plan.icon}
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
      <p className="text-sm text-gray-500 mb-6">{plan.description}</p>

      <div className="mb-8">
        {plan.price === 0 ? (
          <span className="text-4xl font-bold text-gray-900">Безкоштовно</span>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
            <span className="text-gray-400 mb-1">{plan.period}</span>
          </div>
        )}
      </div>

      <ul className="flex-1 space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            {feature.included ? (
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={12} className="text-green-600" strokeWidth={2.5} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X size={12} className="text-gray-400" strokeWidth={2.5} />
              </div>
            )}
            <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onUpgrade(plan)}
        disabled={isCurrent || plan.price === 0}
        className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
          isCurrent || plan.price === 0
            ? 'bg-gray-100 text-gray-400 cursor-default'
            : plan.highlight
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
            : 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        {isCurrent ? 'Поточний план' : plan.cta}
      </button>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: 'Чи можу я скасувати підписку?',
    a: 'Так, у будь-який момент. Підписка діє до кінця оплаченого періоду.',
  },
  {
    q: 'Чи є пробний період?',
    a: 'Так, плани Basic і Pro мають 7-денний безкоштовний пробний період.',
  },
  {
    q: 'Як відбувається оплата?',
    a: 'Карткою Visa/Mastercard або через PayPal. Щомісячне або річне (знижка 20%) списання.',
  },
  {
    q: 'Знижки для студентів?',
    a: 'Так! Студенти з дійсним студентським квитком отримують 50% знижку на Premium для шукачів.',
  },
];

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="divide-y divide-gray-100">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between py-4 text-left gap-4"
          >
            <span className="font-semibold text-gray-900 text-sm">{item.q}</span>
            <ChevronDown
              size={18}
              className={`text-gray-400 shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
            />
          </button>
          {openIndex === i && (
            <p className="text-sm text-gray-500 pb-4">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const [audience, setAudience] = useState<Audience>('seeker');
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const plans = audience === 'seeker' ? SEEKER_PLANS : EMPLOYER_PLANS;

  const handleUpgrade = (plan: Plan) => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    toast.success(
      `Дякуємо за інтерес до плану ${plan.name}! Оплата буде доступна незабаром.`,
      { duration: 4000 }
    );
  };

  const isCurrentPlan = (plan: Plan) => {
    if (plan.price === 0) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <span className="inline-block bg-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Тарифні плани
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Обери свій план та розпочни кар'єру мрії
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Freemium-модель для шукачів роботи та гнучка підписка для роботодавців. Почни безкоштовно, переходь на преміум коли готовий.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setAudience('seeker')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                audience === 'seeker'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Шукачі роботи
            </button>
            <button
              onClick={() => setAudience('employer')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                audience === 'employer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Роботодавці
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className={`grid gap-6 ${plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onUpgrade={handleUpgrade}
              isCurrent={isCurrentPlan(plan)}
            />
          ))}
        </div>

        {/* FAQ accordion */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Часті запитання</h2>
          <FaqAccordion />
        </div>

        {/* CTA banner */}
        <div className="mt-8 bg-indigo-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Готовий розпочати?</h2>
          <p className="text-indigo-200 mb-6">Приєднуйся до тисяч молодих спеціалістів, які вже знайшли роботу через StartWay</p>
          <button
            onClick={() => router.push(isAuthenticated ? ROUTES.JOBS : ROUTES.REGISTER)}
            className="bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            {isAuthenticated ? 'Переглянути вакансії' : 'Зареєструватись безкоштовно'}
          </button>
        </div>
      </div>
    </div>
  );
}
