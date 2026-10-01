'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Rss, FolderKanban, Sparkles, MessageCircle, UserCircle, Compass } from 'lucide-react';

const BOTTOM_LINKS = [
  { href: '/feed',    label: 'Feed',      icon: Rss,        matches: ['/feed'] },
  { href: '/swipe',   label: 'Descubrir', icon: Sparkles,   matches: ['/swipe'] },
  { href: '/ideas',label: 'Explorar',  icon: Compass,    matches: ['/ideas'] },
  { href: '/chat',    label: 'Chats',   icon: MessageCircle,      matches: ['/matches', '/chat'] },
  { href: '/workspace', label: 'Espacios', icon: FolderKanban, matches: ['/workspace'] },
  { href: '/profile', label: 'Perfil',    icon: UserCircle, matches: ['/profile'] },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const activeHref = pathname.endsWith('/workspace') ? '/workspace' : BOTTOM_LINKS.reduce<string | null>((best, l) => {
    const hit = l.matches.find((m) => pathname.startsWith(m));
    if (!hit) return best;
    const bestLen = best
      ? Math.max(
          ...BOTTOM_LINKS.find((x) => x.href === best)!
            .matches.filter((m) => pathname.startsWith(m))
            .map((m) => m.length),
        )
      : -1;
    return hit.length > bestLen ? l.href : best;
  }, null);

  return (
    /* Solo visible en móvil */
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t">
      <div className="flex items-center justify-around h-16 px-2">
        {BOTTOM_LINKS.map(({ href, label, icon: Icon }) => {
          const active = activeHref === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              ].join(' ')}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                className={active ? 'text-primary' : ''}
              />
              <span className="text-[10px] leading-none font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
