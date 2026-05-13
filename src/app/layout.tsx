import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthProvider from '@/components/common/AuthProvider';
import { I18nProvider } from '@/contexts/I18nContext';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'StartWay — Пошук роботи та стажувань',
  description: 'Платформа пошуку роботи та стажувань для молоді в Україні та за кордоном',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={cn("font-sans", geist.variable)}>
    <body className={inter.className}>
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster position="top-right" />
        </I18nProvider>
      </body>
    </html>
  );
}