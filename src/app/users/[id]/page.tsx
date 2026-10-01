'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { InviteButton } from '@/components/team/invite-button';
import { ReportButton } from '@/components/report/report-button';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getFacultyByCareer } from '@/lib/careers';
import { PublicProfile, STAGE_LABELS } from '@/lib/types';

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<PublicProfile>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${userId}`);
      return data;
    },
    enabled: isAuthenticated && !!userId,
  });

  const { mutate: toggleEndorse } = useMutation({
    mutationFn: (skill: string) => api.post(`/users/${userId}/endorse`, { skill }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', userId] }),
  });

  if (!hasHydrated || !isAuthenticated || isLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <main className="min-h-screen bg-background">
      
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground text-sm text-left"
        >
          ← Volver
        </button>

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
                  {user.career}{' '}
                  <span className="text-xs opacity-70">
                    — {getFacultyByCareer(user.career) ?? user.faculty}
                  </span>
                </span>
              )}
              {!user.career && user.faculty && <span>{user.faculty}</span>}
              {user.yearJoined && <span>Ingresó en {user.yearJoined}</span>}
            </div>

            {user.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {user.badges.map((b) => (
                  <Badge key={b.id} variant="outline" title={b.description}>
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <InviteButton targetUserId={user.id} targetName={user.name} />
              <ReportButton targetType="USER" targetId={user.id} />
            </div>
          </CardContent>
        </Card>

        {user.skills.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Habilidades</p>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((s) => {
                const e = user.endorsements[s];
                return (
                  <Badge
                    key={s}
                    variant={e?.endorsedByMe ? 'default' : 'secondary'}
                    className={user.canEndorse ? 'cursor-pointer' : ''}
                    title={
                      user.canEndorse
                        ? e?.endorsedByMe
                          ? 'Clic para quitar tu endorsement'
                          : 'Clic para endorsar esta skill'
                        : e?.count
                          ? `${e.count} endorsement(s) de sus compañeros`
                          : undefined
                    }
                    onClick={() => user.canEndorse && toggleEndorse(s)}
                  >
                    {s}
                    {e?.count ? ` · ${e.count}` : ''}
                  </Badge>
                );
              })}
            </div>
            {user.canEndorse && (
              <p className="text-xs text-muted-foreground">
                Trabajaron juntos: haz clic en una skill para endorsarla.
              </p>
            )}
          </div>
        )}

        {user.lookingFor.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Busca</p>
            <div className="flex flex-wrap gap-2">
              {user.lookingFor.map((l) => (
                <Badge key={l} variant="outline">{l}</Badge>
              ))}
            </div>
          </div>
        )}

        {user.projects.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Ideas que fundó</p>
            {user.projects.map((p) => (
              <Link key={p.id} href={`/ideas/${p.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-4 pb-4 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{p.title}</p>
                    <Badge variant="outline">{STAGE_LABELS[p.stage]}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {user.teamMembers.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Miembro de</p>
            {user.teamMembers.map((tm) => (
              <Link key={tm.id} href={`/ideas/${tm.project.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-4 pb-4 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{tm.project.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {tm.role} · founder: {tm.project.founder.name ?? '—'}
                      </p>
                    </div>
                    <Badge variant="outline">{STAGE_LABELS[tm.project.stage]}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
