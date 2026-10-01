export const PACKAGE_STATES = {
  NOT_STARTED: {
    label: "Sin iniciar",
    short: "Sin iniciar",
    color: "edt-idle",
  },
  ON_TRACK: { label: "En camino", short: "En camino", color: "edt-on-track" },
  AT_RISK: {
    label: "Posiblemente retrasado",
    short: "Vence pronto",
    color: "edt-at-risk",
  },
  DELAYED: { label: "Muy retrasado", short: "Vencido", color: "edt-delayed" },
  DONE: { label: "Terminado", short: "Terminado", color: "edt-done" },
} as const;
export type PackageState = keyof typeof PACKAGE_STATES;
export interface WorkspaceMember {
  id: string;
  name: string | null;
  avatar: string | null;
  isOwner: boolean;
}
export interface WorkPackage {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  progress: "NOT_STARTED" | "ON_TRACK" | "DONE";
  status: PackageState;
  leaderId: string | null;
  deadline: string | null;
  effectiveDeadline: string | null;
  number: string;
  isLeaf: boolean;
  updatedAt: string;
  notes: { userId: string; content: string; updatedAt: string }[];
}
export interface WorkProject {
  id: string;
  title: string;
  packages: WorkPackage[];
}
export interface Workspace {
  idea: { id: string; title: string; founderId: string };
  canEdit: boolean;
  isOriginalOwner: boolean;
  members: WorkspaceMember[];
  projects: WorkProject[];
}
export function deadlineLabel(date: string | null) {
  return date
    ? new Date(
        date.length === 10 ? `${date}T23:59:59-05:00` : date,
      ).toLocaleString("es-PE", {
        timeZone: "America/Lima",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "Sin fecha";
}
/** Date/time controls use Peru time, independent of the viewer's timezone. */
export function deadlineInput(date: string | null) {
  return date
    ? new Date(new Date(date).getTime() - 5 * 3600000)
        .toISOString()
        .slice(0, 16)
    : "";
}
export function deadlineInstant(value: string) {
  return value ? new Date(`${value}:00-05:00`).toISOString() : null;
}
