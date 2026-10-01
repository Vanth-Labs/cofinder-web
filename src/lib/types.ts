// Tipos compartidos de la API. Mantener en sync con cofinder-api (prisma/schema.prisma).

/** Identidad, no permisos. Quién modera no se publica: ver isAdmin en la
 *  sesión propia (auth.store). */
export type UserRole = 'STUDENT' | 'ALUMNI';
export type ProjectStage = 'IDEA' | 'PROTOTYPE' | 'MVP' | 'REVENUE';
export type BudgetCurrency = 'USD' | 'PEN';
export type MembershipStatus = 'PENDING' | 'INVITED' | 'ACTIVE' | 'REJECTED' | 'LEFT';

export type NotificationType =
  | 'NEW_MATCH'
  | 'NEW_APPLICATION'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'TEAM_INVITE'
  | 'INVITE_ACCEPTED'
  | 'INVITE_DECLINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'NEW_COMMENT'
  | 'EVENT_REGISTRATION'
  | 'SKILL_ENDORSED'
  | 'MEETING_SCHEDULED'
  | 'PACKAGE_ASSIGNED'
  | 'PACKAGE_DEADLINE_CHANGED';

export type ReportTargetType = 'PROJECT' | 'POST' | 'COMMENT' | 'USER' | 'EVENT';

export interface Badge {
  id: string;
  label: string;
  description: string;
}

export type EndorsementSummary = Record<string, { count: number; endorsedByMe: boolean }>;

export type EventType = 'HACKATHON' | 'FERIA' | 'DEMO_DAY' | 'WORKSHOP' | 'MEETUP' | 'OTRO';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  HACKATHON: 'Hackathon',
  FERIA: 'Feria',
  DEMO_DAY: 'Demo Day',
  WORKSHOP: 'Taller',
  MEETUP: 'Meetup',
  OTRO: 'Otro',
};

export interface UserSummary {
  id: string;
  name: string | null;
  avatar: string | null;
  career?: string | null;
  faculty?: string | null;
  skills?: string[];
  bio?: string | null;
}

export interface DirectoryUser extends UserSummary {
  role: UserRole;
  lookingFor: string[];
  skills: string[];
  _count: { projects: number; teamMembers: number };
}

export interface PublicProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: UserRole;
  bio: string | null;
  career: string | null;
  faculty: string | null;
  yearJoined: number | null;
  skills: string[];
  lookingFor: string[];
  projects: { id: string; title: string; stage: ProjectStage; categories: string[] }[];
  teamMembers: {
    id: string;
    role: string;
    joinedAt: string;
    project: {
      id: string;
      title: string;
      stage: ProjectStage;
      founder: { id: string; name: string | null };
    };
  }[];
  badges: Badge[];
  endorsements: EndorsementSummary;
  canEndorse: boolean;
}

/**
 * Imagen de la galería de una idea o adjunta a un post. La portada NO va
 * acá: es `Project.coverKey`. Guardamos la key; la URL la arma mediaUrl().
 */
export interface MediaAsset {
  id: string;
  key: string;
  type: 'IMAGE' | 'VIDEO';
  width: number | null;
  height: number | null;
  order: number;
}

export interface RoleOpening {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  projectId: string;
  _count?: { applications: number };
}

export interface Project {
  id: string;
  title: string;
  description: string;
  stage: ProjectStage;
  categories: string[];
  budget: number | null;
  budgetCurrency: BudgetCurrency | null;
  /** Key del objeto en el storage. La URL se arma con mediaUrl()/thumbUrl(). */
  coverKey?: string | null;
  /** Galería: fotos extra que se ven en el detalle y al expandir la card. */
  media?: MediaAsset[];
  openings: RoleOpening[];
  founderId: string;
  createdAt: string;
  founder: UserSummary;
  teamMembers: { id?: string; role: string; user?: UserSummary }[];
  _count?: { teamMembers: number; matches: number };
}

export interface Membership {
  id: string;
  role: string;
  status: MembershipStatus;
  initiatedBy: 'USER' | 'FOUNDER';
  message: string | null;
  joinedAt: string;
  leftAt: string | null;
  userId: string;
  projectId: string;
  user?: UserSummary;
  project?: {
    id: string;
    title: string;
    stage: ProjectStage;
    categories?: string[];
    founderId: string;
    founder?: UserSummary;
  };
}

export interface LastMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string | null };
}

export interface Match {
  id: string;
  userId: string;
  projectId: string;
  createdAt: string;
  user?: UserSummary;
  project: {
    id: string;
    title: string;
    categories: string[];
    stage: ProjectStage;
    founderId?: string;
    founder?: UserSummary;
  };
  chat: {
    id: string;
    messages?: LastMessage[];
    _count?: { messages: number };
  } | null;
}

export interface Message {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string | null; avatar?: string | null };
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  data: {
    ideaId?: string;
    workspaceProjectId?: string;
    packageId?: string;
    packageTitle?: string;
    deadline?: string | null;
    projectId?: string;
    projectTitle?: string;
    actorId?: string;
    actorName?: string | null;
    membershipId?: string;
    matchId?: string;
    role?: string;
    postId?: string;
    preview?: string;
    eventId?: string;
    eventTitle?: string;
    meetingId?: string;
    meetingTitle?: string;
    startsAt?: string;
    skill?: string;
  };
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  location: string | null;
  url: string | null;
  startsAt: string;
  endsAt: string | null;
  organizerId: string;
  organizer: UserSummary & { role?: UserRole };
  registeredByMe: boolean;
  _count?: { registrations: number };
  registrations?: {
    id: string;
    userId: string;
    user: UserSummary;
    project: { id: string; title: string; stage: ProjectStage } | null;
  }[];
}

// ─── Reuniones de equipo ──────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  notes: string | null;
  projectId: string;
  createdById: string | null;
  createdBy: (UserSummary & { role?: UserRole }) | null;
  createdAt: string;
}

export function formatEventDate(startsAt: string, endsAt?: string | null) {
  const start = new Date(startsAt);
  const dateStr = start.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = start.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (!endsAt) return `${dateStr} · ${timeStr}`;
  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${dateStr} · ${timeStr}–${end.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${dateStr} → ${end.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`;
}

// ─── Feed comunitario ─────────────────────────────────────────────────────────

export interface Post {
  id: string;
  content: string;
  createdAt: string;
  media?: MediaAsset[];
  author: UserSummary;
  project: { id: string; title: string; stage: ProjectStage } | null;
  likedByMe: boolean;
  _count: { likes: number; comments: number };
}

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  author: UserSummary;
}

export interface SearchResults {
  projects: {
    id: string;
    title: string;
    stage: ProjectStage;
    categories: string[];
    founder: { name: string | null };
  }[];
  users: { id: string; name: string | null; avatar: string | null; career: string | null }[];
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export const STAGES: ProjectStage[] = ['IDEA', 'PROTOTYPE', 'MVP', 'REVENUE'];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  IDEA: 'Idea',
  PROTOTYPE: 'Prototipo',
  MVP: 'MVP',
  REVENUE: 'Con ingresos',
};

export const PRESET_CATEGORIES = [
  'AI', 'Fintech', 'EdTech', 'HealthTech', 'E-commerce',
  'SaaS', 'Gaming', 'Social', 'Sostenibilidad', 'Logística',
  'Real Estate', 'Agro', 'Seguridad', 'IoT', 'Entretenimiento',
];

export const ROLES_OPTIONS = [
  'Backend Developer', 'Frontend Developer', 'Mobile Developer',
  'Designer', 'Product Manager', 'Marketing', 'Sales',
  'Data Scientist', 'DevOps', 'Finance', 'Legal',
];

export function formatBudget(budget: number, currency: BudgetCurrency | null) {
  const symbol = currency === 'PEN' ? 'S/' : '$';
  return `${symbol}${budget.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
