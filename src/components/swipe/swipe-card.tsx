'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, X, Heart, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { STAGE_LABELS } from '@/lib/types';
import type { Project } from '@/lib/types';

interface SwipeCardProps {
  project: Project;
  onSwipe: (direction: 'LEFT' | 'RIGHT') => void;
  isTop: boolean;
}

export interface SwipeCardHandle {
  swipe: (direction: 'LEFT' | 'RIGHT') => void;
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { project, onSwipe, isTop },
  ref,
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -20], [1, 0]);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragAxis = useRef<'x' | 'y' | null>(null);

  useEffect(() => {
    if (!isTop) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && !isExpanded) handleSwipe('RIGHT');
      if (e.key === 'ArrowLeft' && !isExpanded) handleSwipe('LEFT');
      if (e.key === 'ArrowUp') setIsExpanded(true);
      if (e.key === 'ArrowDown' || e.key === 'Escape') setIsExpanded(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTop, isExpanded]);

  useEffect(() => {
    if (!isTop) return;
    const el = cardRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.deltaY < 0) setIsExpanded(true);
      if (e.deltaY > 0) setIsExpanded(false);
    }
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isTop]);

  async function handleSwipe(direction: 'LEFT' | 'RIGHT') {
    await animate(x, direction === 'RIGHT' ? 500 : -500, { duration: 0.3 });
    onSwipe(direction);
  }

  // Permite disparar la animación de swipe desde los botones de la página
  useImperativeHandle(ref, () => ({ swipe: handleSwipe }));

  function onDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 80) handleSwipe('RIGHT');
    else if (info.offset.x < -80) handleSwipe('LEFT');
    else animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragAxis.current = null;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragStart.current || !isTop) return;
    const dy = e.clientY - dragStart.current.y;
    if (dragAxis.current === 'y') {
      if (dy < -60 && !isExpanded) setIsExpanded(true);
      if (dy > 60 && isExpanded) setIsExpanded(false);
    }
    dragStart.current = null;
    dragAxis.current = null;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const dx = Math.abs(e.clientX - dragStart.current.x);
    const dy = Math.abs(e.clientY - dragStart.current.y);
    if (!dragAxis.current && (dx > 8 || dy > 8)) {
      dragAxis.current = dy > dx ? 'y' : 'x';
    }
  }

  const openOpenings = project.openings.filter((o) => o.isOpen);
  const categoryTags = project.categories.slice(0, 3);
  // La portada ya llena la card; en la galería solo van las demás.
  const gallery = (project.media ?? []).filter((m) => m.key !== project.coverKey);

  return (
    <motion.div
      ref={cardRef}
      drag={isTop && !isExpanded ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute inset-0 select-none"
      style={{ x, rotate, touchAction: 'none', cursor: isExpanded ? 'default' : 'grab' }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl bg-card border border-border">

        {/* Imagen o placeholder */}
        {mediaUrl(project.coverKey) ? (
          <img
            src={mediaUrl(project.coverKey)!}
            alt={project.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
            <span className="text-6xl opacity-20">{project.title.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Gradiente inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Indicadores de swipe */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-8 left-6 border-4 border-green-400 text-green-400 font-extrabold text-2xl px-3 py-1 rounded-lg rotate-[-12deg]"
        >
          INTERESA
        </motion.div>
        <motion.div
          style={{ opacity: passOpacity }}
          className="absolute top-8 right-6 border-4 border-red-400 text-red-400 font-extrabold text-2xl px-3 py-1 rounded-lg rotate-[12deg]"
        >
          PASAR
        </motion.div>

        {/* Info inferior */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1.5">

          {/* Botones pasar / me interesa — fila propia, solo móvil */}
          {isTop && !isExpanded && (
            <div className="flex justify-end gap-2 md:hidden">
              <button
                onClick={(e) => { e.stopPropagation(); handleSwipe('LEFT'); }}
                className="w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-red-500 hover:bg-white transition-colors"
                aria-label="Pasar"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleSwipe('RIGHT'); }}
                className="w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-green-500 hover:bg-white transition-colors"
                aria-label="Me interesa"
              >
                <Heart className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Título + badge de stage al lado */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/ideas/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-white font-bold text-xl leading-tight hover:underline"
            >
              {project.title}
            </Link>
            <Badge variant="secondary" className="text-xs shrink-0">
              {STAGE_LABELS[project.stage]}
            </Badge>
          </div>

          {/* Tags de categoría — máx 3, w-fit */}
          {categoryTags.length > 0 && (
            <div className="flex gap-1 w-fit">
              {categoryTags.map((c) => (
                <span key={c} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Descripción */}
          <p className="text-white/80 text-sm line-clamp-2 leading-relaxed">
            {project.description}
          </p>

          {/* Handle para abrir sheet — solo móvil */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            className="md:hidden flex justify-center w-full pt-1.5 pb-0.5"
            aria-label="Ver más información"
          >
            <div className="w-8 h-0.5 rounded-full bg-white/40" />
          </button>
        </div>

        {/* Panel expandido (móvil) — bottom sheet */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute inset-0 bg-card overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-card border-b border-border/60">
                <div className="flex justify-center pt-3 pb-2 cursor-pointer" onClick={() => setIsExpanded(false)}>
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between px-5 pb-3">
                  <span className="font-semibold text-sm truncate pr-4">{project.title}</span>
                  <button onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  {project.founder.avatar ? (
                    <img src={project.founder.avatar} alt={project.founder.name ?? ''} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                      {project.founder.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{project.founder.name ?? 'Founder'}</p>
                    <p className="text-xs text-muted-foreground">Founder</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Sobre la idea</p>
                  <p className="text-sm leading-relaxed">{project.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{STAGE_LABELS[project.stage]}</Badge>
                  {project.categories.map((c) => (
                    <span key={c} className="text-xs bg-muted px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>

                {gallery.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Fotos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {gallery.map((m) => (
                        <img
                          key={m.id}
                          src={thumbUrl(m.key) ?? ''}
                          alt=""
                          loading="lazy"
                          className="rounded-xl object-cover aspect-video w-full"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {project.budget != null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Presupuesto</p>
                    <p className="text-sm">
                      {project.budgetCurrency === 'PEN' ? 'S/' : '$'}
                      {project.budget.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                {project.teamMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Equipo ({project.teamMembers.length + 1} personas)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.teamMembers.map((m, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{m.role}</span>
                      ))}
                    </div>
                  </div>
                )}

                {openOpenings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Buscan</p>
                    <div className="flex flex-col gap-2">
                      {openOpenings.map((o) => (
                        <div key={o.id} className="bg-muted/60 rounded-xl px-3 py-2.5">
                          <p className="text-sm font-medium">{o.title}</p>
                          {o.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{o.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link href={`/ideas/${project.id}`} onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground underline text-center pt-1">
                  Ver página completa
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
