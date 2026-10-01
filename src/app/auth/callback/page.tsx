'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/');
      return;
    }

    useAuthStore.setState({ token });

    api.get('/users/me').then(({ data }) => {
      setAuth(data, token);
      if (!data.name) {
        router.replace('/auth/onboarding');
      } else {
        router.replace('/ideas');
      }
    }).catch(() => {
      router.replace('/');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Iniciando sesión...</p>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
