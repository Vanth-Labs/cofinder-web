'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { thumbUrl } from '@/lib/media';
import { Project, STAGE_LABELS } from '@/lib/types';

export function ProjectCard({ project }: { project: Project }) {
  const initials = project.founder.name
    ? project.founder.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Miniatura (400px, ~12 KB), no la imagen completa: en una grilla de 20
  // ideas la diferencia se nota, sobre todo en datos móviles.
  const cover = thumbUrl(project.coverKey);

  return (
    <Link href={`/ideas/${project.id}`} className="block h-full">
      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
        {/* Card ya trae el estilo para una imagen como primer hijo */}
        {cover && (
          <img src={cover} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
        )}
        <CardContent className="pt-5 pb-5 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold leading-tight">{project.title}</h2>
            <Badge variant="outline" className="shrink-0">{STAGE_LABELS[project.stage]}</Badge>
          </div>

          {project.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.categories.slice(0, 4).map((c) => (
                <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
            {project.description}
          </p>

          {project.openings.filter((o) => o.isOpen).length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Buscan:</span>{' '}
              {project.openings.filter((o) => o.isOpen).slice(0, 3).map((o) => o.title).join(', ')}
              {project.openings.filter((o) => o.isOpen).length > 3 &&
                ` +${project.openings.filter((o) => o.isOpen).length - 3}`}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 border-t mt-auto">
            <Avatar className="w-6 h-6">
              <AvatarImage src={project.founder.avatar ?? undefined} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground truncate">
              {project.founder.name ?? 'Fundador'}
              {project.teamMembers.length > 0 && ` · equipo de ${project.teamMembers.length + 1}`}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
