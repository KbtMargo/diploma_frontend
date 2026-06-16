'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users.service';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const { isAuthenticated, updateUser } = useAuthStore();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    usersService.getProfile().then((user) => updateUser(user)).catch(() => {});
  }, [isHydrated, isAuthenticated]);

  if (!isHydrated) return null;

  return <>{children}</>;
}