# LMS — Claude Code Standards

## Project Overview
University Learning Management System built with React (Vite) + TypeScript + Tailwind CSS + Supabase.

## Architecture

```
src/
├── lib/            # Supabase client, utilities (uploadFile, csvExport, i18n)
├── hooks/          # Domain hooks (useAuth, useCourses, useProgress…)
├── contexts/       # React contexts (AuthContext, ThemeContext)
├── components/
│   ├── layout/     # DashboardLayout, Sidebar, TopNav
│   └── ui/         # Shared primitives (Button, Card, Badge…)
├── pages/
│   ├── auth/       # Login, Register
│   ├── instructor/ # InstructorDashboard, CreateCourse, CourseBuilder, Gradebook
│   ├── student/    # StudentDashboard, CoursePlayer, AssignmentView
│   └── admin/      # AdminDashboard, UserManagement, CourseApproval
├── i18n/           # i18next config + translation JSON files
└── App.tsx         # React Router tree
supabase/
├── migrations/     # SQL migrations (apply via: supabase db push)
└── functions/      # Edge Functions (ai-assistant, send-email)
```

## Code Standards

### TypeScript
- Strict mode on. No `any` — use `unknown` + narrowing when needed.
- All database rows typed via `src/types/database.ts` (keep in sync with migration).
- Use `Database['public']['Tables']['foo']['Row']` pattern for Supabase row types.

### Data Fetching
- **TanStack Query** for all server state. No raw `useEffect` for data fetching.
- Mutation invalidates only the minimal query keys it touches.
- Optimistic updates for lesson completion and discussion upvotes.

### Forms
- **react-hook-form** + **zod** for all forms. Schema lives next to the form component.

### Styling
- Tailwind CSS only — no inline styles, no CSS modules.
- Use `cn()` from `src/lib/utils.ts` for conditional class merging.
- Design tokens: `primary`, `secondary`, `success`, `danger` mapped to Tailwind.
- Dynamic branding injects CSS vars `--primary` / `--accent` from organization settings.

### State Management
- Global auth state: `AuthContext` (wraps Supabase `onAuthStateChange`).
- Server state: TanStack Query.
- Local UI state: `useState` / `useReducer` — no Redux.

### Security
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- RLS enforced at the DB level — client-side checks are UX-only, not security.
- File uploads use structured paths: `/courses/{courseId}/lessons/{filename}`.

### Routing
- `ProtectedRoute` wraps all authenticated pages.
- `RoleGate` component handles role-based rendering (student | instructor | admin | alumni).
- Lazy-load all page components with `React.lazy` + `Suspense`.

## Environment Variables
Only two variables needed — both free. See `.env.example`.

```
VITE_SUPABASE_URL      # From Supabase Dashboard → Settings → API
VITE_SUPABASE_ANON_KEY # From Supabase Dashboard → Settings → API
```

No paid external services. All features run on Supabase's free tier.

## Commands
```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run typecheck    # tsc --noEmit
supabase db push     # Apply migrations to remote Supabase project
supabase functions serve ai-assistant  # Test edge function locally
```

## Edge Functions (100% free, no external APIs)
- `ai-assistant` — keyword-based study helper, runs entirely inside the function (no LLM API)
- `send-email`   — writes to the `notifications` table (in-app inbox); no email provider needed

## Database
Migration file: `supabase/migrations/001_initial_schema.sql`
RLS strategy: helper functions `is_admin()`, `is_instructor_of(course_id)`, `is_enrolled_in(course_id)` used in all policies.
Certificate trigger fires automatically when lesson_progress reaches 100% completion.
