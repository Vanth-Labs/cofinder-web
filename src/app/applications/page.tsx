'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Membership, MembershipStatus } from '@/lib/types';

const STATUS_LABELS: Record<MembershipStatus, string> = {
  PENDING: 'Pendiente',
  INVITED: 'Invitación',
  ACTIVE: 'Activo',
  REJECTED: 'Rechazada',
  LEFT: 'Saliste',
};

function MembershipRow({ m }: { m: Membership }) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const { mutate: respond, isPending } = useMutation({
    mutationFn: (accept: boolean) => api.patch(`/team/${m.id}/respond`, { accept }),
    onSuccess: invalidate,
  });

  const { mutate: cancel, isPending: cancelPending } = useMutation({
    mutationFn: () => api.delete(`/team/${m.id}`),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/ideas/${m.projectId}`} className="font-medium text-sm hover:underline">
              {m.project?.title ?? 'Idea'}
            </Link>
            <p className="text-xs text-muted-foreground">
              {m.role}
              {m.project?.founder?.name ? ` · Founder: ${m.project.founder.name}` : ''}
            </p>
          </div>
          <Badge
            variant={
              m.status === 'ACTIVE' ? 'default' : m.status === 'REJECTED' ? 'destructive' : 'secondary'
            }
          >
            {STATUS_LABELS[m.status]}
          </Badge>
        </div>

        {m.message && (
          <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">“{m.message}”</p>
        )}

        {m.status === 'INVITED' && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={isPending} onClick={() => respond(true)}>
              Aceptar invitación
            </Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={isPending} onClick={() => respond(false)}>
              Declinar
            </Button>
          </div>
        )}
        {m.status === 'PENDING' && (
          <Button size="sm" variant="outline" disabled={cancelPending} onClick={() => cancel()}>
            Cancelar postulación
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ApplicationsContent() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'applications' | 'invites' | 'teams'>(
    searchParams.get('tab') === 'invites' ? 'invites' : 'applications',
  );

  const { data: memberships = [], isLoading } = useQuery<Membership[]>({
    queryKey: ['my-memberships'],
    queryFn: async () => {
      const { data } = await api.get('/team/mine');
      return data;
    },
    enabled: isAuthenticated,
  });

  if (!hasHydrated || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  const applications = memberships.filter(
    (m) => m.initiatedBy === 'USER' && m.status !== 'ACTIVE' && m.status !== 'INVITED',
  );
  const invites = memberships.filter((m) => m.status === 'INVITED');
  const teams = memberships.filter((m) => m.status === 'ACTIVE');

  const tabs = [
    { key: 'applications' as const, label: `Mis postulaciones (${applications.length})` },
    { key: 'invites' as const, label: `Invitaciones (${invites.length})` },
    { key: 'teams' as const, label: `Mis equipos (${teams.length})` },
  ];
  const list = tab === 'applications' ? applications : tab === 'invites' ? invites : teams;

  return (
    <main className="min-h-screen bg-background">
      
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Solicitudes</h1>

        <div className="flex gap-2 border-b pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm px-2 py-1 rounded-md ${
                tab === t.key ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Cargando...</p>}

        {!isLoading && list.length === 0 && (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm">
              {tab === 'applications' && 'No has postulado a ninguna idea todavía.'}
              {tab === 'invites' && 'No tienes invitaciones pendientes.'}
              {tab === 'teams' && 'Aún no formas parte de ningún equipo.'}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/ideas">Explorar ideas</Link>
            </Button>
          </div>
        )}

        {list.map((m) => (
          <MembershipRow key={m.id} m={m} />
        ))}
      </div>
    </main>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense>
      <ApplicationsContent />
    </Suspense>
  );
}
