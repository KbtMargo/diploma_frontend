import Header from '@/components/layout/Header';
import { SocketProvider } from '@/contexts/SocketContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>{children}</main>
      </div>
    </SocketProvider>
  );
}
