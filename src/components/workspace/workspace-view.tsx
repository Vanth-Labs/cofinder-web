"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { AlertDialog } from "radix-ui";
import { Check, ListTree, MessageSquare, Network, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PACKAGE_STATES,
  deadlineLabel,
  deadlineInput,
  deadlineInstant,
  Workspace,
  WorkPackage,
  WorkspaceMember,
} from "@/lib/workspace";
import { EdtBoard } from "./edt-board";
import "./workspace.css";

type Change = {
  method: "post" | "patch" | "put" | "delete";
  path: string;
  data?: unknown;
  selectCreated?: boolean;
};
function TitleForm({
  label,
  initial = "",
  submit,
  pending,
}: {
  label: string;
  initial?: string;
  submit: (title: string) => Promise<boolean>;
  pending: boolean;
}) {
  const [title, setTitle] = useState(initial);
  return (
    <form
      className="flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (title.trim() && (await submit(title.trim())) && !initial)
          setTitle("");
      }}
    >
      <Input
        aria-label={label}
        placeholder={label}
        value={title}
        maxLength={200}
        onChange={(event) => setTitle(event.target.value)}
        className="min-w-0 flex-1"
        required
      />
      <Button
        type="submit"
        variant="outline"
        disabled={pending || !title.trim()}
      >
        {initial ? "Renombrar" : "Crear"}
      </Button>
    </form>
  );
}
function PackageDetails({
  node,
  members,
  pending,
  save,
}: {
  node: WorkPackage;
  members: WorkspaceMember[];
  pending: boolean;
  save: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [leaderId, setLeaderId] = useState(node.leaderId ?? "");
  const [deadline, setDeadline] = useState(deadlineInput(node.deadline));
  return (
    <form
      className="edt-details-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data: Record<string, unknown> = {};
        if (leaderId !== (node.leaderId ?? ""))
          data.leaderId = leaderId || null;
        if (node.isLeaf && deadline !== deadlineInput(node.deadline))
          data.deadline = deadlineInstant(deadline);
        void save(data);
      }}
    >
      <label className="edt-field">
        Jefe del paquete
        <select
          aria-label="Jefe del paquete"
          value={leaderId}
          onChange={(event) => setLeaderId(event.target.value)}
        >
          <option value="">Sin asignar</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? "Miembro"}
            </option>
          ))}
          {node.leaderId && !members.some((m) => m.id === node.leaderId) && (
            <option value={node.leaderId}>Miembro anterior</option>
          )}
        </select>
      </label>
      {node.isLeaf ? (
        <label className="edt-field">
          Fecha y hora límite
          <input
            aria-label="Fecha y hora límite"
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <small>Hora de Perú (UTC−5).</small>
        </label>
      ) : (
        <div className="edt-field">
          <span>Fecha y hora calculadas</span>
          <p>{deadlineLabel(node.effectiveDeadline)}</p>
          <small>La fecha más tardía de sus hijos. Hora de Perú.</small>
        </div>
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        Guardar detalles
      </Button>
    </form>
  );
}
function MemberNote({
  member,
  content,
  editable,
  save,
  pending,
}: {
  member: WorkspaceMember;
  content: string;
  editable: boolean;
  save: (text: string) => void;
  pending: boolean;
}) {
  const [draft, setDraft] = useState(content);
  return (
    <form
      className="edt-comment"
      onSubmit={(event) => {
        event.preventDefault();
        save(draft);
      }}
    >
      <label>
        {member.name ?? "Miembro"}
        {editable && <span>tú</span>}
        <Textarea
          aria-label={`Comentario de ${member.name ?? "Miembro"}`}
          value={editable ? draft : content}
          readOnly={!editable}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={20000}
          rows={2}
          placeholder={
            editable ? "Escribe tu avance o comentario…" : "Sin comentarios"
          }
        />
      </label>
      {editable && (
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={pending || draft === content}
        >
          Guardar comentario
        </Button>
      )}
    </form>
  );
}

export function WorkspaceView() {
  const ideaId = useParams().id as string;
  const { isAuthenticated } = useRequireAuth();
  const userId = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("view") === "outline" ? "outline" : "map";
  const [showComments, setShowComments] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>();
  const [deleteNode, setDeleteNode] = useState<WorkPackage | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const key = ["workspace", ideaId];
  const query = useQuery<Workspace>({
    queryKey: key,
    queryFn: async () => (await api.get(`/workspace/${ideaId}`)).data,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });
  const data = query.data;
  const project =
    data?.projects.find((p) => p.id === params.get("project")) ??
    data?.projects[0];
  const selected = project?.packages.find(
    (p) => p.id === params.get("package"),
  );
  const base = `/workspace/${ideaId}/projects/${project?.id}`;
  const select = (projectId: string, packageId?: string, nextMode = mode) => {
    const search = new URLSearchParams({ project: projectId, view: nextMode });
    if (packageId) search.set("package", packageId);
    router.push(`/ideas/${ideaId}/workspace?${search}`, { scroll: false });
  };
  const mutation = useMutation({
    mutationFn: async (change: Change) =>
      (
        await api.request({
          method: change.method,
          url: change.path,
          data: change.data,
        })
      ).data,
    onSuccess: async (result, change) => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["workspaces"] });
      setNotice("Guardado");
      if (change.selectCreated && result.id) {
        if (change.path.endsWith("/packages")) setEditingId(result.id);
        select(
          change.path.endsWith("/projects") ? result.id : project!.id,
          change.path.endsWith("/packages") ? result.id : undefined,
        );
      }
      if (
        change.method === "delete" &&
        selected &&
        change.path.endsWith(`/${selected.id}`)
      )
        select(project!.id, selected.parentId ?? undefined);
    },
  });
  const change = async (value: Change) => {
    setNotice("");
    try {
      await mutation.mutateAsync(value);
      return true;
    } catch {
      return false;
    }
  };
  const pending = mutation.isPending;
  const error =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message
      : null;
  if (query.isLoading || !isAuthenticated)
    return (
      <p className="p-8" role="status">
        Cargando espacio de trabajo…
      </p>
    );
  if (!data || query.isError)
    return (
      <div className="mx-auto max-w-lg p-8 space-y-4">
        <h1 className="text-xl font-semibold">No pudimos abrir este espacio</h1>
        <p>Comprueba tu conexión y que sigues siendo miembro de la idea.</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
        <Link href="/workspace" className="block underline">
          Volver a mis espacios
        </Link>
      </div>
    );
  const children = deleteNode
    ? (project?.packages.filter((node) => node.parentId === deleteNode.id)
        .length ?? 0)
    : 0;
  return (
    <div className="edt-workspace mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <nav className="edt-breadcrumb" aria-label="Ubicación">
        <Link href="/workspace">Mis espacios</Link>
        <span>/</span>
        <Link href={`/ideas/${ideaId}`}>{data.idea.title}</Link>
      </nav>
      <header className="edt-header">
        <div>
          <p className="edt-eyebrow">Espacio de trabajo</p>
          <h1>{data.idea.title}</h1>
        </div>
        <div className="edt-header-actions">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/chat/team/${ideaId}`}>Chat del equipo</Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            {data.members.length} miembros
          </span>
        </div>
      </header>
      <nav className="edt-projects" aria-label="Proyectos de la idea">
        {data.projects.map((p) => (
          <button
            className="edt-project-tab"
            key={p.id}
            aria-current={p.id === project?.id ? "page" : undefined}
            onClick={() => {
              setEditingId(undefined);
              select(p.id);
            }}
          >
            {p.title}
          </button>
        ))}
        {data.canEdit && (
          <button
            className="edt-project-tab flex items-center gap-1 text-muted-foreground"
            onClick={() => setShowProjectForm((v) => !v)}
            aria-expanded={showProjectForm}
          >
            <Plus size={14} />
            Proyecto
          </button>
        )}
      </nav>
      {data.canEdit && (showProjectForm || !project) && (
        <div className="mb-5 max-w-lg">
          <TitleForm
            label="Nombre del nuevo proyecto"
            pending={pending}
            submit={(title) =>
              change({
                method: "post",
                path: `/workspace/${ideaId}/projects`,
                data: { title },
                selectCreated: true,
              })
            }
          />
        </div>
      )}
      {!project && (
        <p className="py-12 text-sm text-muted-foreground">
          Todavía no hay proyectos en esta idea.
        </p>
      )}
      {project && (
        <>
          <div className="edt-toolbar">
            <h2>
              {project.title}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                EDT
              </span>
            </h2>
            <div className="edt-toolbar-actions">
              <div className="edt-view-switch" aria-label="Vista del EDT">
                <button
                  aria-pressed={mode === "map"}
                  onClick={() => {
                    setEditingId(undefined);
                    select(project.id, selected?.id, "map");
                  }}
                >
                  <Network size={14} />
                  Map
                </button>
                <button
                  aria-pressed={mode === "outline"}
                  onClick={() => {
                    setEditingId(undefined);
                    select(project.id, selected?.id, "outline");
                  }}
                >
                  <ListTree size={14} />
                  Outline
                </button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowComments((v) => !v)}
                aria-expanded={showComments}
                title={
                  showComments ? "Ocultar comentarios" : "Mostrar comentarios"
                }
              >
                <MessageSquare size={14} />
                <span className="hidden sm:inline">
                  {showComments ? "Ocultar comentarios" : "Mostrar comentarios"}
                </span>
              </Button>
              {selected && (
                <Button
                  className="xl:hidden"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    detailRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  Detalles
                </Button>
              )}
            </div>
          </div>
          <div className={`edt-work-grid ${selected ? "has-selection" : ""}`}>
            <EdtBoard
              key={project.id}
              title={project.title}
              packages={project.packages}
              members={data.members}
              mode={mode}
              selectedId={selected?.id}
              editingId={editingId}
              canEdit={data.canEdit}
              pending={pending}
              onSelect={(id) => select(project.id, id)}
              onRename={(id, title) =>
                change({
                  method: "patch",
                  path: `${base}/packages/${id}`,
                  data: { title },
                })
              }
              onAdd={(parentId) => {
                void change({
                  method: "post",
                  path: `${base}/packages`,
                  data: {
                    title: parentId ? "Nuevo paquete" : "Nueva sección",
                    parentId,
                  },
                  selectCreated: true,
                });
              }}
              onDelete={setDeleteNode}
              onMove={(id, position) => {
                void change({
                  method: "patch",
                  path: `${base}/packages/${id}`,
                  data: position,
                });
              }}
            />
            {selected && (
              <aside
                className="edt-inspector scroll-mt-20"
                ref={detailRef}
                aria-label="Detalles del paquete"
              >
                <div className="edt-inspector-header">
                  <span>Paquete {selected.number}</span>
                  <button
                    className="edt-inspector-close"
                    aria-label="Cerrar detalles"
                    onClick={() => select(project.id)}
                  >
                    <X size={15} />
                  </button>
                </div>
                <h3>{selected.title}</h3>
                {data.canEdit ? (
                  <PackageDetails
                    key={`${selected.id}:${selected.updatedAt}`}
                    node={selected}
                    members={data.members}
                    pending={pending}
                    save={(values) =>
                      change({
                        method: "patch",
                        path: `${base}/packages/${selected.id}`,
                        data: values,
                      })
                    }
                  />
                ) : (
                  <div className="edt-field">
                    <span>Jefe</span>
                    <p>
                      {data.members.find((m) => m.id === selected.leaderId)
                        ?.name ?? "Sin asignar"}
                    </p>
                    <span>Fecha límite</span>
                    <p>{deadlineLabel(selected.effectiveDeadline)}</p>
                  </div>
                )}
                {(selected.status === "AT_RISK" ||
                  selected.status === "DELAYED") && (
                  <p
                    className={`edt-deadline-alert ${PACKAGE_STATES[selected.status].color}`}
                  >
                    {selected.status === "DELAYED"
                      ? "La fecha límite de este paquete ya pasó."
                      : "Este paquete vence dentro de las próximas 72 horas."}
                    <br />
                    {deadlineLabel(selected.effectiveDeadline)} · Perú
                  </p>
                )}
                {selected.leaderId === userId && (
                  <div className="edt-progress">
                    <p>
                      {PACKAGE_STATES[selected.status].label} · Tú eres el jefe
                      de este paquete.
                    </p>
                    {selected.progress !== "ON_TRACK" && (
                      <Button
                        variant="outline"
                        disabled={pending || !selected.effectiveDeadline}
                        onClick={() =>
                          change({
                            method: "patch",
                            path: `${base}/packages/${selected.id}/progress`,
                            data: { status: "ON_TRACK" },
                          })
                        }
                      >
                        {selected.progress === "DONE"
                          ? "Volver a iniciar"
                          : "Iniciar paquete"}
                      </Button>
                    )}
                    {!selected.effectiveDeadline && (
                      <p>Necesita una fecha límite para iniciar.</p>
                    )}
                    {selected.progress !== "DONE" && (
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          change({
                            method: "patch",
                            path: `${base}/packages/${selected.id}/progress`,
                            data: { status: "DONE" },
                          })
                        }
                      >
                        Marcar como terminado
                      </Button>
                    )}
                  </div>
                )}
                {showComments && (
                  <section aria-label="Comentarios del equipo">
                    <h4 className="edt-comments-heading">Notas del equipo</h4>
                    {data.members.map((member) => (
                      <MemberNote
                        key={`${selected.id}:${member.id}`}
                        member={member}
                        content={
                          selected.notes.find(
                            (note) => note.userId === member.id,
                          )?.content ?? ""
                        }
                        editable={member.id === userId}
                        pending={pending}
                        save={(content) => {
                          void change({
                            method: "put",
                            path: `${base}/packages/${selected.id}/note`,
                            data: { content },
                          });
                        }}
                      />
                    ))}
                  </section>
                )}
              </aside>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="edt-legend" aria-label="Leyenda de estados">
              {Object.entries(PACKAGE_STATES).map(([state, value]) => (
                <span key={state} className={value.color}>
                  <i />
                  {value.short}
                </span>
              ))}
            </div>
            <div
              className={`edt-feedback ${mutation.isError ? "edt-feedback-error" : ""}`}
              role={mutation.isError ? "alert" : "status"}
            >
              {mutation.isError ? (
                typeof error === "string" ? (
                  error
                ) : (
                  "No se pudo guardar. Vuelve a intentarlo."
                )
              ) : pending ? (
                "Guardando…"
              ) : notice ? (
                <>
                  <Check size={12} />
                  {notice}
                </>
              ) : (
                ""
              )}
            </div>
          </div>
        </>
      )}
      <details className="edt-team">
        <summary className="cursor-pointer">
          Equipo y permisos · {data.canEdit ? "Owner" : "Miembro"}
        </summary>
        <div className="mt-4 flex flex-wrap gap-3">
          {data.members.map((member) => (
            <div
              className="flex items-center gap-2 border-l pl-3 py-1"
              key={member.id}
            >
              <div>
                {member.name ?? "Miembro"}
                <span className="block text-[10px] text-muted-foreground">
                  {member.id === data.idea.founderId
                    ? "Owner original"
                    : member.isOwner
                      ? "Owner"
                      : "Miembro"}
                </span>
              </div>
              {data.isOriginalOwner && member.id !== data.idea.founderId && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    change({
                      method: "patch",
                      path: `/workspace/${ideaId}/owners/${member.id}`,
                      data: { isOwner: !member.isOwner },
                    })
                  }
                >
                  {member.isOwner ? "Quitar owner" : "Hacer owner"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </details>
      {project && data.canEdit && (
        <details className="edt-team">
          <summary className="cursor-pointer">Ajustes del proyecto</summary>
          <div className="mt-4 max-w-lg space-y-3">
            <TitleForm
              key={`${project.id}:${project.title}`}
              initial={project.title}
              label="Nombre del proyecto"
              pending={pending}
              submit={(title) =>
                change({ method: "patch", path: base, data: { title } })
              }
            />
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `¿Eliminar el proyecto «${project.title}» y todo su EDT?`,
                  )
                )
                  void change({ method: "delete", path: base });
              }}
            >
              Eliminar proyecto
            </Button>
          </div>
        </details>
      )}
      <AlertDialog.Root
        open={!!deleteNode}
        onOpenChange={(open) => {
          if (!open) setDeleteNode(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/25" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-xl">
            <AlertDialog.Title className="text-lg font-semibold">
              Eliminar «{deleteNode?.title}»
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {children
                ? `Sus ${children} subpaquete${children === 1 ? "" : "s"} subirán un nivel, conservando sus fechas, responsables y notas.`
                : "Este paquete no tiene hijos."}{" "}
              Solo se eliminarán este cuadro y sus propias notas.
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteNode)
                      void change({
                        method: "delete",
                        path: `${base}/packages/${deleteNode.id}`,
                      });
                  }}
                >
                  Eliminar paquete
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
