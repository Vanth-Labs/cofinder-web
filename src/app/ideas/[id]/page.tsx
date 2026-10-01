'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ReportButton } from '@/components/report/report-button';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { formatBudget, Match, Membership, Project, STAGE_LABELS } from '@/lib/types';

function initials(name: string | null | undefined) {
  return name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
}

/** Formulario de postulación: convocatoria abierta o rol libre + mensaje. */
function ApplyForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const queryClient = useQueryClient();
  const openOpenings = project.openings.filter((o) => o.isOpen);
  const [openingId, setOpeningId] = useState<string | null>(openOpenings[0]?.id ?? null);
  const [customRole, setCustomRole] = useState('');
  const [message, setMessage] = useState('');

  const selected = openOpenings.find((o) => o.id === openingId);

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/team/projects/${project.id}/apply`, {
        ...(openingId ? { openingId } : { role: customRole.trim() }),
        message: message.trim() || undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      onDone();
    },
  });

  const canSubmit = openingId !== null || customRole.trim().length >= 2;

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-4">
        <p className="font-medium text-sm">Postular al equipo</p>
        <div className="flex flex-col gap-2">
          <Label>Convocatorias abiertas</Label>
          <div className="flex flex-wrap gap-2">
            {openOpenings.map((o) => (
              <Badge
                key={o.id}
                variant={openingId === o.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setOpeningId(openingId === o.id ? null : o.id)}
              >
                {o.title}
              </Badge>
            ))}
            {openOpenings.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay convocatorias abiertas, pero puedes proponer un rol.
              </p>
            )}
          </div>
          {selected?.description && (
            <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              {selected.description}
            </p>
          )}
        </div>
        {!openingId && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apply-role">Propón tu rol</Label>
            <Input
              id="apply-role"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              maxLength={50}
              placeholder="Ej. Growth Hacker"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apply-message">Mensaje para el founder (opcional)</Label>
          <Textarea
            id="apply-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Cuéntale por qué encajas en la idea..."
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">
            No se pudo enviar la postulación. ¿Quizás ya tienes una pendiente?
          </p>
        )}
        <Button onClick={() => mutate()} disabled={isPending || !canSubmit}>
          {isPending ? 'Enviando...' : 'Enviar postulación'}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Gestión de postulaciones/invitaciones pendientes (solo founder). */
function FounderRequests({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery<Membership[]>({
    queryKey: ['project-requests', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/team/projects/${projectId}/requests`);
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-requests', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  };

  const { mutate: respond, isPending } = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      api.patch(`/team/${id}/respond`, { accept }),
    onSuccess: invalidate,
  });

  const { mutate: cancelInvite } = useMutation({
    mutationFn: (id: string) => api.delete(`/team/${id}`),
    onSuccess: invalidate,
  });

  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Solicitudes pendientes</p>
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-4 pb-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={r.user?.avatar ?? undefined} />
                <AvatarFallback>{initials(r.user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Link href={`/users/${r.userId}`} className="font-medium text-sm hover:underline">
                  {r.user?.name ?? 'Usuario'}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {r.status === 'PENDING' ? 'Postuló como' : 'Invitado como'} {r.role}
                  {r.user?.career ? ` · ${r.user.career}` : ''}
                </p>
              </div>
            </div>
            {r.message && (
              <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                “{r.message}”
              </p>
            )}
            {r.status === 'PENDING' ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => respond({ id: r.id, accept: true })}
                >
                  Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => respond({ id: r.id, accept: false })}
                >
                  Rechazar
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => cancelInvite(r.id)}>
                Cancelar invitación
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [showApply, setShowApply] = useState(false);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/ideas/${projectId}`);
      return data;
    },
    enabled: isAuthenticated && !!projectId,
  });

  const { data: memberships = [] } = useQuery<Membership[]>({
    queryKey: ['my-memberships'],
    queryFn: async () => {
      const { data } = await api.get('/team/mine');
      return data;
    },
    enabled: isAuthenticated,
  });

  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      const { data } = await api.get('/matches');
      return data;
    },
    enabled: isAuthenticated,
  });

  const { mutate: showInterest, isPending: interestPending } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/swipe', { projectId, direction: 'RIGHT' });
      return data as { matched: boolean; matchId?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      if (data.matchId) router.push(`/chat/${data.matchId}`);
    },
  });

  const { mutate: leaveTeam } = useMutation({
    mutationFn: (membershipId: string) => api.delete(`/team/${membershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  if (!hasHydrated || !isAuthenticated || isLoading || !project) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  const isFounder = project.founderId === currentUserId;
  const myMembership = memberships.find((m) => m.projectId === projectId);
  const myMatch = matches.find((m) => m.projectId === projectId);
  // La portada ya se muestra arriba a lo ancho; no repetirla en la galería.
  const gallery = (project.media ?? []).filter((m) => m.key !== project.coverKey);

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
          {/* Acá sí la imagen completa (no la miniatura): es la vista grande. */}
          {mediaUrl(project.coverKey) && (
            <img
              src={mediaUrl(project.coverKey)!}
              alt={project.title}
              className="aspect-[16/9] w-full object-cover"
            />
          )}
          <CardContent className="pt-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-semibold">{project.title}</h1>
              <Badge variant="outline">{STAGE_LABELS[project.stage]}</Badge>
            </div>

            {project.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {project.categories.map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </div>
            )}

            {gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((m) => (
                  <a
                    key={m.id}
                    href={mediaUrl(m.key) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-85"
                  >
                    <img
                      src={thumbUrl(m.key) ?? ''}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}

            <p className="text-sm leading-relaxed whitespace-pre-line">{project.description}</p>

            {project.budget != null && (
              <p className="text-sm text-muted-foreground">
                Presupuesto: {formatBudget(project.budget, project.budgetCurrency)}
              </p>
            )}

            {project.openings.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Convocatorias
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.openings.map((o) => (
                    <Badge key={o.id} variant={o.isOpen ? 'outline' : 'secondary'}>
                      {o.title}
                      {!o.isOpen && ' · cerrada'}
                      {isFounder && (o._count?.applications ?? 0) > 0 && ` · ${o._count!.applications} pend.`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(isFounder || myMembership?.status === 'ACTIVE') && <Button asChild><Link href={`/ideas/${project.id}/workspace`}>Abrir espacio de trabajo · Proyectos y EDT</Link></Button>}

            {/* Acciones según relación con la idea */}
            {isFounder ? (
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button asChild size="sm">
                  <Link href={`/chat/team/${project.id}`}>Chat del equipo</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/ideas/${project.id}/meetings`}>Reuniones</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/ideas/mine">Editar en mis ideas</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/people">Invitar personas</Link>
                </Button>
              </div>
            ) : myMembership?.status === 'ACTIVE' ? (
              <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
                <Badge>Eres parte del equipo · {myMembership.role}</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/chat/team/${project.id}`}>Chat del equipo</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/ideas/${project.id}/meetings`}>Reuniones</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('¿Salir del equipo?')) leaveTeam(myMembership.id);
                    }}
                  >
                    Salir del equipo
                  </Button>
                </div>
              </div>
            ) : myMembership?.status === 'PENDING' ? (
              <div className="flex items-center justify-between pt-2">
                <Badge variant="secondary">Postulación enviada · {myMembership.role}</Badge>
                <Button variant="outline" size="sm" onClick={() => leaveTeam(myMembership.id)}>
                  Cancelar postulación
                </Button>
              </div>
            ) : myMembership?.status === 'INVITED' ? (
              <div className="flex items-center justify-between pt-2">
                <Badge variant="secondary">Te invitaron como {myMembership.role}</Badge>
                <Button asChild size="sm">
                  <Link href="/applications?tab=invites">Responder invitación</Link>
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                {myMatch ? (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/chat/${myMatch.id}`}>Chat con el fundador</Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={interestPending}
                    onClick={() => showInterest()}
                  >
                    Me interesa · chatear
                  </Button>
                )}
                <Button className="flex-1" onClick={() => setShowApply((s) => !s)}>
                  Postular al equipo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!isFounder && (
          <div className="flex justify-end -mt-3">
            <ReportButton targetType="PROJECT" targetId={project.id} />
          </div>
        )}

        {showApply && !isFounder && !myMembership && (
          <ApplyForm project={project} onDone={() => setShowApply(false)} />
        )}

        {/* Equipo */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Equipo</p>
          <Card>
            <CardContent className="pt-4 pb-4 flex flex-col gap-3">
              <Link href={`/users/${project.founder.id}`} className="flex items-center gap-3 hover:bg-accent/50 rounded-md -mx-1 px-1 py-1">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={project.founder.avatar ?? undefined} />
                  <AvatarFallback>{initials(project.founder.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{project.founder.name ?? 'Fundador'}</p>
                  <p className="text-xs text-muted-foreground">
                    Founder{project.founder.career ? ` · ${project.founder.career}` : ''}
                  </p>
                </div>
              </Link>
              {project.teamMembers.map((tm) => (
                <Link
                  key={tm.user?.id ?? tm.role}
                  href={tm.user ? `/users/${tm.user.id}` : '#'}
                  className="flex items-center gap-3 hover:bg-accent/50 rounded-md -mx-1 px-1 py-1"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={tm.user?.avatar ?? undefined} />
                    <AvatarFallback>{initials(tm.user?.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{tm.user?.name ?? 'Miembro'}</p>
                    <p className="text-xs text-muted-foreground">
                      {tm.role}
                      {tm.user?.career ? ` · ${tm.user.career}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {isFounder && <FounderRequests projectId={projectId} />}
      </div>
    </main>
  );
}
