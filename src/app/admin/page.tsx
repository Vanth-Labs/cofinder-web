'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { timeAgo } from '@/lib/types';

interface AdminStats {
  users: { total: number; lastWeek: number; lastMonth: number };
  projects: { total: number; lastWeek: number };
  teams: { activeMemberships: number };
  engagement: {
    matches: number;
    messages: number;
    messagesLastWeek: number;
    posts: number;
    postsLastWeek: number;
  };
  funnel: {
    swipes: number;
    swipesRight: number;
    matches: number;
    applications: number;
    invitations: number;
    acceptedFromApplication: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isAdmin: boolean;
  career: string | null;
  createdAt: string;
  _count: { projects: number; posts: number; sentMessages: number };
}

interface AdminProject {
  id: string;
  title: string;
  stage: string;
  createdAt: string;
  founder: { id: string; name: string | null; email: string };
  _count: { matches: number; teamMembers: number };
}

interface AdminPost {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
  _count: { likes: number; comments: number };
}

interface AdminReport {
  id: string;
  targetType: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter: { id: string; name: string | null; email: string };
  target: { label: string; href: string | null };
}

/** % respecto al paso anterior del funnel (— si el paso anterior es 0). */
function rate(current: number, previous: number) {
  if (!previous) return undefined;
  return `${Math.round((current / previous) * 100)}% del paso anterior`;
}

function Funnel({ funnel }: { funnel: AdminStats['funnel'] }) {
  const steps = [
    { label: 'Swipes', value: funnel.swipes, sub: undefined as string | undefined },
    { label: 'Interesados (RIGHT)', value: funnel.swipesRight, sub: rate(funnel.swipesRight, funnel.swipes) },
    { label: 'Postulaciones', value: funnel.applications, sub: rate(funnel.applications, funnel.swipesRight) },
    {
      label: 'Aceptadas',
      value: funnel.acceptedFromApplication,
      sub: rate(funnel.acceptedFromApplication, funnel.applications),
    },
  ];
  return (
    <div>
      <p className="text-sm font-medium mb-2">
        Funnel de conversión{' '}
        <span className="text-muted-foreground font-normal">
          · descubrir → interesarse → postular → entrar al equipo · {funnel.invitations} invitaciones
          directas
        </span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {steps.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub} />
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'reports' | 'projects' | 'posts' | 'users'>('reports');
  const [search, setSearch] = useState('');
  const [reportStatus, setReportStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED'>('OPEN');

  

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/admin/stats')).data,
    enabled: isAuthenticated && isAdmin,
  });

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', search],
    queryFn: async () =>
      (await api.get(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`)).data,
    enabled: isAuthenticated && isAdmin && tab === 'users',
  });

  const { data: projects = [] } = useQuery<AdminProject[]>({
    queryKey: ['admin-projects', search],
    queryFn: async () =>
      (await api.get(`/admin/projects${search ? `?search=${encodeURIComponent(search)}` : ''}`)).data,
    enabled: isAuthenticated && isAdmin && tab === 'projects',
  });

  const { data: posts = [] } = useQuery<AdminPost[]>({
    queryKey: ['admin-posts'],
    queryFn: async () => (await api.get('/admin/posts')).data,
    enabled: isAuthenticated && isAdmin && tab === 'posts',
  });

  const { data: reports = [] } = useQuery<AdminReport[]>({
    queryKey: ['admin-reports', reportStatus],
    queryFn: async () => (await api.get(`/reports?status=${reportStatus}`)).data,
    enabled: isAuthenticated && isAdmin && tab === 'reports',
  });

  const { mutate: resolveReport } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'RESOLVED' | 'DISMISSED' }) =>
      api.patch(`/reports/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const { mutate: removeProject } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const { mutate: removePost } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  if (!hasHydrated || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background">
        
        <p className="text-muted-foreground text-sm text-center py-16">
          Esta sección es solo para administradores.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Administración</h1>
          <p className="text-sm text-muted-foreground">Métricas y moderación de la comunidad.</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Usuarios" value={stats.users.total} sub={`+${stats.users.lastWeek} esta semana`} />
            <StatTile label="Ideas" value={stats.projects.total} sub={`+${stats.projects.lastWeek} esta semana`} />
            <StatTile label="Miembros activos en equipos" value={stats.teams.activeMemberships} />
            <StatTile label="Matches" value={stats.engagement.matches} />
            <StatTile label="Mensajes" value={stats.engagement.messages} sub={`+${stats.engagement.messagesLastWeek} esta semana`} />
            <StatTile label="Publicaciones" value={stats.engagement.posts} sub={`+${stats.engagement.postsLastWeek} esta semana`} />
          </div>
        )}

        {stats?.funnel && <Funnel funnel={stats.funnel} />}

        <div className="flex flex-wrap items-center gap-2 border-b pb-2">
          {([
            { key: 'reports', label: 'Reportes' },
            { key: 'projects', label: 'Ideas' },
            { key: 'posts', label: 'Publicaciones' },
            { key: 'users', label: 'Usuarios' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSearch('');
              }}
              className={`text-sm px-2 py-1 rounded-md ${
                tab === t.key ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
          {tab === 'reports' && (
            <div className="ml-auto flex gap-1.5">
              {(['OPEN', 'RESOLVED', 'DISMISSED'] as const).map((s) => (
                <Badge
                  key={s}
                  variant={reportStatus === s ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setReportStatus(s)}
                >
                  {s === 'OPEN' ? 'Abiertos' : s === 'RESOLVED' ? 'Resueltos' : 'Descartados'}
                </Badge>
              ))}
            </div>
          )}
          {(tab === 'projects' || tab === 'users') && (
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="ml-auto h-8 w-48"
            />
          )}
        </div>

        {tab === 'reports' && reports.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No hay reportes {reportStatus === 'OPEN' ? 'abiertos' : 'en este estado'}.
          </p>
        )}

        {tab === 'reports' &&
          reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {r.target.href ? (
                      <Link href={r.target.href} className="text-sm font-medium hover:underline">
                        {r.target.label}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{r.target.label}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {r.targetType} · reportado por {r.reporter.name ?? r.reporter.email} ·{' '}
                      {timeAgo(r.createdAt)}
                    </p>
                  </div>
                  <Badge variant={r.status === 'OPEN' ? 'destructive' : 'outline'}>{r.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                  “{r.reason}”
                </p>
                {r.status === 'OPEN' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => resolveReport({ id: r.id, status: 'RESOLVED' })}
                    >
                      Marcar resuelto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => resolveReport({ id: r.id, status: 'DISMISSED' })}
                    >
                      Descartar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

        {tab === 'projects' &&
          projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/ideas/${p.id}`} className="font-medium text-sm hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {p.founder.name ?? p.founder.email} · {p._count.matches} matches ·{' '}
                    {p._count.teamMembers} membresías · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <Badge variant="outline">{p.stage}</Badge>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${p.title}" y todos sus datos asociados?`)) removeProject(p.id);
                  }}
                >
                  Eliminar
                </Button>
              </CardContent>
            </Card>
          ))}

        {tab === 'posts' &&
          posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{p.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.author.name ?? p.author.email} · {p._count.likes} me gusta ·{' '}
                    {p._count.comments} comentarios ·{' '}
                    {timeAgo(p.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm('¿Eliminar esta publicación?')) removePost(p.id);
                  }}
                >
                  Eliminar
                </Button>
              </CardContent>
            </Card>
          ))}

        {tab === 'users' &&
          users.map((u) => (
            <Card key={u.id}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/users/${u.id}`} className="font-medium text-sm hover:underline">
                    {u.name ?? 'Sin nombre'}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {u.email} · {u.career ?? '—'} · {u._count.projects} ideas ·{' '}
                    {u._count.posts} posts · {u._count.sentMessages} mensajes
                  </p>
                </div>
                <Badge variant={u.isAdmin ? 'default' : 'outline'}>{u.isAdmin ? 'ADMIN' : u.role}</Badge>
              </CardContent>
            </Card>
          ))}
      </div>
    </main>
  );
}
