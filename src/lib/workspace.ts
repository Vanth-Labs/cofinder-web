export const PACKAGE_STATES = {
  NOT_STARTED: { label: "No empezado", color: "bg-background border-border" },
  ON_TRACK: {
    label: "En camino",
    color: "bg-green-50 border-green-500 dark:bg-green-950",
  },
  AT_RISK: {
    label: "Posiblemente retrasado",
    color: "bg-orange-50 border-orange-500 dark:bg-orange-950",
  },
  DELAYED: {
    label: "Muy retrasado",
    color: "bg-red-50 border-red-500 dark:bg-red-950",
  },
  DONE: {
    label: "Terminado",
    color: "bg-blue-50 border-blue-500 dark:bg-blue-950",
  },
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
    ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-PE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sin fecha";
}
