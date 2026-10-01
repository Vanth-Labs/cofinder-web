'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MessageCircle, Users } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api';
import { Match, Membership } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Team = { id: string; title: string };

function ChatsContent() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const params = useSearchParams();
  const tab = params.get('tab') === 'teams' ? 'teams' : 'individual';
  const [search, setSearch] = useState('');
  const mine = useQuery<Match[]>({ queryKey: ['matches'], queryFn: async () => (await api.get('/matches')).data, enabled: isAuthenticated });
  const incoming = useQuery<Match[]>({ queryKey: ['matches-incoming'], queryFn: async () => (await api.get('/matches/incoming')).data, enabled: isAuthenticated });
  const owned = useQuery<Team[]>({ queryKey: ['my-projects'], queryFn: async () => (await api.get('/ideas/mine')).data, enabled: isAuthenticated });
  const memberships = useQuery<Membership[]>({ queryKey: ['my-memberships'], queryFn: async () => (await api.get('/team/mine')).data, enabled: isAuthenticated });

  if (!hasHydrated || !isAuthenticated) return <p className="p-8 text-sm text-muted-foreground">Cargando chats...</p>;

  const individuals = [...new Map([
    ...(mine.data ?? []).map(match => ({ match, other: match.project.founder })),
    ...(incoming.data ?? []).map(match => ({ match, other: match.user })),
  ].map(row => [row.match.id, row])).values()].sort((a, b) =>
    new Date(b.match.chat?.messages?.[0]?.createdAt ?? b.match.createdAt).getTime() - new Date(a.match.chat?.messages?.[0]?.createdAt ?? a.match.createdAt).getTime());
  const teams = [...new Map([
    ...(owned.data ?? []).map(project => ({ ...project, role: 'Fundador' })),
    ...(memberships.data ?? []).filter(m => m.status === 'ACTIVE' && m.project).map(m => ({ id: m.project!.id, title: m.project!.title, role: m.role })),
  ].map(team => [team.id, team])).values()].sort((a, b) => a.title.localeCompare(b.title));
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const term = normalize(search.trim());
  const filteredPeople = individuals.filter(({ match, other }) => normalize(`${other?.name ?? ''} ${match.project.title}`).includes(term));
  const filteredTeams = teams.filter(team => normalize(team.title).includes(term));
  const queries = tab === 'teams' ? [owned, memberships] : [mine, incoming];
  const loading = queries.some(q => q.isLoading);
  const failed = queries.some(q => q.isError);
  const empty = tab === 'teams' ? filteredTeams.length === 0 : filteredPeople.length === 0;
  const unread = individuals.reduce((sum, { match }) => sum + (match.chat?._count?.messages ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold">Chats</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tus conversaciones individuales y los equipos de tus ideas, en un solo lugar.</p>
      </div>
      <nav aria-label="Tipo de chat" className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        {([{ key: 'individual', label: 'Individuales', icon: MessageCircle }, { key: 'teams', label: 'Equipos', icon: Users }] as const).map(({ key, label, icon: Icon }) => (
          <Link key={key} href={`/chat?tab=${key}`} aria-current={tab === key ? 'page' : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium ${tab === key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon size={18} />{label}{key === 'individual' && unread > 0 && <Badge aria-label={`${unread} mensajes sin leer`}>{unread}</Badge>}
          </Link>
        ))}
      </nav>
      <Link href="/workspace" className="text-sm underline">Ir a los espacios de trabajo de mis ideas</Link>
      <Input aria-label="Buscar chats por persona o idea" placeholder="Buscar por persona o idea..." value={search} onChange={event => setSearch(event.target.value)} />
      <p className="text-sm text-muted-foreground">{tab === 'teams' ? 'Chats grupales de las ideas que fundaste o a los que perteneces.' : 'Conversaciones con fundadores y personas interesadas en tus ideas.'}</p>
      {loading && <p role="status" className="text-sm text-muted-foreground">Cargando conversaciones...</p>}
      {failed && <div role="alert" className="rounded-lg border p-4 text-sm">No pudimos cargar todas tus conversaciones. <Button variant="link" onClick={() => queries.forEach(q => { void q.refetch(); })}>Reintentar</Button></div>}
      {!loading && !failed && empty && <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
        <MessageCircle className="text-muted-foreground" size={28} />
        <p>{term ? 'No encontramos chats con esa búsqueda.' : tab === 'teams' ? 'Todavía no perteneces a ningún equipo.' : 'Todavía no tienes conversaciones individuales.'}</p>
        <p className="text-sm text-muted-foreground">{term ? 'Prueba con otro nombre o idea.' : tab === 'teams' ? 'Al crear una idea o unirte a un equipo, su chat aparecerá aquí.' : 'Abre una idea y pulsa “Me interesa · chatear” para conversar con su fundador.'}</p>
        {term ? <Button variant="outline" onClick={() => setSearch('')}>Limpiar búsqueda</Button> : <Button asChild variant="outline"><Link href="/ideas">Explorar ideas</Link></Button>}
      </div>}
      <div className="flex flex-col gap-2">
        {tab === 'individual' ? filteredPeople.map(({ match, other }) => {
          const last = match.chat?.messages?.[0];
          const count = match.chat?._count?.messages ?? 0;
          return <Link key={match.id} href={`/chat/${match.id}`} className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-accent/50">
            <Avatar className="size-11 shrink-0"><AvatarImage src={other?.avatar ?? undefined} /><AvatarFallback>{other?.name?.slice(0, 2).toUpperCase() ?? '?'}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{other?.name ?? 'Usuario'}</p><p className="truncate text-xs text-muted-foreground">{match.project.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">{last ? `${last.sender.name ?? 'Usuario'}: ${last.content}` : 'Sin mensajes · Inicia la conversación'}</p></div>
            {count > 0 && <Badge aria-label={`${count} mensajes sin leer`}>{count}</Badge>}<ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </Link>;
        }) : filteredTeams.map(team => <Link key={team.id} href={`/chat/team/${team.id}`} className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-accent/50">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users size={22} /></span>
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{team.title}</p><p className="truncate text-xs text-muted-foreground">Chat del equipo · {team.role}</p><p className="mt-1 text-sm text-muted-foreground">Conversar con el equipo</p></div><ChevronRight size={18} className="shrink-0 text-muted-foreground" />
        </Link>)}
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return <Suspense fallback={<p className="p-8">Cargando chats...</p>}><ChatsContent /></Suspense>;
}
