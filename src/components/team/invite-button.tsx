'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';

interface MyProject {
  id: string;
  title: string;
  openings: { id: string; title: string; isOpen: boolean }[];
}

/**
 * Botón "Invitar a mi idea": despliega selección de idea + rol y envía
 * la invitación. Solo se muestra si el usuario actual tiene ideas.
 */
export function InviteButton({ targetUserId, targetName }: { targetUserId: string; targetName?: string | null }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: myProjects = [] } = useQuery<MyProject[]>({
    queryKey: ['my-projects'],
    queryFn: async () => {
      const { data } = await api.get('/ideas/mine');
      return data;
    },
    enabled: !!currentUserId && open,
  });

  const selected = myProjects.find((p) => p.id === projectId);

  const { mutate: invite, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/team/projects/${projectId}/invite`, {
        userId: targetUserId,
        role: role.trim(),
      });
      return data;
    },
    onSuccess: () => {
      setSent(true);
      setErrorMsg(null);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      setErrorMsg(err.response?.data?.message ?? 'No se pudo enviar la invitación');
    },
  });

  if (targetUserId === currentUserId) return null;

  if (sent) {
    return <Badge>Invitación enviada{targetName ? ` a ${targetName.split(' ')[0]}` : ''}</Badge>;
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Invitar a mi idea
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        {myProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Primero publica una idea para poder invitar personas.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Idea</Label>
              <div className="flex flex-wrap gap-2">
                {myProjects.map((p) => (
                  <Badge
                    key={p.id}
                    variant={projectId === p.id ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setProjectId(p.id);
                      setRole(p.openings.find((o) => o.isOpen)?.title ?? '');
                    }}
                  >
                    {p.title}
                  </Badge>
                ))}
              </div>
            </div>
            {selected && (
              <div className="flex flex-col gap-1.5">
                <Label>Rol</Label>
                <div className="flex flex-wrap gap-2">
                  {selected.openings.filter((o) => o.isOpen).map((o) => (
                    <Badge
                      key={o.id}
                      variant={role === o.title ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setRole(o.title)}
                    >
                      {o.title}
                    </Badge>
                  ))}
                </div>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="U otro rol..."
                  maxLength={50}
                />
              </div>
            )}
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!projectId || role.trim().length < 2 || isPending}
                onClick={() => invite()}
              >
                {isPending ? 'Enviando...' : 'Invitar'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
