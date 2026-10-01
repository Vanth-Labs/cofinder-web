"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MessageSquare,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PACKAGE_STATES,
  deadlineLabel,
  Workspace,
  WorkPackage,
  WorkProject,
  WorkspaceMember,
} from "@/lib/workspace";

const selectClass = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
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
      className="flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (title.trim()) {
          const saved = await submit(title.trim());
          if (saved && !initial) setTitle("");
        }
      }}
    >
      <Input
        aria-label={label}
        placeholder={label}
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        className="min-w-32 flex-1"
        required
      />
      <Button type="submit" disabled={pending || !title.trim()}>
        {initial ? "Renombrar" : "Crear"}
      </Button>
    </form>
  );
}

function PackageEditor({
  node,
  project,
  members,
  pending,
  save,
}: {
  node: WorkPackage;
  project: WorkProject;
  members: WorkspaceMember[];
  pending: boolean;
  save: (data: unknown) => void;
}) {
  const [title, setTitle] = useState(node.title);
  const [leaderId, setLeaderId] = useState(node.leaderId ?? "");
  const [deadline, setDeadline] = useState(node.deadline?.slice(0, 10) ?? "");
  const [parentId, setParentId] = useState(node.parentId ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onChange={() => setSaved(false)}
      onSubmit={(e) => {
        e.preventDefault();
        // Send only changed fields so editing a title does not overwrite another owner's assignments.
        const data: Record<string, unknown> = {};
        if (title.trim() !== node.title) data.title = title.trim();
        if (leaderId !== (node.leaderId ?? ""))
          data.leaderId = leaderId || null;
        if (parentId !== (node.parentId ?? ""))
          data.parentId = parentId || null;
        if (node.isLeaf && deadline !== (node.deadline?.slice(0, 10) ?? ""))
          data.deadline = deadline || null;
        save(data);
        setSaved(true);
      }}
    >
      <label className="text-sm">
        Nombre del paquete
        <Input
          value={title}
          maxLength={200}
          required
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="text-sm">
        Jefe del paquete
        <select
          aria-label="Jefe del paquete"
          className={selectClass}
          value={leaderId}
          onChange={(e) => setLeaderId(e.target.value)}
        >
          <option value="">Sin asignar</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? "Miembro"}
            </option>
          ))}
          {node.leaderId && !members.some((m) => m.id === node.leaderId) && (
            <option value={node.leaderId}>Miembro que salió del equipo</option>
          )}
        </select>
      </label>
      {node.isLeaf ? (
        <label className="text-sm">
          Fecha límite
          <Input
            aria-label="Fecha límite"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            Solo las hojas tienen fecha manual. Puedes cambiarla o borrarla.
          </span>
        </label>
      ) : (
        <p className="text-sm">
          Fecha calculada:{" "}
          <strong>{deadlineLabel(node.effectiveDeadline)}</strong>
          <br />
          <span className="text-xs text-muted-foreground">
            La fecha más tardía de sus subpaquetes.
          </span>
        </p>
      )}
      <label className="text-sm">
        Ubicación
        <select
          aria-label="Ubicación del paquete"
          className={selectClass}
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">Primer nivel</option>
          {project.packages
            .filter(
              (p) =>
                p.id !== node.id && !p.number.startsWith(`${node.number}.`),
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.number} {p.title}
              </option>
            ))}
        </select>
      </label>
      <Button type="submit" disabled={pending || !title.trim()}>
        {pending && saved ? "Guardando..." : "Guardar cambios"}
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
  save: (content: string) => void;
  pending: boolean;
}) {
  const [draft, setDraft] = useState(content);
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(draft);
      }}
    >
      <label className="text-sm font-medium">
        {member.name ?? "Miembro"}{" "}
        {editable && <span className="text-muted-foreground">(tú)</span>}
        <Textarea
          aria-label={`Comentario de ${member.name ?? "Miembro"}`}
          value={editable ? draft : content}
          readOnly={!editable}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={20000}
          rows={3}
          placeholder={
            editable
              ? "Escribe tu avance, duda o comentario..."
              : "Sin comentarios todavía"
          }
          className="mt-2 whitespace-pre-wrap"
        />
      </label>
      {editable && (
        <Button
          type="submit"
          variant="outline"
          disabled={pending || draft === content}
        >
          Guardar mi comentario
        </Button>
      )}
    </form>
  );
}

export function WorkspaceView() {
  const ideaId = useParams().id as string;
  const { isAuthenticated } = useRequireAuth();
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const [showComments, setShowComments] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const treeRef = useRef<HTMLElement>(null);
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
  useEffect(() => {
    if (selected?.id && window.innerWidth < 1280)
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected?.id]);
  const base = `/workspace/${ideaId}/projects/${project?.id}`;
  const select = (projectId: string, packageId?: string) => {
    const search = new URLSearchParams({ project: projectId });
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
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setNotice("Guardado");
      if (change.selectCreated && result.id)
        select(
          change.path.endsWith("/projects") ? result.id : project!.id,
          change.path.endsWith("/packages") ? result.id : undefined,
        );
    },
  });
  const change = async (value: Change) => {
    setNotice("");
    try {
      await mutation.mutateAsync(value);
      return true;
    } catch {
      return false; // The shared error message keeps failed drafts available for retry.
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
        Cargando espacio de trabajo...
      </p>
    );
  if (!data || query.isError)
    return (
      <div className="mx-auto max-w-lg p-8 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">No pudimos abrir este espacio</h1>
        <p>
          El espacio es privado para los miembros activos de la idea. Comprueba
          tu conexión y tu membresía.
        </p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
        <Link href="/workspace" className="underline">
          Volver a mis espacios
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl p-4 py-6 flex flex-col gap-5">
      <nav
        aria-label="Ubicación"
        className="flex flex-wrap gap-2 text-sm text-muted-foreground"
      >
        <Link href="/workspace" className="hover:underline">
          Mis espacios
        </Link>
        <span>/</span>
        <Link href={`/ideas/${ideaId}`} className="hover:underline">
          {data.idea.title}
        </Link>
        <span>/ Espacio de trabajo</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.idea.title}</h1>
          <p className="text-sm text-muted-foreground">
            Organiza los proyectos de la idea en secciones, entregables y
            subentregables.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/chat/team/${ideaId}`}>Chat del equipo</Link>
        </Button>
      </header>
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Equipo · {data.members.length} personas ·{" "}
          {data.canEdit ? "Eres owner" : "Eres miembro"}
        </summary>
        <p className="my-3 text-xs text-muted-foreground">
          Los owners editan los proyectos y el EDT. Cada miembro escribe sus
          comentarios. Solo el owner original puede nombrar otros owners.
        </p>
        <div className="flex flex-wrap gap-3">
          {data.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm"
            >
              <span>
                {member.name ?? "Miembro"}
                <span className="block text-xs text-muted-foreground">
                  {member.id === data.idea.founderId
                    ? "Owner original"
                    : member.isOwner
                      ? "Owner"
                      : "Miembro"}
                </span>
              </span>
              {data.isOriginalOwner && member.id !== data.idea.founderId && (
                <Button
                  variant="outline"
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
      <section className="rounded-xl border p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Proyectos</h2>
          <p className="text-sm text-muted-foreground">
            Por ejemplo: desarrollo de software o campaña de lanzamiento.
          </p>
        </div>
        <nav aria-label="Proyectos de la idea" className="flex flex-wrap gap-2">
          {data.projects.map((p) => (
            <Button
              key={p.id}
              variant={p.id === project?.id ? "default" : "outline"}
              className="max-w-full whitespace-normal h-auto min-h-9 py-2 text-left"
              aria-current={p.id === project?.id ? "page" : undefined}
              onClick={() => select(p.id)}
            >
              {p.title}
            </Button>
          ))}
        </nav>
        {data.canEdit && (
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
        )}
        {!project && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay proyectos.{" "}
            {data.canEdit
              ? "Crea el primero para empezar su EDT."
              : "Un owner puede crear el primer proyecto."}
          </p>
        )}
      </section>
      {mutation.isError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-3 text-sm text-destructive"
        >
          {typeof error === "string"
            ? error
            : "No se pudo guardar. Revisa tu conexión o permisos y vuelve a intentarlo."}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {project && (
        <>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{project.title} · EDT</h2>
              <p className="text-sm text-muted-foreground">
                Selecciona un paquete para ver sus detalles. La numeración se
                actualiza sola.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowComments((value) => !value)}
              aria-expanded={showComments}
            >
              <MessageSquare size={16} />
              {showComments ? "Ocultar comentarios" : "Mostrar comentarios"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            El jefe inicia y termina su paquete. En progreso: naranja cuando
            faltan 3 días o menos; rojo después de la fecha límite (hora de
            Perú).
          </p>
          <div aria-label="Leyenda de estados" className="flex flex-wrap gap-2">
            {Object.entries(PACKAGE_STATES).map(([state, value]) => (
              <span
                key={state}
                className={`rounded-md border px-2 py-1 text-xs ${value.color}`}
              >
                {value.label}
              </span>
            ))}
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section
              aria-label="EDT"
              ref={treeRef}
              className="scroll-mt-20 min-w-0 rounded-xl border p-3 sm:p-4 flex flex-col gap-3"
            >
              {data.canEdit && (
                <TitleForm
                  label="Nueva sección del EDT"
                  pending={pending}
                  submit={(title) =>
                    change({
                      method: "post",
                      path: `${base}/packages`,
                      data: { title },
                      selectCreated: true,
                    })
                  }
                />
              )}
              {project.packages.length === 0 && (
                <p className="p-8 text-center text-muted-foreground">
                  El EDT está vacío.{" "}
                  {data.canEdit
                    ? "Crea una sección y añade sus entregables."
                    : "Un owner puede añadir secciones y entregables."}
                </p>
              )}
              {project.packages
                .filter(
                  (node) =>
                    !project.packages.some(
                      (parent) =>
                        collapsed.has(parent.id) &&
                        node.number.startsWith(`${parent.number}.`),
                    ),
                )
                .map((node) => {
                  const leader = data.members.find(
                    (m) => m.id === node.leaderId,
                  );
                  const depth = node.number.split(".").length - 1;
                  return (
                    <div
                      key={node.id}
                      className="flex items-stretch gap-1"
                      style={{ marginLeft: `${Math.min(depth, 5) * 12}px` }}
                    >
                      {!node.isLeaf && (
                        <button
                          className="shrink-0 px-1"
                          aria-label={`${collapsed.has(node.id) ? "Expandir" : "Contraer"} ${node.number}`}
                          aria-expanded={!collapsed.has(node.id)}
                          onClick={() =>
                            setCollapsed((previous) => {
                              const next = new Set(previous);
                              if (next.has(node.id)) next.delete(node.id);
                              else next.add(node.id);
                              return next;
                            })
                          }
                        >
                          {collapsed.has(node.id) ? (
                            <ChevronRight size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => select(project.id, node.id)}
                        aria-pressed={selected?.id === node.id}
                        className={`min-w-0 flex-1 rounded-lg border-l-4 border p-3 text-left transition-shadow hover:shadow-md ${PACKAGE_STATES[node.status].color} ${selected?.id === node.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      >
                        <span className="block font-medium break-words">
                          <span className="mr-2 text-muted-foreground">
                            {node.number}
                          </span>
                          {node.title}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          <span>{PACKAGE_STATES[node.status].label}</span>
                          <span>
                            Jefe:{" "}
                            {leader?.name ??
                              (node.leaderId
                                ? "Miembro anterior"
                                : "Sin asignar")}
                          </span>
                          <span>
                            {deadlineLabel(node.effectiveDeadline)}
                            {!node.isLeaf && " · calculada"}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
            </section>
            <aside
              ref={detailRef}
              className="scroll-mt-20 min-w-0 rounded-xl border p-4 flex flex-col gap-4"
              aria-label="Detalles del paquete"
            >
              {selected && (
                <Button
                  className="xl:hidden self-start"
                  variant="outline"
                  onClick={() =>
                    treeRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  ← Volver al EDT
                </Button>
              )}
              {!selected ? (
                <p className="text-sm text-muted-foreground">
                  Selecciona un cuadro del EDT para ver el responsable, la fecha
                  y los comentarios del equipo.
                </p>
              ) : (
                <>
                  <h3 className="font-semibold break-words">
                    {selected.number} {selected.title}
                  </h3>
                  <p className="text-sm">
                    {PACKAGE_STATES[selected.status].label}
                  </p>
                  {selected.leaderId === userId && (
                    <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
                      <p className="text-xs">
                        Eres jefe de este paquete. Solo tú puedes iniciarlo o
                        marcarlo como terminado.
                      </p>
                      {selected.progress !== "ON_TRACK" && (
                        <Button
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
                        <p className="text-xs">
                          Un owner debe asignar una fecha límite antes de
                          iniciarlo.
                        </p>
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
                  {data.canEdit ? (
                    <PackageEditor
                      key={`${selected.id}:${selected.updatedAt}`}
                      node={selected}
                      project={project}
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
                    <div className="text-sm flex flex-col gap-2">
                      <p>
                        Jefe:{" "}
                        {data.members.find((m) => m.id === selected.leaderId)
                          ?.name ?? "Sin asignar"}
                      </p>
                      <p>
                        Fecha límite:{" "}
                        {deadlineLabel(selected.effectiveDeadline)}
                        {!selected.isLeaf && " (calculada)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Solo los owners pueden editar este paquete.
                      </p>
                    </div>
                  )}
                  {data.canEdit && (
                    <div className="border-t pt-4 flex flex-col gap-3">
                      <p className="text-sm font-medium">
                        <Plus className="inline size-4" /> Añadir subentregable
                      </p>
                      <TitleForm
                        key={selected.id}
                        label="Nombre del subentregable"
                        pending={pending}
                        submit={(title) =>
                          change({
                            method: "post",
                            path: `${base}/packages`,
                            data: { title, parentId: selected.id },
                            selectCreated: true,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Al dividir una hoja con fecha, su primer subentregable
                        hereda esa fecha.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={pending || selected.position === 0}
                          onClick={() =>
                            change({
                              method: "patch",
                              path: `${base}/packages/${selected.id}`,
                              data: { position: selected.position - 1 },
                            })
                          }
                        >
                          <ArrowUp size={16} />
                          Subir
                        </Button>
                        <Button
                          variant="outline"
                          disabled={
                            pending ||
                            !project.packages.some(
                              (p) =>
                                p.parentId === selected.parentId &&
                                p.position > selected.position,
                            )
                          }
                          onClick={() =>
                            change({
                              method: "patch",
                              path: `${base}/packages/${selected.id}`,
                              data: { position: selected.position + 1 },
                            })
                          }
                        >
                          <ArrowDown size={16} />
                          Bajar
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={pending}
                          onClick={() => {
                            if (
                              confirm(
                                `¿Eliminar «${selected.title}», sus subentregables y comentarios?`,
                              )
                            )
                              change({
                                method: "delete",
                                path: `${base}/packages/${selected.id}`,
                              });
                          }}
                        >
                          Eliminar paquete
                        </Button>
                      </div>
                    </div>
                  )}
                  {showComments && (
                    <section
                      aria-label="Comentarios del equipo"
                      className="border-t pt-4 flex flex-col gap-3"
                    >
                      <h4 className="font-medium">Comentarios del equipo</h4>
                      <p className="text-xs text-muted-foreground">
                        Una caja por persona. Solo texto plano; cada miembro
                        edita su propia caja.
                      </p>
                      {data.members.map((member) => {
                        const note = selected.notes.find(
                          (n) => n.userId === member.id,
                        );
                        return (
                          <MemberNote
                            key={`${selected.id}:${member.id}`}
                            member={member}
                            content={note?.content ?? ""}
                            editable={member.id === userId}
                            pending={pending}
                            save={(content) =>
                              change({
                                method: "put",
                                path: `${base}/packages/${selected.id}/note`,
                                data: { content },
                              })
                            }
                          />
                        );
                      })}
                    </section>
                  )}
                </>
              )}
            </aside>
          </div>
          {data.canEdit && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm">
                Ajustes del proyecto
              </summary>
              <div className="mt-3 flex flex-col gap-3">
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
                  className="self-start"
                  disabled={pending}
                  onClick={() => {
                    if (
                      confirm(
                        `¿Eliminar el proyecto «${project.title}» y todo su EDT?`,
                      )
                    )
                      change({ method: "delete", path: base });
                  }}
                >
                  Eliminar proyecto
                </Button>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
