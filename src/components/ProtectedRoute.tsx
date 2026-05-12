import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'
import { PageSpinner } from '@/components/ui/Spinner'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, role, loading, profile } = useAuth()

  // Wait for both the session AND the profile to finish loading.
  // Without this, role is null for a brief moment and the check below
  // would be skipped, sometimes rendering the wrong page or flashing 403.
  if (loading || (session && !profile)) return <PageSpinner />
  if (!session) return <Navigate to="/login" replace />

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
