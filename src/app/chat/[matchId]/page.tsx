'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { ChatRoom } from '@/components/chat/chat-room';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Match } from '@/lib/types';

export default function ChatPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { hasHydrated, isAuthenticated } = useRequireAuth();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: match, isLoading: matchLoading, isError, refetch } = useQuery<Match>({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const { data } = await api.get(`/matches/${matchId}`);
      return data;
    },
    enabled: isAuthenticated && !!matchId,
  });

  if (!hasHydrated || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  // Contraparte: si soy quien mostró interés, es el founder; si soy el founder,
  // es la persona interesada.
  const iAmInterested = match?.userId === currentUserId;
  const other = iAmInterested ? match?.project.founder : match?.user;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1 px-4 py-4 gap-4">
        <div className="flex items-center gap-2">
          <Link href="/chat?tab=individual" className="shrink-0 rounded-md px-2 py-3 text-sm text-muted-foreground hover:text-foreground" aria-label="Volver a chats">
            ← Chats
          </Link>
          <div className="min-w-0">
            {matchLoading ? (
              <h1 className="font-semibold">Cargando...</h1>
            ) : (
              <>
                <h1 className="font-semibold">
                  {other?.name ?? 'Chat individual'}
                </h1>
                {other && (
                  <p className="text-xs text-muted-foreground truncate">
                    Chat individual · {' '}
                    <Link href={`/ideas/${match?.project.id}`} className="hover:underline">
                      {match?.project.title}
                    </Link>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {isError && <div role="alert" className="text-sm text-destructive">No se pudo cargar la conversación. <button className="underline" onClick={() => refetch()}>Reintentar</button></div>}
        {!matchLoading && !isError && !match?.chat && <p className="text-sm text-muted-foreground">Esta conversación no está disponible.</p>}
        {match?.chat?.id && <ChatRoom chatId={match.chat.id} />}
      </div>
    </main>
  );
}
