'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { api } from '@/lib/api';
import { deadlineLabel } from '@/lib/workspace';
import { AppNotification } from '@/lib/types';
import { useAuthStore } from '@/store/auth.store';

function describe(n: AppNotification): { text: string; href: string } {
  const actor = n.data.actorName ?? 'Alguien';
  const project = n.data.projectTitle ?? 'tu idea';
  const role = n.data.role ? ` como ${n.data.role}` : '';
  switch (n.type) {
    case 'PACKAGE_ASSIGNED':
      return { text: `Te asignaron como jefe de ${n.data.packageTitle ?? 'un paquete'}`, href: `/ideas/${n.data.ideaId}/workspace?project=${n.data.workspaceProjectId}&package=${n.data.packageId}` };
    case 'PACKAGE_DEADLINE_CHANGED':
      return { text: `Fecha límite de ${n.data.packageTitle}: ${deadlineLabel(n.data.deadline ?? null)}`, href: `/ideas/${n.data.ideaId}/workspace?project=${n.data.workspaceProjectId}&package=${n.data.packageId}` };
    case 'NEW_MATCH':
      return { text: `${actor} está interesado en ${project}`, href: n.data.matchId ? `/chat/${n.data.matchId}` : '/chat?tab=individual' };
    case 'NEW_APPLICATION':
      return {
        text: `${actor} postuló${role} a ${project}`,
        href: n.data.projectId ? `/ideas/${n.data.projectId}` : '/ideas/mine',
      };
    case 'APPLICATION_ACCEPTED':
      return { text: `¡Te aceptaron en ${project}! Ya eres parte del equipo`, href: `/ideas/${n.data.projectId}` };
    case 'APPLICATION_REJECTED':
      return { text: `Tu postulación a ${project} fue rechazada`, href: '/applications' };
    case 'TEAM_INVITE':
      return { text: `${actor} te invitó${role} a ${project}`, href: '/applications?tab=invites' };
    case 'INVITE_ACCEPTED':
      return { text: `${actor} aceptó tu invitación a ${project}`, href: `/ideas/${n.data.projectId}` };
    case 'INVITE_DECLINED':
      return { text: `${actor} declinó tu invitación a ${project}`, href: `/ideas/${n.data.projectId}` };
    case 'MEMBER_LEFT':
      return { text: `${actor} dejó el equipo de ${project}`, href: `/ideas/${n.data.projectId}` };
    case 'MEMBER_REMOVED':
      return { text: `Ya no formas parte de ${project}`, href: `/ideas/${n.data.projectId}` };
    case 'NEW_COMMENT':
      return {
        text: `${actor} comentó tu publicación${n.data.preview ? `: “${n.data.preview}”` : ''}`,
        href: '/feed',
      };
    case 'EVENT_REGISTRATION':
      return {
        text: `${actor} se inscribió a ${n.data.eventTitle ?? 'tu evento'}${n.data.projectTitle ? ` con ${n.data.projectTitle}` : ''}`,
        href: n.data.eventId ? `/events/${n.data.eventId}` : '/events',
      };
    case 'MEETING_SCHEDULED':
      return {
        text: `${actor} agendó una reunión en ${project}${n.data.meetingTitle ? `: ${n.data.meetingTitle}` : ''}`,
        href: n.data.projectId ? `/ideas/${n.data.projectId}/meetings` : '/',
      };
    case 'SKILL_ENDORSED':
      return {
        text: `${actor} endorsó tu skill${n.data.skill ? ` de ${n.data.skill}` : ''}`,
        href: '/profile',
      };
    default:
      return { text: 'Notificación', href: '/' };
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export function NotificationBell({ variant = 'compact' }: { variant?: 'compact' | 'rail' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  const { data } = useQuery<{ notifications: AppNotification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    enabled: !!token,
    // Fallback: el socket entrega en tiempo real; el polling cubre reconexiones
    refetchInterval: 60_000,
  });

  // Suscripción en tiempo real: el backend emite `notification` al room user:{id}
  useEffect(() => {
    if (!token) return;
    const s = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', {
      auth: { token },
    });
    s.on('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => {
      s.disconnect();
    };
  }, [token, queryClient]);

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const isRail = variant === 'rail';

  const list = (
    <>
      {(data?.notifications ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">Sin notificaciones</p>
      )}
      {(data?.notifications ?? []).map((n) => {
        const { text, href } = describe(n);
        return (
          <Link
            key={n.id}
            href={href}
            onClick={() => {
              if (!n.isRead) markRead(n.id);
              setOpen(false);
            }}
            className={`block px-4 py-3 text-sm border-b last:border-b-0 hover:bg-accent/50 ${
              n.isRead ? 'text-muted-foreground' : 'font-medium'
            }`}
          >
            <p className="leading-snug">{text}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="relative" ref={ref}>
      {isRail ? (
        /* Fila del rail: icono + etiqueta que aparece al expandir */
        <button
          onClick={() => setOpen((o) => !o)}
          title="Notificaciones"
          className={[
            'flex items-center gap-4 h-12 w-full rounded-lg px-2.5 text-sm transition-colors',
            open
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          ].join(' ')}
          aria-label="Notificaciones"
        >
          <span className="relative shrink-0">
            <Bell size={24} strokeWidth={open ? 2.2 : 1.8} />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] leading-none rounded-full px-1 py-0.5 min-w-4 text-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 lg:opacity-100 transition-opacity duration-200">
            Notificaciones
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative text-muted-foreground hover:text-foreground p-1"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] leading-none rounded-full px-1 py-0.5 min-w-4 text-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Dropdown compacto (header móvil) */}
      {!isRail && open && (
        <div className="absolute right-0 top-8 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border bg-background shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <p className="text-sm font-medium">Notificaciones</p>
            {unread > 0 && (
              <button onClick={() => markAllRead()} className="text-xs text-muted-foreground hover:text-foreground">
                Marcar todas leídas
              </button>
            )}
          </div>
          {list}
        </div>
      )}

      {/* Drawer estilo Instagram (rail desktop) — se desliza sobre el contenido */}
      {isRail && (
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-y-0 right-0 left-20 lg:left-60 z-40 bg-black/10"
              />
              <motion.aside
                initial={{ x: -28, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -28, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                className="fixed left-20 lg:left-60 inset-y-0 z-50 flex w-[400px] max-w-[calc(100vw-5rem)] flex-col border-r bg-background shadow-2xl"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                  <h2 className="text-lg font-bold tracking-tight">Notificaciones</h2>
                  <div className="flex items-center gap-4">
                    {unread > 0 && (
                      <button
                        onClick={() => markAllRead()}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Marcar todas leídas
                      </button>
                    )}
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Cerrar"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">{list}</div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
