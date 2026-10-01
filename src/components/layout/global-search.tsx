'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { SearchResults, STAGE_LABELS } from '@/lib/types';

export function GlobalSearch() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Debounce de 300ms antes de consultar
  useEffect(() => {
    const t = setTimeout(() => setQuery(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value]);

  const { data } = useQuery<SearchResults>({
    queryKey: ['global-search', query],
    queryFn: async () => {
      const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
      return data;
    },
    enabled: !!token && query.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setValue('');
    router.push(href);
  };

  const hasResults = (data?.projects.length ?? 0) + (data?.users.length ?? 0) > 0;

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Buscar..."
          className="h-8 w-40 focus:w-56 transition-all rounded-md border border-input bg-transparent pl-8 pr-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute right-0 top-10 z-50 w-72 max-h-96 overflow-y-auto rounded-lg border bg-background shadow-lg">
          {!hasResults && (
            <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>
          )}
          {(data?.projects.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground px-3 pt-2 pb-1">Ideas</p>
              {data!.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(`/ideas/${p.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm"
                >
                  <span className="font-medium">{p.title}</span>{' '}
                  <span className="text-xs text-muted-foreground">
                    {STAGE_LABELS[p.stage]} · {p.founder.name ?? '—'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {(data?.users.length ?? 0) > 0 && (
            <div className="border-t">
              <p className="text-xs font-medium text-muted-foreground px-3 pt-2 pb-1">Personas</p>
              {data!.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => go(`/users/${u.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm"
                >
                  <span className="font-medium">{u.name ?? 'Sin nombre'}</span>{' '}
                  <span className="text-xs text-muted-foreground">{u.career ?? ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
