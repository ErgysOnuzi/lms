import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X, Bell, Globe } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

function ContentSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
    </div>
  )
}

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

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50 shadow-2xl">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top nav */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
          <button
            className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => setDrawerOpen(o => !o)}
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Globe size={14} />
              {i18n.language.toUpperCase()}
            </button>

            <button className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>

            <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white select-none">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content — Suspense here keeps sidebar + topnav visible during page transitions */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Suspense fallback={<ContentSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
