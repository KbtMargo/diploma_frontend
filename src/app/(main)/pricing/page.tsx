'use client';

import { useEffect, useState } from 'react';
import { Check, X, ChevronDown, Building2, Crown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import toast from 'react-hot-toast';

const FREE_FEATURES = [
  { text: 'До 3 активних вакансій', included: true },
  { text: 'Базовий профіль компанії', included: true },
  { text: 'Перегляд заявок кандидатів', included: true },
  { text: 'Чат із кандидатами', included: true },
  { text: 'Необмежена кількість вакансій', included: false },
  { text: 'Featured-вакансії (підсвічування у пошуку)', included: false },
  { text: 'Пошук кандидатів за фільтрами', included: false },
  { text: 'Аналітика переглядів та заявок', included: false },
  { text: 'Пріоритетна підтримка', included: false },
];

const PREMIUM_FEATURES = [
  { text: 'Необмежена кількість вакансій', included: true },
  { text: 'Повний профіль компанії', included: true },
  { text: 'Перегляд заявок кандидатів', included: true },
  { text: 'Чат із кандидатами', included: true },
  { text: 'Featured-вакансії (підсвічування у пошуку)', included: true },
  { text: 'Пошук кандидатів за фільтрами', included: true },
  { text: 'Аналітика переглядів та заявок', included: true },
  { text: 'Пріоритетна підтримка', included: true },
];

const FAQ_ITEMS = [
  {
    q: 'Чи можна скасувати підписку?',
    a: 'Так, у будь-який момент в особистому кабінеті. Підписка залишається активною до кінця оплаченого місяця.',
  },
  {
    q: 'Як відбувається оплата?',
    a: 'Оплата здійснюється банківською карткою Visa або Mastercard. Підписка поновлюється автоматично щомісяця.',
  },
  {
    q: 'Чи є пробний період?',
    a: 'Так — перші 7 днів Premium безкоштовно. Картка не списується до закінчення пробного періоду.',
  },
  {
    q: 'Чи шукачі роботи платять за щось?',
    a: 'Ні. Платформа для шукачів роботи повністю безкоштовна — без обмежень та прихованих платежів.',
  },
  {
    q: 'Чи можу я перейти з Free на Premium у будь-який момент?',
    a: 'Так. Перехід відбувається миттєво після оплати, і ви одразу отримуєте доступ до всіх Premium-можливостей.',
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
            <p className="text-sm text-gray-500 pb-4 leading-relaxed">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'job_seeker') {
      toast('Для шукачів роботи платформа повністю безкоштовна 🎉', { icon: '✅', duration: 4000 });
      router.replace(ROUTES.JOBS);
    }
  }, [isAuthenticated, user, router]);

  // Render nothing while redirecting a job seeker
  if (isAuthenticated && user?.role === 'job_seeker') return null;

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    toast.success('Оплата буде доступна незабаром. Дякуємо за інтерес!', { duration: 4000 });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <span className="inline-block bg-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Підписка для роботодавців
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Знаходьте найкращих кандидатів разом із StartWay
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Розпочніть безкоштовно та переходьте на Premium, коли будете готові масштабувати найм.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Free */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all p-8 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Building2 size={22} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Стартер</h3>
            <p className="text-sm text-gray-500 mb-6">Для малого бізнесу та перших спроб</p>

            <div className="mb-8">
              <span className="text-4xl font-bold text-gray-900">Безкоштовно</span>
            </div>

            <ul className="flex-1 space-y-3 mb-8">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${f.included ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {f.included
                      ? <Check size={12} className="text-green-600" strokeWidth={2.5} />
                      : <X size={12} className="text-gray-400" strokeWidth={2.5} />
                    }
                  </div>
                  <span className={`text-sm ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>{f.text}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-semibold cursor-default text-sm"
            >
              Поточний план
            </button>
          </div>

          {/* Premium */}
          <div className="relative bg-white rounded-2xl border-2 border-indigo-500 shadow-xl shadow-indigo-100 scale-[1.02] p-8 flex flex-col">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
              Рекомендований
            </div>

            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4">
              <Crown size={22} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Premium</h3>
            <p className="text-sm text-gray-500 mb-6">Для компаній, що активно наймають</p>

            <div className="mb-8">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900">600</span>
                <span className="text-xl font-semibold text-gray-400 mb-1"> ₴</span>
                <span className="text-gray-400 mb-1">/міс</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">7 днів безкоштовно — потім 600 ₴/міс</p>
            </div>

            <ul className="flex-1 space-y-3 mb-8">
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-green-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm text-gray-700">{f.text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleSubscribe}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg text-sm"
            >
              Спробувати 7 днів безкоштовно
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Оплата карткою Visa / Mastercard · Скасування у будь-який момент
        </p>

        {/* FAQ */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Часті запитання</h2>
          <p className="text-sm text-gray-400 mb-6">Якщо не знайшли відповіді — напишіть нам на support@startway.ua</p>
          <FaqAccordion />
        </div>

        {/* CTA */}
        <div className="mt-8 bg-indigo-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Готові розпочати найм?</h2>
          <p className="text-indigo-200 mb-6">
            Приєднуйтесь до роботодавців, які вже знаходять молодих спеціалістів через StartWay
          </p>
          <button
            onClick={() => router.push(isAuthenticated ? ROUTES.EMPLOYER?.DASHBOARD ?? '/employer/dashboard' : ROUTES.REGISTER)}
            className="bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            {isAuthenticated ? 'До кабінету роботодавця' : 'Зареєструватись як роботодавець'}
          </button>
        </div>
      </div>
    </div>
  );
}
