"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FolderKanban, ChevronRight } from "lucide-react";
export default function WorkspacesPage() {
  const { isAuthenticated } = useRequireAuth();
  const query = useQuery<
    { id: string; title: string; _count: { workspaceProjects: number } }[]
  >({
    queryKey: ["workspaces"],
    queryFn: async () => (await api.get("/workspace")).data,
    enabled: isAuthenticated,
  });
  return (
    <div className="mx-auto max-w-3xl p-4 py-8 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Espacios de trabajo</h1>
        <p className="text-muted-foreground mt-1">
          Cada idea tiene un equipo y sus propios proyectos. Entra para ver su
          EDT y colaborar.
        </p>
      </div>
      {query.isLoading && <p role="status">Cargando tus ideas...</p>}
      {query.isError && (
        <div role="alert">
          No pudimos cargar tus espacios.{" "}
          <Button onClick={() => query.refetch()}>Reintentar</Button>
        </div>
      )}
      {query.data?.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p>Crea una idea o únete a un equipo para empezar.</p>
          <Button asChild className="mt-4">
            <Link href="/ideas">Explorar ideas</Link>
          </Button>
        </div>
      )}
      {query.data?.map((idea) => (
        <Link
          key={idea.id}
          href={`/ideas/${idea.id}/workspace`}
          className="flex items-center gap-4 rounded-xl border p-5 hover:bg-muted"
        >
          <FolderKanban className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold truncate">{idea.title}</h2>
            <p className="text-sm text-muted-foreground">
              {idea._count.workspaceProjects} proyectos · Abrir espacio
            </p>
          </div>
          <ChevronRight className="shrink-0" />
        </Link>
      ))}
    </div>
  );
}
