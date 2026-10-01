'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { ProjectCard } from '@/components/projects/project-card';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRESET_CATEGORIES, Project, ProjectStage, STAGES, STAGE_LABELS } from '@/lib/types';

export default function ProjectsPage() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [stage, setStage] = useState<ProjectStage | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<'recommended' | 'recent'>('recommended');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects', debounced, stage, category, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debounced) params.set('search', debounced);
      if (stage) params.set('stage', stage);
      if (category) params.set('category', category);
      params.set('sort', sort);
      const { data } = await api.get(`/ideas?${params.toString()}`);
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
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Explorar ideas</h1>
            <p className="text-sm text-muted-foreground">
              Ideas de la comunidad PUCP buscando equipo para hacerlas realidad.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/ideas/new">+ Publicar</Link>
          </Button>
        </div>

        <Button asChild variant="outline" className="self-start"><Link href="/workspace">Mis espacios de trabajo</Link></Button>
        <div className="flex flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDebounced(search.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
            />
            <Button type="submit" variant="outline">Buscar</Button>
          </form>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Orden:</span>
            <Badge
              variant={sort === 'recommended' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSort('recommended')}
            >
              Para ti
            </Badge>
            <Badge
              variant={sort === 'recent' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSort('recent')}
            >
              Recientes
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Etapa:</span>
            {STAGES.map((s) => (
              <Badge
                key={s}
                variant={stage === s ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setStage(stage === s ? null : s)}
              >
                {STAGE_LABELS[s]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Categoría:</span>
            {PRESET_CATEGORIES.slice(0, 10).map((c) => (
              <Badge
                key={c}
                variant={category === c ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCategory(category === c ? null : c)}
              >
                {c}
              </Badge>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Cargando ideas...</p>}

        {!isLoading && projects.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm">No hay ideas con esos filtros.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/ideas/new">Publica la primera</Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    </main>
  );
}
