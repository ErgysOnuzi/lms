import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { supabaseMisconfigured } from '@/lib/supabaseClient'
import { roleHome } from '@/lib/roleHome'
import { useAuth } from '@/contexts/AuthContext'
import { GraduationCap } from 'lucide-react'

// Redirects to the correct home for the authenticated user's role.
// Used for "/" and "*" so every role lands on its own dashboard.
function RoleRedirect() {
  const { session, role, loading, profile } = useAuth()
  if (loading || (session && !profile)) return <PageSpinner />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(role)} replace />
}

function MisconfiguredScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
          <GraduationCap className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">EduCore LMS</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Supabase is not connected yet. Add the two environment variables to
          your deployment and redeploy.
        </p>
        <div className="rounded-xl bg-slate-50 p-4 text-left space-y-2 font-mono text-xs text-slate-700">
          <p><span className="text-indigo-600">VITE_SUPABASE_URL</span>=https://your-project.supabase.co</p>
          <p><span className="text-indigo-600">VITE_SUPABASE_ANON_KEY</span>=eyJ…</p>
        </div>
        <p className="text-xs text-slate-400">
          Find both values in your Supabase dashboard → Project Settings → API
        </p>
      </div>
    </div>
  )
}

// ── Auth ──────────────────────────────────────────────────────────────────────
const Login    = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))

// ── Student ───────────────────────────────────────────────────────────────────
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'))
const MyCourses        = lazy(() => import('@/pages/student/MyCourses'))
const BrowseCatalog    = lazy(() => import('@/pages/student/BrowseCatalog'))
const CoursePlayer     = lazy(() => import('@/pages/student/CoursePlayer'))
const AssignmentsList  = lazy(() => import('@/pages/student/AssignmentsList'))
const AssignmentView   = lazy(() => import('@/pages/student/AssignmentView'))
const Certificates     = lazy(() => import('@/pages/student/Certificates'))

// ── Instructor ────────────────────────────────────────────────────────────────
const InstructorDashboard = lazy(() => import('@/pages/instructor/InstructorDashboard'))
const CreateCourse        = lazy(() => import('@/pages/instructor/CreateCourse'))
const CourseBuilder       = lazy(() => import('@/pages/instructor/CourseBuilder'))
const Gradebook           = lazy(() => import('@/pages/instructor/Gradebook'))
const StudentsList        = lazy(() => import('@/pages/instructor/StudentsList'))

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'))
const CourseApproval = lazy(() => import('@/pages/admin/CourseApproval'))
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'))

export default function App() {
  if (supabaseMisconfigured) return <MisconfiguredScreen />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            {/* fallback=null: DashboardLayout has its own inner Suspense so only
                the content area spins — no more full-page white flash on navigation */}
            <Suspense fallback={null}>
              <Routes>
                {/* ── Public ─────────────────────────────────────────────── */}
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/unauthorized" element={
                  <div className="flex h-screen items-center justify-center text-slate-500">
                    403 — You don't have permission to view this page.
                  </div>
                } />

                {/* ── Student ────────────────────────────────────────────── */}
                <Route element={<ProtectedRoute allowedRoles={['student', 'alumni']} />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard"               element={<StudentDashboard />} />
                    <Route path="/my-courses"              element={<MyCourses />} />
                    <Route path="/courses"                 element={<BrowseCatalog />} />
                    <Route path="/assignments"             element={<AssignmentsList />} />
                    <Route path="/assignments/:assignmentId" element={<AssignmentView />} />
                    <Route path="/certificates"            element={<Certificates />} />
                  </Route>
                  {/* Full-screen player — no sidebar chrome */}
                  <Route path="/courses/:courseId/learn"             element={<CoursePlayer />} />
                  <Route path="/courses/:courseId/learn/:lessonId"   element={<CoursePlayer />} />
                </Route>

                {/* ── Instructor ─────────────────────────────────────────── */}
                <Route element={<ProtectedRoute allowedRoles={['instructor', 'admin']} />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/instructor"                            element={<InstructorDashboard />} />
                    <Route path="/instructor/courses"                    element={<InstructorDashboard />} />
                    <Route path="/instructor/courses/new"                element={<CreateCourse />} />
                    <Route path="/instructor/courses/:courseId/builder"  element={<CourseBuilder />} />
                    <Route path="/instructor/courses/:courseId/grades"   element={<Gradebook />} />
                    {/* /instructor/grades — top-level nav link → show InstructorDashboard
                        so user can pick a course; per-course grade lives at the route above */}
                    <Route path="/instructor/grades"                     element={<InstructorDashboard />} />
                    <Route path="/instructor/students"                   element={<StudentsList />} />
                  </Route>
                </Route>

                {/* ── Admin ──────────────────────────────────────────────── */}
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/admin"          element={<AdminDashboard />} />
                    <Route path="/admin/users"    element={<UserManagement />} />
                    <Route path="/admin/courses"  element={<CourseApproval />} />
                    <Route path="/admin/settings" element={<SystemSettings />} />
                  </Route>
                </Route>

                {/* ── Fallback — role-aware redirect ─────────────────────── */}
                <Route path="/" element={<RoleRedirect />} />
                <Route path="*" element={<RoleRedirect />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
