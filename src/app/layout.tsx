import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/layout/query-provider';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { PwaRegister } from '@/components/layout/pwa-register';
import { ShellWrapper } from '@/components/layout/shell-wrapper';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://cofinder.vanthlabs.org'),
  title: 'CoFinder by VanthLabs — Encuentra tu cofounder PUCP',
  description: 'Conecta con estudiantes y alumni de la PUCP para co-emprender',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  // Sigue al tema: es el color de la barra del navegador en móvil, y con un
  // solo valor quedaba desalineado con el fondo real en uno de los dos modos.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={geist.className}>
        <ThemeProvider>
          <QueryProvider>
            <ShellWrapper>{children}</ShellWrapper>
          </QueryProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
