import type { UserRole } from '@/types/database'

export function roleHome(role: UserRole | null): string {
  switch (role) {
    case 'admin':      return '/admin'
    case 'instructor': return '/instructor'
    default:           return '/dashboard'
  }
}
