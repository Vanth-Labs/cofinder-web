'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';

import { ReportButton } from '@/components/report/report-button';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { Post, PostComment, timeAgo } from '@/lib/types';

const MAX_POST_MEDIA = 4;

function initials(name: string | null | undefined) {
  return name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
}

function Composer() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [mediaKeys, setMediaKeys] = useState<string[]>([]);

  const { data: myProjects = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ['my-projects'],
    queryFn: async () => {
      const { data } = await api.get('/ideas/mine');
      return data;
    },
  });

  const { mutate: publish, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/posts', {
        content: content.trim(),
        projectId: projectId ?? undefined,
        mediaKeys,
      });
      return data;
    },
    onSuccess: () => {
      setContent('');
      setProjectId(null);
      setMediaKeys([]);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Comparte un avance, una idea o una convocatoria..."
        />
        <MultiImageUpload
          value={mediaKeys}
          onChange={setMediaKeys}
          target="post"
          max={MAX_POST_MEDIA}
        />
        {myProjects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Sobre:</span>
            {myProjects.map((p) => (
              <Badge
                key={p.id}
                variant={projectId === p.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setProjectId(projectId === p.id ? null : p.id)}
              >
                {p.title}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={isPending || (content.trim().length === 0 && mediaKeys.length === 0)}
            onClick={() => publish()}
          >
            {isPending ? 'Publicando...' : 'Publicar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Comments({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');

  const { data: comments = [], isLoading } = useQuery<PostComment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data } = await api.get(`/posts/${postId}/comments`);
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  };

  const { mutate: comment, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/posts/${postId}/comments`, { content: text.trim() });
      return data;
    },
    onSuccess: () => {
      setText('');
      invalidate();
    },
  });

  const { mutate: removeComment } = useMutation({
    mutationFn: (id: string) => api.delete(`/posts/comments/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      {isLoading && <p className="text-xs text-muted-foreground">Cargando comentarios...</p>}
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 group">
          <Avatar className="w-6 h-6 mt-0.5">
            <AvatarImage src={c.author.avatar ?? undefined} />
            <AvatarFallback className="text-[10px]">{initials(c.author.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 bg-muted rounded-md px-2.5 py-1.5">
            <p className="text-xs">
              <Link href={`/users/${c.author.id}`} className="font-medium hover:underline">
                {c.author.name ?? 'Usuario'}
              </Link>{' '}
              <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
            </p>
            <p className="text-sm">{c.content}</p>
          </div>
          {c.author.id === currentUserId && (
            <button
              onClick={() => removeComment(c.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive mt-1.5"
              aria-label="Eliminar comentario"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Comentar..."
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) comment();
          }}
        />
        <Button size="sm" variant="outline" disabled={isPending || !text.trim()} onClick={() => comment()}>
          Enviar
        </Button>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [showComments, setShowComments] = useState(false);

  const { mutate: toggleLike } = useMutation({
    mutationFn: () => api.post(`/posts/${post.id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  const { mutate: removePost } = useMutation({
    mutationFn: () => api.delete(`/posts/${post.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={post.author.avatar ?? undefined} />
            <AvatarFallback>{initials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <Link href={`/users/${post.author.id}`} className="font-medium hover:underline">
                {post.author.name ?? 'Usuario'}
              </Link>
              {post.project && (
                <>
                  {' '}
                  <span className="text-muted-foreground">sobre</span>{' '}
                  <Link href={`/ideas/${post.project.id}`} className="font-medium hover:underline">
                    {post.project.title}
                  </Link>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {post.author.career ? `${post.author.career} · ` : ''}
              {timeAgo(post.createdAt)}
            </p>
          </div>
          {post.author.id === currentUserId && (
            <button
              onClick={() => {
                if (confirm('¿Eliminar esta publicación?')) removePost();
              }}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Eliminar publicación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {post.content.trim().length > 0 && (
          <p className="text-sm leading-relaxed whitespace-pre-line">{post.content}</p>
        )}

        {(post.media?.length ?? 0) > 0 && (
          <div
            className={cn(
              'grid gap-1.5',
              post.media!.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
            )}
          >
            {post.media!.map((m) => (
              <a
                key={m.id}
                href={mediaUrl(m.key) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-90"
              >
                <img
                  src={thumbUrl(m.key) ?? ''}
                  alt=""
                  loading="lazy"
                  className={cn(
                    'w-full object-cover',
                    // Una sola foto se ve más alta; varias, en cuadrícula pareja.
                    post.media!.length === 1 ? 'max-h-96' : 'aspect-square',
                  )}
                />
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button
            onClick={() => toggleLike()}
            className={`flex items-center gap-1.5 hover:text-foreground ${
              post.likedByMe ? 'text-destructive' : ''
            }`}
          >
            <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-current' : ''}`} />
            {post._count.likes}
          </button>
          <button
            onClick={() => setShowComments((s) => !s)}
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            {post._count.comments}
          </button>
          {post.author.id !== currentUserId && (
            <span className="ml-auto">
              <ReportButton targetType="POST" targetId={post.id} />
            </span>
          )}
        </div>

        {showComments && <Comments postId={post.id} />}
      </CardContent>
    </Card>
  );
}

export default function FeedPage() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }) => {
      const params = pageParam ? `?cursor=${pageParam}` : '';
      const { data } = await api.get<{ posts: Post[]; nextCursor: string | null }>(
        `/posts${params}`,
      );
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated,
  });

  if (!hasHydrated || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <main className="min-h-screen bg-background">
      
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Feed</h1>
          <p className="text-sm text-muted-foreground">
            Avances, ideas y convocatorias de la comunidad.
          </p>
        </div>

        <Composer />

        {isLoading && <p className="text-muted-foreground text-sm">Cargando publicaciones...</p>}

        {!isLoading && posts.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Aún no hay publicaciones. ¡Sé el primero!
          </p>
        )}

        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
          </Button>
        )}
      </div>
    </main>
  );
}
