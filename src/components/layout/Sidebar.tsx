import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, ClipboardList, BarChart2,
  Users, Settings, Shield, GraduationCap, LogOut, Star, Library,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

interface NavItem { to: string; label: string; icon: React.ElementType }

const studentNav: NavItem[] = [
  { to: '/dashboard',    label: 'nav.dashboard',   icon: LayoutDashboard },
  { to: '/my-courses',   label: 'nav.courses',      icon: BookOpen },
  { to: '/courses',      label: 'Browse Catalog',   icon: Library },
  { to: '/assignments',  label: 'nav.assignments',  icon: ClipboardList },
  { to: '/certificates', label: 'Certificates',     icon: Star },
]

const instructorNav: NavItem[] = [
  { to: '/instructor',          label: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/instructor/courses',  label: 'nav.courses',   icon: BookOpen },
  { to: '/instructor/students', label: 'nav.students',  icon: Users },
  { to: '/instructor/grades',   label: 'nav.grades',    icon: BarChart2 },
]

const adminNav: NavItem[] = [
  { to: '/admin',          label: 'nav.dashboard',    icon: LayoutDashboard },
  { to: '/admin/users',    label: 'nav.users',        icon: Users },
  { to: '/admin/courses',  label: 'nav.approveQueue', icon: Shield },
  { to: '/admin/settings', label: 'nav.settings',     icon: Settings },
]

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  )

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { role, signOut, profile } = useAuth()
  const { t } = useTranslation()

  const navItems =
    role === 'admin'      ? adminNav :
    role === 'instructor' ? instructorNav :
    studentNav

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-6">
        <GraduationCap className="h-7 w-7 text-indigo-600" />
        <span className="text-lg font-bold text-slate-900">EduCore</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={link}
            onClick={onClose}
            end={item.to.split('/').length <= 2}
          >
            <item.icon size={18} />
            <span>{t(item.label, item.label)}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{profile?.full_name ?? 'User'}</p>
            <p className="truncate text-xs text-slate-500 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}
