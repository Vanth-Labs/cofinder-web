'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, ExternalLink, MapPin } from 'lucide-react';

import { ReportButton } from '@/components/report/report-button';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AppEvent, EVENT_TYPE_LABELS, formatEventDate, Membership } from '@/lib/types';

function initials(name: string | null | undefined) {
  return name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
}

/** Selector de idea propia + botón de inscripción. */
function RegisterBox({ event }: { event: AppEvent }) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(null);

  const { data: myProjects = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ['my-projects'],
    queryFn: async () => (await api.get('/ideas/mine')).data,
  });

  const { data: memberships = [] } = useQuery<Membership[]>({
    queryKey: ['my-memberships'],
    queryFn: async () => (await api.get('/team/mine')).data,
  });

  // Ideas con los que puedo participar: los míos + donde soy miembro activo
  const teamOptions = [
    ...myProjects,
    ...memberships
      .filter((m) => m.status === 'ACTIVE' && m.project)
      .map((m) => ({ id: m.project!.id, title: m.project!.title })),
  ].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

  const { mutate: register, isPending } = useMutation({
    mutationFn: () =>
      api.post(`/events/${event.id}/register`, projectId ? { projectId } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        {teamOptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>¿Participas con un equipo?</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={projectId === null ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setProjectId(null)}
              >
                Solo yo
              </Badge>
              {teamOptions.map((p) => (
                <Badge
                  key={p.id}
                  variant={projectId === p.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setProjectId(p.id)}
                >
                  {p.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <Button onClick={() => register()} disabled={isPending}>
          {isPending ? 'Inscribiendo...' : 'Inscribirme'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery<AppEvent>({
    queryKey: ['event', eventId],
    queryFn: async () => (await api.get(`/events/${eventId}`)).data,
    enabled: isAuthenticated && !!eventId,
  });

  const { mutate: unregister } = useMutation({
    mutationFn: () => api.delete(`/events/${eventId}/register`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const { mutate: removeEvent } = useMutation({
    mutationFn: () => api.delete(`/events/${eventId}`),
    onSuccess: () => router.push('/events'),
  });

  if (!hasHydrated || !isAuthenticated || isLoading || !event) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  const isOrganizer = event.organizerId === currentUserId;
  const canModerate = isOrganizer || !!isAdmin;
  const isPast = new Date(event.endsAt ?? event.startsAt) < new Date();

  return (
    <main className="min-h-screen bg-background">
      
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground text-sm text-left"
        >
          ← Volver
        </button>

        <Card>
          <CardContent className="pt-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-semibold">{event.title}</h1>
              <Badge variant="secondary" className="shrink-0">
                {EVENT_TYPE_LABELS[event.type]}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {formatEventDate(event.startsAt, event.endsAt)}
                {isPast && <Badge variant="outline">Finalizado</Badge>}
              </span>
              {event.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </span>
              )}
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Más información
                </a>
              )}
            </div>

            <p className="text-sm leading-relaxed whitespace-pre-line">{event.description}</p>

            <Link
              href={`/users/${event.organizer.id}`}
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <Avatar className="w-7 h-7">
                <AvatarImage src={event.organizer.avatar ?? undefined} />
                <AvatarFallback className="text-xs">{initials(event.organizer.name)}</AvatarFallback>
              </Avatar>
              <span>
                Organiza <span className="font-medium">{event.organizer.name ?? '—'}</span>
                {event.organizer.role === 'ALUMNI' ? ' (Alumni)' : ''}
              </span>
            </Link>

            {event.registeredByMe && !isPast && (
              <div className="flex items-center justify-between">
                <Badge><Check />Estás inscrito</Badge>
                <Button variant="outline" size="sm" onClick={() => unregister()}>
                  Cancelar inscripción
                </Button>
              </div>
            )}

            <div className="flex justify-end items-center gap-3">
              {!isOrganizer && <ReportButton targetType="EVENT" targetId={event.id} />}
              {canModerate && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('¿Eliminar este evento y sus inscripciones?')) removeEvent();
                  }}
                >
                  Eliminar evento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {!event.registeredByMe && !isPast && <RegisterBox event={event} />}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Inscritos ({event.registrations?.length ?? 0})
          </p>
          {(event.registrations ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nadie se ha inscrito todavía.</p>
          )}
          {(event.registrations ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={r.user.avatar ?? undefined} />
                  <AvatarFallback className="text-xs">{initials(r.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Link href={`/users/${r.userId}`} className="text-sm font-medium hover:underline">
                    {r.user.name ?? 'Usuario'}
                  </Link>
                  <p className="text-xs text-muted-foreground">{r.user.career ?? ''}</p>
                </div>
                {r.project && (
                  <Link href={`/ideas/${r.project.id}`}>
                    <Badge variant="secondary">{r.project.title}</Badge>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
