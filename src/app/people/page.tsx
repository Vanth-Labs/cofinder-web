'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CAREERS } from '@/lib/careers';
import { DirectoryUser } from '@/lib/types';

function PersonCard({ user }: { user: DirectoryUser }) {
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <Link href={`/users/${user.id}`} className="block h-full">
      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-5 pb-5 flex flex-col gap-3 h-full">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{user.name ?? 'Sin nombre'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.career ?? user.faculty ?? user.role}
              </p>
            </div>
          </div>

          {user.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
              {user.bio}
            </p>
          )}

          {user.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {user.skills.slice(0, 4).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
              {user.skills.length > 4 && (
                <Badge variant="outline" className="text-xs">+{user.skills.length - 4}</Badge>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-auto pt-1 border-t">
            {user._count.projects} idea{user._count.projects !== 1 ? 's' : ''} ·{' '}
            {user._count.teamMembers} equipo{user._count.teamMembers !== 1 ? 's' : ''}
            {user.role === 'ALUMNI' ? ' · Alumni' : ''}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PeoplePage() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [career, setCareer] = useState('');
  const [skill, setSkill] = useState('');

  const { data: users = [], isLoading } = useQuery<DirectoryUser[]>({
    queryKey: ['people', debounced, career, skill],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debounced) params.set('search', debounced);
      if (career) params.set('career', career);
      if (skill) params.set('skill', skill);
      const { data } = await api.get(`/users?${params.toString()}`);
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

  return (
    <main className="min-h-screen bg-background">
      
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold">Personas</h1>
          <p className="text-sm text-muted-foreground">
            Encuentra colaboradores por habilidades, carrera o intereses.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDebounced(search.trim());
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, bio o carrera..."
            className="flex-1"
          />
          <Input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Skill exacta (ej. Figma)"
            className="sm:w-44"
          />
          <select
            value={career}
            onChange={(e) => setCareer(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm sm:w-56"
          >
            <option value="">Todas las carreras</option>
            {CAREERS.map((c) => (
              <option key={c.career} value={c.career}>{c.career}</option>
            ))}
          </select>
          <Button type="submit" variant="outline">Buscar</Button>
        </form>

        {isLoading && <p className="text-muted-foreground text-sm">Cargando personas...</p>}

        {!isLoading && users.length === 0 && (
          <p className="text-muted-foreground text-sm py-12 text-center">
            No se encontraron personas con esos filtros.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <PersonCard key={u.id} user={u} />
          ))}
        </div>
      </div>
    </main>
  );
}
