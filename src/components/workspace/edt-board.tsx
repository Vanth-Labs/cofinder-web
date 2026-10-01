"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Minus,
  Plus,
  Scan,
  X,
} from "lucide-react";
import {
  WorkPackage,
  WorkspaceMember,
  PACKAGE_STATES,
  deadlineLabel,
} from "@/lib/workspace";
import {
  DropZone,
  layoutMap,
  moveTo,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "@/lib/edt";

interface BoardProps {
  title: string;
  packages: WorkPackage[];
  members: WorkspaceMember[];
  mode: "map" | "outline";
  selectedId?: string;
  editingId?: string;
  canEdit: boolean;
  pending: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onAdd: (parentId: string | null) => void;
  onDelete: (node: WorkPackage) => void;
  onMove: (
    id: string,
    data: { parentId: string | null; position: number },
  ) => void;
}
interface Drop {
  id: string | null;
  zone: DropZone;
}
interface Drag {
  id: string;
  x: number;
  y: number;
  target: Drop | null;
}

function NodeTitle({
  node,
  editable,
  onSelect,
  rename,
  autoEdit = false,
}: {
  node: WorkPackage;
  editable: boolean;
  onSelect: () => void;
  rename: (title: string) => Promise<boolean>;
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(node.title);
  const committing = useRef(false);
  async function commit() {
    if (committing.current) return;
    if (!draft.trim()) {
      setDraft(node.title);
      setEditing(false);
      return;
    }
    committing.current = true;
    const saved = draft.trim() === node.title || (await rename(draft.trim()));
    committing.current = false;
    if (saved) setEditing(false);
  }
  if (editing)
    return (
      <input
        autoFocus
        aria-label={`Nombre del paquete ${node.number}`}
        data-title-editor="true"
        className="edt-title-input"
        value={draft}
        maxLength={200}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            void commit();
          }
          if (event.key === "Escape") {
            setEditing(false);
            setDraft(node.title);
          }
        }}
        onClick={(event) => event.stopPropagation()}
      />
    );
  return (
    <button
      className="edt-node-title"
      aria-label={`${editable ? "Editar nombre de" : "Seleccionar"} ${node.title}`}
      title={editable ? "Click para editar el nombre" : node.title}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
        if (editable) {
          setDraft(node.title);
          setEditing(true);
        }
      }}
    >
      {node.title}
    </button>
  );
}

function PackageNode({
  node,
  members,
  selected,
  canEdit,
  pending,
  outline = false,
  collapsed,
  toggle,
  onSelect,
  onRename,
  onAdd,
  onDelete,
  dragHandlers,
  drop,
  autoEdit,
}: {
  node: WorkPackage;
  members: WorkspaceMember[];
  selected: boolean;
  canEdit: boolean;
  pending: boolean;
  outline?: boolean;
  collapsed: boolean;
  toggle: () => void;
  onSelect: () => void;
  onRename: (title: string) => Promise<boolean>;
  onAdd: () => void;
  onDelete: () => void;
  dragHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerCancel: () => void;
  };
  drop?: DropZone;
  autoEdit?: boolean;
}) {
  const state = PACKAGE_STATES[node.status];
  const leader = members.find((member) => member.id === node.leaderId);
  return (
    <article
      data-package-id={node.id}
      data-drop-node={node.id}
      data-testid="edt-node"
      data-number={node.number}
      data-depth={node.number.split(".").length - 1}
      className={`edt-node ${state.color} ${outline ? "edt-node-outline" : ""} ${selected ? "is-selected" : ""} ${drop ? `drop-${drop}` : ""}`}
      tabIndex={0}
      aria-label={`Paquete ${node.number} ${node.title}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter") {
          event.preventDefault();
          onSelect();
        }
        if (event.key === "Tab" && canEdit && !event.shiftKey) {
          event.preventDefault();
          onAdd();
        }
        if (event.key === "Delete" && canEdit) {
          event.preventDefault();
          onDelete();
        }
      }}
    >
      <div className="edt-node-top">
        <span className="edt-number">{node.number}</span>
        <span className="edt-state" title={state.label}>
          <i />
          {state.short}
        </span>
      </div>
      <div className="edt-name-row">
        <span className="edt-fold-slot">
          {!node.isLeaf && (
            <button
              aria-label={`${collapsed ? "Expandir" : "Contraer"} ${node.number}`}
              aria-expanded={!collapsed}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
            >
              {collapsed ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          )}
        </span>
        <NodeTitle
          key={`${node.id}:${autoEdit ? "new" : "normal"}`}
          autoEdit={autoEdit}
          node={node}
          editable={canEdit && !pending}
          onSelect={onSelect}
          rename={onRename}
        />
      </div>
      <div className="edt-node-footer">
        <span className="edt-leader" title={leader?.name ?? "Sin jefe"}>
          {leader?.name ?? (node.leaderId ? "Miembro anterior" : "Sin jefe")}
        </span>
        <time
          className="edt-due"
          dateTime={node.effectiveDeadline ?? undefined}
          title={`${deadlineLabel(node.effectiveDeadline)} · Hora de Perú${!node.isLeaf ? " · calculada" : ""}`}
        >
          {deadlineLabel(node.effectiveDeadline)}
        </time>
      </div>
      {canEdit && (
        <div
          className="edt-node-actions"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            aria-label={`Arrastrar ${node.title}`}
            title="Arrastrar para mover"
            className="edt-drag-handle"
            disabled={pending}
            {...dragHandlers}
          >
            <GripVertical size={15} />
          </button>
          <button
            aria-label={`Añadir subpaquete a ${node.title}`}
            title="Añadir un nivel debajo"
            disabled={pending}
            onClick={onAdd}
          >
            <ArrowDown size={15} />
          </button>
          <button
            aria-label={`Eliminar ${node.title}`}
            title="Eliminar y subir sus hijos un nivel"
            disabled={pending}
            onClick={onDelete}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </article>
  );
}

export function EdtBoard(props: BoardProps) {
  const { packages, mode } = props;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragging = useRef<{
    id: string;
    startX: number;
    startY: number;
    active: boolean;
    target: Drop | null;
  } | null>(null);
  const graph = useMemo(
    () => layoutMap(packages, collapsed),
    [packages, collapsed],
  );
  const viewport = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState({ x: 30, y: 30, scale: 1 });
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  const pan = useRef<{
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const initialFit = useRef(false);
  const fit = () => {
    const box = viewport.current?.getBoundingClientRect();
    if (!box?.width) return;
    const scale = Math.max(
      0.15,
      Math.min(
        1,
        (box.width - 80) / graph.width,
        (box.height - 80) / graph.height,
      ),
    );
    setCamera({
      x: (box.width - graph.width * scale) / 2,
      y: Math.max(40, (box.height - graph.height * scale) / 2),
      scale,
    });
  };
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      if (!initialFit.current && box.width > 0 && graph.placements.length) {
        initialFit.current = true;
        const scale = Math.max(
          0.15,
          Math.min(
            1,
            (box.width - 80) / graph.width,
            (box.height - 80) / graph.height,
          ),
        );
        setCamera({ x: (box.width - graph.width * scale) / 2, y: 40, scale });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [graph.width, graph.height, graph.placements.length]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const box = element.getBoundingClientRect();
        const current = cameraRef.current;
        const scale = Math.max(
          0.15,
          Math.min(2, current.scale * Math.exp(-event.deltaY * 0.002)),
        );
        const px = event.clientX - box.left,
          py = event.clientY - box.top;
        setCamera({
          scale,
          x: px - ((px - current.x) * scale) / current.scale,
          y: py - ((py - current.y) * scale) / current.scale,
        });
      } else
        setCamera((current) => ({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        }));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  const zoom = (factor: number) => {
    const box = viewport.current?.getBoundingClientRect();
    if (!box) return;
    setCamera((current) => {
      const scale = Math.max(0.02, Math.min(2, current.scale * factor));
      return {
        scale,
        x:
          box.width / 2 - ((box.width / 2 - current.x) * scale) / current.scale,
        y:
          box.height / 2 -
          ((box.height / 2 - current.y) * scale) / current.scale,
      };
    });
  };
  const targetAt = (x: number, y: number, id: string): Drop | null => {
    const element = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-drop-node]");
    if (!element) return null;
    const targetId =
      element.dataset.dropNode === "root" ? null : element.dataset.dropNode!;
    const rect = element.getBoundingClientRect();
    const ratio = (y - rect.top) / rect.height;
    const zone: DropZone =
      targetId === null
        ? "inside"
        : ratio < 0.22
          ? "before"
          : ratio > 0.78
            ? "after"
            : "inside";
    return moveTo(packages, id, targetId, zone) ? { id: targetId, zone } : null;
  };
  const handlers = (id: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (props.pending || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragging.current = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        target: null,
      };
    },
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
      const current = dragging.current;
      if (!current) return;
      if (
        Math.hypot(
          event.clientX - current.startX,
          event.clientY - current.startY,
        ) > 5
      )
        current.active = true;
      if (!current.active) return;
      current.target = targetAt(event.clientX, event.clientY, id);
      setDrag({
        id,
        x: event.clientX,
        y: event.clientY,
        target: current.target,
      });
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      const current = dragging.current;
      if (current?.active && current.target) {
        const data = moveTo(
          packages,
          id,
          current.target.id,
          current.target.zone,
        );
        if (data) {
          props.onMove(id, data);
          if (data.parentId)
            setCollapsed((previous) => {
              const next = new Set(previous);
              next.delete(data.parentId!);
              return next;
            });
        }
      }
      dragging.current = null;
      setDrag(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: () => {
      dragging.current = null;
      setDrag(null);
    },
  });
  const renderNode = (node: WorkPackage, outline = false) => (
    <PackageNode
      key={node.id}
      node={node}
      members={props.members}
      selected={props.selectedId === node.id}
      canEdit={props.canEdit}
      pending={props.pending}
      outline={outline}
      autoEdit={
        props.editingId === node.id &&
        (outline ? mode === "outline" : mode === "map")
      }
      collapsed={collapsed.has(node.id)}
      toggle={() =>
        setCollapsed((previous) => {
          const next = new Set(previous);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          return next;
        })
      }
      onSelect={() => props.onSelect(node.id)}
      onRename={(title) => props.onRename(node.id, title)}
      onAdd={() => {
        setCollapsed((previous) => {
          const next = new Set(previous);
          next.delete(node.id);
          return next;
        });
        props.onAdd(node.id);
      }}
      onDelete={() => props.onDelete(node)}
      dragHandlers={handlers(node.id)}
      drop={drag?.target?.id === node.id ? drag.target.zone : undefined}
    />
  );
  const placements = new Map(graph.placements.map((p) => [p.node.id, p]));
  return (
    <div className="edt-board" aria-label="EDT">
      <div className="edt-board-note">
        <span>
          {props.canEdit
            ? "Click en un nombre para editar · Arrastra desde ⋮⋮ para mover"
            : "Selecciona un paquete para ver sus detalles"}
        </span>
        {props.canEdit && (
          <button onClick={() => props.onAdd(null)} disabled={props.pending}>
            <Plus size={14} />
            Sección
          </button>
        )}
      </div>
      <div
        className={mode === "map" ? "edt-map" : "edt-map is-hidden"}
        ref={viewport}
        aria-label="Canvas navegable del EDT"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const delta = 40;
          if (event.key.startsWith("Arrow")) {
            event.preventDefault();
            setCamera((current) => ({
              ...current,
              x:
                current.x +
                (event.key === "ArrowLeft"
                  ? delta
                  : event.key === "ArrowRight"
                    ? -delta
                    : 0),
              y:
                current.y +
                (event.key === "ArrowUp"
                  ? delta
                  : event.key === "ArrowDown"
                    ? -delta
                    : 0),
            }));
          }
        }}
        onPointerDown={(event) => {
          if (
            event.button !== 0 ||
            (event.target as HTMLElement).closest(
              ".edt-node,.edt-map-controls,button",
            )
          )
            return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pan.current = {
            startX: event.clientX,
            startY: event.clientY,
            x: camera.x,
            y: camera.y,
          };
        }}
        onPointerMove={(event) => {
          if (!pan.current) return;
          setCamera((current) => ({
            ...current,
            x: pan.current!.x + event.clientX - pan.current!.startX,
            y: pan.current!.y + event.clientY - pan.current!.startY,
          }));
        }}
        onPointerUp={() => {
          pan.current = null;
        }}
        onPointerCancel={() => {
          pan.current = null;
        }}
      >
        <div
          className="edt-map-stage"
          data-testid="map-stage"
          style={{
            width: graph.width,
            height: graph.height,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          }}
        >
          <svg
            width={graph.width}
            height={graph.height}
            className="edt-connectors"
            aria-hidden="true"
          >
            {graph.placements.map((placement) => {
              const parent = placement.node.parentId
                ? placements.get(placement.node.parentId)
                : undefined;
              const sx = parent ? parent.x + NODE_WIDTH / 2 : graph.width / 2;
              const sy = parent ? parent.y + NODE_HEIGHT : 48;
              const ex = placement.x + NODE_WIDTH / 2,
                ey = placement.y;
              return (
                <path
                  key={placement.node.id}
                  d={`M ${sx} ${sy} V ${sy + (ey - sy) / 2} H ${ex} V ${ey}`}
                />
              );
            })}
          </svg>
          <div
            className={`edt-map-root ${drag?.target?.id === null ? "is-drop" : ""}`}
            data-drop-node="root"
            style={{ left: graph.width / 2 - 120 }}
          >
            {props.title}
          </div>
          {graph.placements.map((placement) => (
            <div
              key={placement.node.id}
              className="edt-map-position"
              style={{
                left: placement.x,
                top: placement.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
            >
              {renderNode(placement.node)}
            </div>
          ))}
        </div>
        {!packages.length && (
          <div className="edt-empty">
            <span>Tu proyecto empieza aquí</span>
            <p>Añade una sección y desglosa sus entregables.</p>
            {props.canEdit && (
              <button onClick={() => props.onAdd(null)}>
                <Plus size={16} />
                Crear primera sección
              </button>
            )}
          </div>
        )}
        <div className="edt-map-controls">
          <button aria-label="Alejar mapa" onClick={() => zoom(1 / 1.2)}>
            <Minus size={16} />
          </button>
          <output aria-label="Zoom del mapa">
            {Math.round(camera.scale * 100)}%
          </output>
          <button aria-label="Acercar mapa" onClick={() => zoom(1.2)}>
            <Plus size={16} />
          </button>
          <button aria-label="Ajustar mapa a pantalla" onClick={fit}>
            <Scan size={17} />
          </button>
        </div>
        <span className="edt-map-hint">
          Arrastra el fondo · Ctrl + rueda para zoom
        </span>
      </div>
      {mode === "outline" && (
        <div className="edt-outline" aria-label="Outline del EDT">
          <div
            className={`edt-outline-root ${drag?.target?.id === null ? "is-drop" : ""}`}
            data-drop-node="root"
          >
            {props.title}
            <span>Primer nivel</span>
          </div>
          {packages
            .filter(
              (node) =>
                !packages.some(
                  (parent) =>
                    collapsed.has(parent.id) &&
                    node.number.startsWith(`${parent.number}.`),
                ),
            )
            .map((node) => (
              <div
                key={node.id}
                className="edt-outline-row"
                style={{
                  paddingLeft: (node.number.split(".").length - 1) * 28,
                  minWidth: 360 + (node.number.split(".").length - 1) * 28,
                }}
              >
                {renderNode(node, true)}
              </div>
            ))}
          {!packages.length && (
            <p className="edt-outline-empty">
              Añade la primera sección para empezar.
            </p>
          )}
        </div>
      )}
      {drag && (
        <div
          className="edt-drag-preview"
          style={{ left: drag.x + 14, top: drag.y + 14 }}
          aria-live="polite"
        >
          {packages.find((n) => n.id === drag.id)?.title}
          <small>
            {drag.target
              ? drag.target.id === null
                ? "Mover al primer nivel"
                : drag.target.zone === "inside"
                  ? "Mover dentro del paquete"
                  : drag.target.zone === "before"
                    ? "Insertar antes"
                    : "Insertar después"
              : "Arrastra sobre un paquete"}
          </small>
        </div>
      )}
    </div>
  );
}
