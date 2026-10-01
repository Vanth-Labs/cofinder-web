'use client';

import { Nav } from '@/components/layout/nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileHeader } from '@/components/layout/mobile-header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {/* Rail desktop */}
      <Nav />

      {/* Header móvil */}
      <MobileHeader />

      {/* Área de contenido */}
      <main className="min-h-screen md:ml-20 lg:ml-60 pt-14 md:pt-0 pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom nav móvil */}
      <BottomNav />
    </>
  );
}
