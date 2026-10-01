'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Plus } from 'lucide-react';

import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatEventDate } from '@/lib/types';
import type { Meeting, Membership, Project } from '@/lib/types';

/** Formulario inline para agendar (mismo patrón que ApplyForm de la idea). */
function ScheduleMeetingForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [minStart] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: schedule, isPending } = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/meetings/projects/${projectId}`, {
          title,
          startsAt: new Date(startsAt).toISOString(),
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', projectId] });
      onDone();
    },
    onError: (e: unknown) => {
      // El ZodValidationPipe manda el mensaje útil en errors[], no en message
      const err = e as {
        response?: { data?: { message?: string; errors?: { message?: string }[] } };
      };
      setErrorMsg(
        err.response?.data?.errors?.[0]?.message ??
          err.response?.data?.message ??
          'No se pudo agendar la reunión',
      );
    },
  });

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setErrorMsg(null);
            schedule();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-title">Título</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Sync semanal"
              required
              minLength={3}
              maxLength={100}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-starts">Fecha y hora</Label>
            <Input
              id="meeting-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              min={minStart}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-location">Lugar (opcional)</Label>
            <Input
              id="meeting-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Cubículo 3, CIA — o link de meet"
              maxLength={150}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-notes">Notas (opcional)</Label>
            <Textarea
              id="meeting-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agenda, pendientes, qué llevar..."
              maxLength={1000}
              rows={3}
            />
          </div>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending || !startsAt}>
              Agendar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Card de una reunión; la próxima va destacada. */
function MeetingCard({
  meeting,
  highlighted,
  canCancel,
  onCancel,
}: {
  meeting: Meeting;
  highlighted: boolean;
  canCancel: boolean;
  onCancel: () => void;
}) {
  return (
    <Card className={highlighted ? 'border-primary' : undefined}>
      <CardContent className="pt-4 pb-4 flex flex-col gap-2">
        {highlighted && <p className="text-xs font-medium text-primary">Próxima reunión</p>}
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{meeting.title}</p>
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('¿Cancelar esta reunión?')) onCancel();
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            {formatEventDate(meeting.startsAt)}
          </span>
          {meeting.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {meeting.location}
            </span>
          )}
        </div>
        {meeting.notes && <p className="text-sm text-muted-foreground">{meeting.notes}</p>}
        <p className="text-xs text-muted-foreground">
          Agendada por {meeting.createdBy?.name ?? '—'}
        </p>
      </CardContent>
    </Card>
  );
}

/** Mapa del campus y accesos a los sistemas reales de reserva de la PUCP. */
function CampusMapCard() {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        <p className="font-medium">¿Dónde reunirse?</p>
        <iframe
          src="https://www.google.com/maps?q=Pontificia+Universidad+Cat%C3%B3lica+del+Per%C3%BA&output=embed"
          className="w-full aspect-video rounded-lg border border-border"
          loading="lazy"
          title="Mapa del campus PUCP"
        />
        <p className="text-sm text-muted-foreground">
          Los cubículos de estudio se reservan en Intendencia (CIA y Ciencias Sociales); los
          ambientes de las bibliotecas, desde Campus Virtual o la app PUCP Móvil.
        </p>
        <div className="flex flex-col gap-1.5 text-sm">
          {[
            { href: 'https://www.pucp.edu.pe/mapa-campus/', label: 'Mapa oficial del campus' },
            {
              href: 'https://campusvirtual.pucp.edu.pe/',
              label: 'Campus Virtual PUCP (reserva de ambientes)',
            },
            {
              href: 'https://intendencia-aulas.pucp.edu.pe/reserva-de-cub%C3%ADculos',
              label: 'Reserva de cubículos (CIA y CC.SS.)',
            },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground underline"
            >
              <ExternalLink className="w-4 h-4" />
              {l.label}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectMeetingsPage() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showForm, setShowForm] = useState(false);

  // Mismas queries (y keys) que la página de la idea, para compartir caché
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/ideas/${projectId}`);
      return data;
    },
    enabled: isAuthenticated && !!projectId,
  });

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery<Membership[]>({
    queryKey: ['my-memberships'],
    queryFn: async () => {
      const { data } = await api.get('/team/mine');
      return data;
    },
    enabled: isAuthenticated,
  });

  const isFounder = !!project && project.founderId === currentUserId;
  const myMembership = memberships.find((m) => m.projectId === projectId);
  const hasAccess = isFounder || myMembership?.status === 'ACTIVE';

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ['meetings', projectId, tab],
    queryFn: async () => {
      const { data } = await api.get(`/meetings/projects/${projectId}?when=${tab}`);
      return data;
    },
    enabled: isAuthenticated && !!projectId && hasAccess,
  });

  const { mutate: cancelMeeting } = useMutation({
    mutationFn: async (meetingId: string) => api.delete(`/meetings/${meetingId}`),
    // onSettled y no onSuccess: si el DELETE falla (p.ej. otra pestaña ya la
    // canceló), la lista igual se resincroniza y la card obsoleta desaparece.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['meetings', projectId] }),
    onError: () => alert('No se pudo cancelar. Puede que la reunión ya no exista.'),
  });

  if (!hasHydrated || !isAuthenticated || projectLoading || membershipsLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  if (!project || !hasAccess) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 pb-6 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Solo el equipo de la idea puede ver las reuniones.
              </p>
              <Button variant="outline" size="sm" onClick={() => router.back()}>
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reuniones</h1>
            <p className="text-sm text-muted-foreground">{project.title}</p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus />
              Agendar reunión
            </Button>
          )}
        </div>

        {showForm && (
          <ScheduleMeetingForm projectId={projectId} onDone={() => setShowForm(false)} />
        )}

        <div className="flex gap-2 border-b pb-2">
          {(
            [
              { key: 'upcoming', label: 'Próximas' },
              { key: 'past', label: 'Pasadas' },
            ] as const
          ).map((t) => (
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

        {meetingsLoading && <p className="text-muted-foreground text-sm">Cargando reuniones...</p>}

        {!meetingsLoading && meetings.length === 0 && (
          <p className="text-muted-foreground text-sm py-4 text-center">
            {tab === 'upcoming'
              ? 'No hay reuniones próximas. Agenda la primera.'
              : 'No hay reuniones pasadas.'}
          </p>
        )}

        {meetings.map((m, i) => (
          <MeetingCard
            key={m.id}
            meeting={m}
            highlighted={tab === 'upcoming' && i === 0}
            canCancel={m.createdById === currentUserId || isFounder}
            onCancel={() => cancelMeeting(m.id)}
          />
        ))}

        <CampusMapCard />
      </div>
    </main>
  );
}
