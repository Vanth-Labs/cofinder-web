'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { Users, ExternalLink, X, Heart, Info } from 'lucide-react';

import { SwipeCard, type SwipeCardHandle } from '@/components/swipe/swipe-card';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STAGE_LABELS } from '@/lib/types';
import type { Project } from '@/lib/types';

export default function SwipePage() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [match, setMatch] = useState<{ title: string; matchId?: string; chatId?: string } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  /**
   * Un handle por idea, no un único ref para "la de arriba".
   *
   * Con un solo ref compartido, la card que sale sigue montada mientras dura su
   * animación (AnimatePresence conserva el elemento viejo, con su ref), así que
   * al desmontarse React pone el ref en null y se lleva por delante el de la
   * card que acaba de quedar arriba: los botones dejaban de responder hasta el
   * siguiente render. Con un Map cada card solo toca su propia entrada.
   */
  const cardHandles = useRef(new Map<string, SwipeCardHandle>());

  const { data: feed = [], isLoading, refetch } = useQuery<Project[]>({
    queryKey: ['swipe-feed'],
    queryFn: async () => {
      const { data } = await api.get('/swipe/feed');
      return data;
    },
    enabled: isAuthenticated,
  });

  const { mutate: swipe, isPending } = useMutation({
    mutationFn: async ({ projectId, direction }: { projectId: string; direction: 'LEFT' | 'RIGHT' }) => {
      const { data } = await api.post('/swipe', { projectId, direction });
      return data as { matched: boolean; matchId?: string; chatId?: string };
    },
    onSuccess: (data, variables) => {
      if (variables.direction === 'RIGHT' && data.matched) {
        const title = feed[currentIndex]?.title ?? 'idea';
        setMatch({ title, matchId: data.matchId, chatId: data.chatId });
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
      setCurrentIndex((i) => i + 1);
      setInfoOpen(false);
    },
  });

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-3.5rem-4rem)] md:min-h-screen">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    );
  }

  const visibleCards = feed.slice(currentIndex, currentIndex + 2).reverse();
  const isEmpty = !isLoading && currentIndex >= feed.length;
  const currentProject = feed[currentIndex];
  const openOpenings = currentProject?.openings?.filter((o) => o.isOpen) ?? [];

  const handleSwipeButton = (direction: 'LEFT' | 'RIGHT') => {
    // Dispara la misma animación de la card; el mutate corre al terminar (onSwipe)
    if (!isPending && currentProject) {
      cardHandles.current.get(currentProject.id)?.swipe(direction);
    }
  };

  return (
    <div className="h-[calc(100dvh-3.5rem-4rem)] md:h-screen flex flex-col md:flex-row md:justify-center md:gap-6 overflow-hidden">

      {/* ── Columna izquierda: card ── */}
      <div className="relative flex flex-col items-center justify-center flex-1 md:flex-none md:w-[480px] md:h-full px-4 py-4 gap-3 md:py-8 md:overflow-visible overflow-hidden">

        {isLoading && (
          <p className="text-muted-foreground text-sm">Cargando ideas...</p>
        )}

        {isEmpty && (
          <div className="text-center flex flex-col gap-4 items-center">
            <p className="text-muted-foreground text-sm">Has visto todas las ideas por ahora.</p>
            <Button variant="outline" onClick={() => { setCurrentIndex(0); refetch(); }}>
              Ver de nuevo
            </Button>
          </div>
        )}

        {!isLoading && !isEmpty && (
          <>
            {/* Card stack */}
            <div className="relative w-full flex-1 md:flex-none md:h-[calc(100vh-10rem)] md:w-full md:max-w-[480px]">
              <AnimatePresence>
                {visibleCards.map((project, i) => {
                  const isTop = i === visibleCards.length - 1;
                  return (
                    <SwipeCard
                      key={project.id}
                      ref={(handle) => {
                        // Cada card se registra bajo su propio id y solo borra
                        // esa entrada al desmontarse: nunca pisa a otra.
                        if (handle) cardHandles.current.set(project.id, handle);
                        else cardHandles.current.delete(project.id);
                      }}
                      project={project}
                      isTop={isTop}
                      onSwipe={(direction) => {
                        if (!isPending) swipe({ projectId: project.id, direction });
                      }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Botones + Ver info — desktop */}
            <div className="hidden md:flex gap-3 w-full max-w-[480px] shrink-0">
              <Button
                variant="outline"
                className="flex-1 h-11 text-sm rounded-full border-2"
                disabled={isPending}
                onClick={() => handleSwipeButton('LEFT')}
              >
                <X />
                Pasar
              </Button>
              <button
                onClick={() => setInfoOpen((v) => !v)}
                className="h-11 w-11 shrink-0 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                aria-label="Ver info"
              >
                <Info className="w-4 h-4" />
              </button>
              <Button
                className="flex-1 h-11 text-sm rounded-full"
                disabled={isPending}
                onClick={() => handleSwipeButton('RIGHT')}
              >
                <Heart />
                Me interesa
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Panel info (desktop) — aparece pegado a la card ── */}
      <AnimatePresence>
        {!isLoading && !isEmpty && currentProject && infoOpen && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="hidden md:flex flex-col w-[360px] shrink-0 py-8"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden h-full">

              {/* Header del panel */}
              <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border/60 shrink-0">
                <div className="flex flex-col gap-1.5 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base leading-tight">{currentProject.title}</h2>
                    <Link
                      href={`/ideas/${currentProject.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{STAGE_LABELS[currentProject.stage]}</Badge>
                    {currentProject.categories.map((c) => (
                      <span key={c} className="text-xs bg-muted px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido scrollable */}
              <div className="overflow-y-auto p-5 flex flex-col gap-5">

                {/* Founder */}
                <div className="flex items-center gap-3">
                  {currentProject.founder.avatar ? (
                    <img
                      src={currentProject.founder.avatar}
                      alt={currentProject.founder.name ?? ''}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                      {currentProject.founder.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{currentProject.founder.name ?? 'Founder'}</p>
                    <p className="text-xs text-muted-foreground">Founder</p>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Sobre la idea
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">{currentProject.description}</p>
                </div>

                {/* Presupuesto */}
                {currentProject.budget != null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Presupuesto</p>
                    <p className="text-sm">
                      {currentProject.budgetCurrency === 'PEN' ? 'S/' : '$'}
                      {currentProject.budget.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                {/* Equipo */}
                {currentProject.teamMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Equipo ({currentProject.teamMembers.length + 1} personas)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProject.teamMembers.map((m, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full w-fit">{m.role}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buscan */}
                {openOpenings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Buscan</p>
                    <div className="flex flex-wrap gap-2">
                      {openOpenings.map((o) => (
                        <div key={o.id} className="bg-muted/60 rounded-xl px-3 py-2 w-fit">
                          <p className="text-sm font-medium whitespace-nowrap">{o.title}</p>
                          {o.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{o.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Popup de match ── */}
      <AnimatePresence>
        {match && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMatch(null)}
          >
            <motion.div
              className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl flex flex-col items-center gap-4"
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMatch(null)}
                aria-label="Cerrar"
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">¡Es un match!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Mostraste interés en <strong className="text-foreground">{match.title}</strong>.
                  Ya puedes hablar con el founder.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <Button asChild className="w-full rounded-full h-11">
                  <Link href={match.matchId ? `/chat/${match.matchId}` : '/matches'}>
                    {match.matchId ? 'Enviar mensaje' : 'Ver matches'}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full rounded-full h-11"
                  onClick={() => setMatch(null)}
                >
                  Seguir descubriendo
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
