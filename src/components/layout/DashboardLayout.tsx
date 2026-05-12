import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X, Bell, Globe } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profile } = useAuth()
  const { i18n } = useTranslation()

  function toggleLang() {
    const next = i18n.language === 'en' ? 'sq' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lms_lang', next)
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top nav */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 flex-shrink-0">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setDrawerOpen(o => !o)}
          >
            {drawerOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Globe size={16} />
              <span className="uppercase font-medium">{i18n.language}</span>
            </button>

            {/* Notifications bell */}
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
