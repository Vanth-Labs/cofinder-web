# cofinder-web

Frontend de **CoFinder by VanthLabs** — la plataforma tipo Tinder para encontrar cofounders en la comunidad PUCP. Construido con Next.js 16 App Router.

Dominio de producción previsto: [cofinder.vanthlabs.org](https://cofinder.vanthlabs.org).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS v4 |
| Componentes | shadcn/ui (Radix + Nova preset) |
| Animaciones | Framer Motion |
| Estado servidor | TanStack Query v5 |
| Estado cliente | Zustand v5 (con `persist`) |
| HTTP | Axios |
| Package manager | pnpm 9 |

---

## Requisitos

- Node.js 20+
- pnpm 9+
- Backend `cofinder-api` corriendo en `http://localhost:3000`

---

## Instalación

```bash
pnpm install
```

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Desarrollo

```bash
pnpm dev
```

La app corre en `http://localhost:3001` (el puerto 3000 lo ocupa el backend en Docker).

---

## Estructura

```
src/
├── app/
│   ├── layout.tsx                  # Layout raíz con QueryProvider
│   ├── page.tsx                    # Home — redirige a /projects si hay sesión
│   ├── auth/
│   │   ├── callback/page.tsx       # Recibe token OAuth, hidrata el store
│   │   └── onboarding/page.tsx     # Completar perfil tras primer login
│   ├── profile/
│   │   ├── page.tsx                # Perfil propio (con proyectos y membresías)
│   │   └── edit/page.tsx           # Editar perfil
│   ├── feed/page.tsx               # Feed comunitario (posts, likes, comentarios)
│   ├── projects/
│   │   ├── page.tsx                # Explorar (grid + filtros + orden Para ti/Recientes)
│   │   ├── [id]/page.tsx           # Detalle: equipo, postular a convocatoria, solicitudes
│   │   ├── new/page.tsx            # Publicar proyecto (con convocatorias)
│   │   └── mine/page.tsx           # Mis proyectos (editar, gestionar convocatorias)
│   ├── events/
│   │   ├── page.tsx                # Eventos próximos y pasados
│   │   ├── new/page.tsx            # Publicar evento
│   │   └── [id]/page.tsx           # Detalle, inscripción (solo o con equipo), inscritos
│   ├── swipe/page.tsx              # Descubrir proyectos (ordenado por afinidad)
│   ├── people/page.tsx             # Directorio de personas (búsqueda por skills/carrera)
│   ├── users/[id]/page.tsx         # Perfil público + invitar a mi proyecto
│   ├── applications/page.tsx       # Mis postulaciones, invitaciones y equipos
│   ├── matches/page.tsx            # Matches (mis intereses / interesados en mis proyectos)
│   └── chat/
│       ├── [matchId]/page.tsx      # Chat 1:1 del match
│       └── team/[projectId]/page.tsx  # Chat grupal del equipo
├── components/
│   ├── auth/login-button.tsx       # Botón "Continuar con Google"
│   ├── chat/chat-room.tsx          # Sala reutilizable: typing, visto, socket
│   ├── layout/
│   │   ├── nav.tsx                 # Navegación + búsqueda global + campana
│   │   ├── global-search.tsx       # GET /search con debounce y dropdown
│   │   ├── pwa-register.tsx        # Registra el service worker (public/sw.js)
│   │   └── query-provider.tsx      # TanStack Query client provider
│   ├── notifications/notification-bell.tsx  # Socket realtime + polling fallback
│   ├── push/push-toggle.tsx        # Activar/desactivar push de este dispositivo
│   ├── onboarding/onboarding-form.tsx
│   ├── profile/                    # Vista y edición del perfil propio
│   ├── projects/project-card.tsx   # Card de proyecto para el grid
│   ├── team/invite-button.tsx      # Invitar a un usuario a mis proyectos
│   └── ui/                         # Componentes shadcn/ui
├── hooks/
│   ├── use-me.ts                   # Query del usuario autenticado (/users/me)
│   └── use-require-auth.ts         # Redirige a / si no hay sesión
├── lib/
│   ├── api.ts                      # Instancia de axios con interceptor de JWT
│   ├── types.ts                    # Tipos compartidos de la API + constantes
│   └── careers.ts                  # Carreras y facultades PUCP
└── store/
    └── auth.store.ts               # Zustand store con persist (token + user)
```

---

## Flujo de autenticación

```
/ (home)
  └─ clic "Continuar con Google"
       └─ GET http://localhost:3000/auth/google
            └─ redirect → Google OAuth consent
                 └─ GET http://localhost:3000/auth/google/callback?code=...
                      └─ backend intercambia código, firma JWT
                           └─ redirect → /auth/callback?token=...
                                └─ guarda token en Zustand (persist → localStorage)
                                     ├─ si primer login → /auth/onboarding
                                     └─ si ya tiene perfil → /profile
```

El token se persiste en `localStorage` bajo la key `auth-storage` (Zustand persist). Al refrescar, el store se rehidrata automáticamente y el home redirige a `/profile` si hay sesión activa.

---

## User Stories implementadas

| US | Descripción | Ruta |
|----|-------------|------|
| US-01 | Pantalla de login con Google | `/` |
| US-02 | Callback OAuth, guarda token | `/auth/callback` |
| US-03 | Onboarding (primer perfil) | `/auth/onboarding` |
| US-04 | Ver perfil propio (proyectos + membresías) | `/profile` |
| US-05 | Editar perfil | `/profile/edit` |
| US-06 | Publicar y administrar mis proyectos | `/projects/new`, `/projects/mine` |
| US-07 | Explorar proyectos con filtros y búsqueda | `/projects` |
| US-08 | Descubrir proyectos estilo swipe | `/swipe` |
| US-09 | Ver detalle de proyecto y postular a un rol | `/projects/[id]` |
| US-10 | Gestionar postulaciones como founder (aceptar/rechazar) | `/projects/[id]` |
| US-11 | Mis postulaciones, invitaciones y equipos | `/applications` |
| US-12 | Directorio de personas e invitación a proyectos | `/people`, `/users/[id]` |
| US-13 | Matches con no-leídos, propios y entrantes | `/matches` |
| US-14 | Chat en tiempo real con founder/interesado | `/chat/[matchId]` |
| US-15 | Notificaciones in-app en tiempo real (socket + campana) | global |
| US-16 | Feed comunitario: publicar, likes, comentarios | `/feed` |
| US-17 | Convocatorias por rol: crear, abrir/cerrar, postular | `/projects/*` |
| US-18 | Chat grupal del equipo del proyecto | `/chat/team/[projectId]` |
| US-19 | Búsqueda global de proyectos y personas | nav |
| US-20 | Feed ordenado por afinidad ("Para ti") | `/projects`, `/swipe` |
| US-21 | Typing indicator y confirmación de lectura | chats |
| US-22 | Preferencias de email (avisos + resumen semanal) | `/profile/edit` |
| US-23 | Panel de administración: métricas y moderación | `/admin` (solo ADMIN) |
| US-24 | Landing con vitrina pública de proyectos y eventos | `/` (sin login) |
| US-25 | Eventos: publicar, explorar e inscribirse (solo o con equipo) | `/events`, `/events/new`, `/events/[id]` |
| US-26 | Badges de reputación calculados del historial | perfiles |
| US-27 | Endorsements de skills entre compañeros de equipo | `/users/[id]` |
| US-28 | Reportar contenido + bandeja de moderación | toda la UI / `/admin` |
| US-29 | PWA instalable + notificaciones push por dispositivo | global / `/profile/edit` |
| US-30 | Funnel de conversión en el panel admin | `/admin` |

> El modelo de producto (híbrido: chat inmediato + membresía aprobada por el
> founder) y las fases siguientes están documentados en `../ROADMAP.md`.

---

## Comandos útiles

```bash
pnpm dev          # Servidor de desarrollo
pnpm build        # Build de producción
pnpm lint         # Lint con ESLint
```

### Agregar componentes shadcn

```bash
pnpm dlx shadcn@latest add <componente>
```

---

## Convenciones

- Todos los componentes con estado o hooks van con `'use client'` al inicio.
- El token **nunca** se lee de `localStorage` directamente en la app — siempre via `useAuthStore.getState().token`.
- Las llamadas al API van a través de `@/lib/api` (axios con interceptor de JWT automático), nunca con `fetch` directamente.
- Los componentes de página (`app/**/page.tsx`) son Server Components por defecto; solo agregar `'use client'` si el componente necesita estado o efectos.

---

## Deploy

El frontend se despliega en **Vercel** y la API en **Render**. El repositorio del
frontend es `Vanth-Labs/cofinder-web`; la API está en `Vanth-Labs/cofinder-api`.
`NEXT_PUBLIC_API_URL` debe seguir apuntando a la URL HTTPS de la API en Render.

Para activar `https://cofinder.vanthlabs.org`:

1. Comprobar que Vercel y Render tengan acceso a los repositorios en `Vanth-Labs`
   y que sus proyectos sigan conectados a la rama `main` tras el traslado.
2. Añadir `cofinder.vanthlabs.org` en los dominios del proyecto existente de
   Vercel. Crear en el proveedor DNS el CNAME `cofinder` con el destino exacto
   que indique Vercel y verificar el certificado HTTPS.
3. En el bucket R2 `cofinder-media`, añadir `https://cofinder.vanthlabs.org` a
   los orígenes CORS permitidos para las subidas `PUT`, conservando los orígenes,
   métodos y cabeceras existentes. Cambiar el dominio de la web no requiere
   mover archivos ni cambiar las claves de almacenamiento o
   `NEXT_PUBLIC_MEDIA_BASE_URL`.
4. Una vez disponible el dominio, cambiar `FRONTEND_URL` en Render a
   `https://cofinder.vanthlabs.org` (sin barra final) y redesplegar la API.
   Esta variable controla CORS HTTP, sockets, redirección post-login y enlaces
   enviados por correo. Conservar `CORS_PREVIEW_REGEX` para los previews.
   `GOOGLE_CALLBACK_URL` permanece en Render mientras no cambie el dominio de
   la API; comprobar el inicio de sesión completo desde el dominio nuevo.
5. Verificar la landing, login, chat y una subida de imagen antes de redirigir
   el dominio anterior de Vercel al nuevo. La sesión y los permisos de
   notificaciones del navegador pertenecen a cada origen: en el dominio nuevo
   hay que iniciar sesión y habilitar las notificaciones de nuevo.
