'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

/**
 * Alterna claro/oscuro.
 *
 * Qué icono se ve lo decide CSS con la variante `dark:`, no estado de React:
 * el tema ya vive como clase en el <html>, así que no hay mismatch de
 * hidratación que esquivar ni el parpadeo del típico flag `mounted`.
 *
 * En el clic se lee `resolvedTheme` (no `theme`) para que, partiendo de
 * "system", el primer clic lleve al opuesto de lo que el usuario está viendo.
 */
const LABEL = 'Cambiar tema';

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'rail' }) {
  const { resolvedTheme, setTheme } = useTheme();
  const toggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  if (variant === 'rail') {
    return (
      <button
        onClick={toggle}
        title={LABEL}
        aria-label={LABEL}
        className="flex items-center gap-4 h-12 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Moon size={24} strokeWidth={1.8} className="shrink-0 dark:hidden" />
        <Sun size={24} strokeWidth={1.8} className="hidden shrink-0 dark:block" />
        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 lg:opacity-100 transition-opacity duration-200">
          Tema
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      title={LABEL}
      aria-label={LABEL}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      <Moon className="w-5 h-5 dark:hidden" />
      <Sun className="hidden w-5 h-5 dark:block" />
    </button>
  );
}
