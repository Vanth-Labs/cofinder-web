'use client';

import Link from 'next/link';
import { useMe } from '@/hooks/use-me';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getFacultyByCareer } from '@/lib/careers';

export function ProfileView() {
  const { data: user, isLoading } = useMe();

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando perfil...</p>;
  }

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6 flex flex-col gap-4">

          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar ?? undefined} alt={user.name ?? ''} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-lg">{user.name ?? 'Sin nombre'}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="outline" className="w-fit text-xs mt-1">{user.role}</Badge>
            </div>
          </div>

          {user.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{user.bio}</p>
          )}

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {user.career && (
              <span>
                {user.career}
                {' '}
                <span className="text-xs opacity-70">
                  — {getFacultyByCareer(user.career) ?? user.faculty}
                </span>
              </span>
            )}
            {!user.career && user.faculty && <span>{user.faculty}</span>}
            {user.yearJoined && <span>Ingresó en {user.yearJoined}</span>}
          </div>

          {user.badges?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {user.badges.map((b: { id: string; label: string; description: string }) => (
                <Badge key={b.id} variant="outline" title={b.description}>
                  {b.label}
                </Badge>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {user.skills?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Habilidades</p>
          <div className="flex flex-wrap gap-2">
            {user.skills.map((s: string) => {
              const count = user.endorsements?.[s]?.count ?? 0;
              return (
                <Badge key={s} variant="secondary" title={count ? `${count} endorsement(s) de tus compañeros` : undefined}>
                  {s}
                  {count ? ` · ${count}` : ''}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {user.lookingFor?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Busco</p>
          <div className="flex flex-wrap gap-2">
            {user.lookingFor.map((l: string) => (
              <Badge key={l} variant="outline">{l}</Badge>
            ))}
          </div>
        </div>
      )}

      {user.projects?.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Mis ideas</p>
            <Link href="/ideas/mine" className="text-xs text-primary hover:underline">
              Gestionar
            </Link>
          </div>
          {user.projects.map((p: { id: string; title: string; stage: string }) => (
            <Link key={p.id} href={`/ideas/${p.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="pt-3 pb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{p.title}</p>
                  <Badge variant="outline">{p.stage}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {user.teamMembers?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Miembro de</p>
          {user.teamMembers.map(
            (tm: { id: string; role: string; project: { id: string; title: string; stage: string } }) => (
              <Link key={tm.id} href={`/ideas/${tm.project.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-3 pb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{tm.project.title}</p>
                      <p className="text-xs text-muted-foreground">{tm.role}</p>
                    </div>
                    <Badge variant="outline">{tm.project.stage}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ),
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/profile/edit">Editar perfil</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/ideas/mine">Mis ideas</Link>
        </Button>
      </div>
    </div>
  );
}
