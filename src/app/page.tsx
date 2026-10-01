'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LoginButton } from '@/components/auth/login-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CofinderMark } from '@/components/brand/cofinder-mark';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EventType, EVENT_TYPE_LABELS, formatEventDate, ProjectStage, STAGE_LABELS } from '@/lib/types';

interface Showcase {
  stats: { totalProjects: number; totalUsers: number; activeMemberships: number };
  projects: {
    id: string;
    title: string;
    description: string;
    stage: ProjectStage;
    categories: string[];
    openings: { title: string }[];
    founder: { name: string | null; career: string | null };
    teamSize: number;
  }[];
  events: {
    id: string;
    title: string;
    type: EventType;
    startsAt: string;
    location: string | null;
  }[];
}

export default function HomePage() {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Vitrina pública: no requiere sesión
  const { data: showcase } = useQuery<Showcase>({
    queryKey: ['showcase'],
    queryFn: async () => (await api.get('/showcase')).data,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace('/projects');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-background px-4 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <CofinderMark className="h-16 w-auto text-foreground" />
            <h1 className="flex flex-col gap-1 text-3xl font-semibold tracking-tight">
              CoFinder
              <span className="text-xs font-normal tracking-normal text-muted-foreground">
                by VanthLabs
              </span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md">
              Publica tu idea, encuentra equipo y únete a proyectos de la comunidad PUCP
            </p>
          </div>
          <LoginButton />
          <p className="text-xs text-muted-foreground">
            Solo disponible para cuentas @pucp.edu.pe y @alumni.pucp.edu.pe
          </p>
        </div>

        {showcase && (
          <>
            <div className="flex gap-8 text-center">
              {[
                { value: showcase.stats.totalProjects, label: 'proyectos' },
                { value: showcase.stats.totalUsers, label: 'miembros' },
                { value: showcase.stats.activeMemberships, label: 'uniones a equipos' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {showcase.projects.length > 0 && (
              <div className="w-full flex flex-col gap-3">
                <p className="text-sm font-medium text-center text-muted-foreground">
                  Proyectos buscando equipo ahora mismo
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {showcase.projects.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{p.title}</p>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {STAGE_LABELS[p.stage]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {p.description}
                        </p>
                        {p.openings.length > 0 && (
                          <p className="text-xs">
                            <span className="text-muted-foreground">Buscan:</span>{' '}
                            {p.openings.map((o) => o.title).join(', ')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {p.founder.name ?? 'Estudiante PUCP'}
                          {p.founder.career ? ` · ${p.founder.career}` : ''} · equipo de {p.teamSize}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Inicia sesión para postular, chatear con los founders y publicar tu propia idea.
                </p>
              </div>
            )}

            {showcase.events.length > 0 && (
              <div className="w-full flex flex-col gap-3">
                <p className="text-sm font-medium text-center text-muted-foreground">
                  Próximos eventos
                </p>
                <div className="flex flex-col gap-2">
                  {showcase.events.map((e) => (
                    <Card key={e.id}>
                      <CardContent className="pt-3 pb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatEventDate(e.startsAt)}
                            {e.location ? ` · ${e.location}` : ''}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {EVENT_TYPE_LABELS[e.type]}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
