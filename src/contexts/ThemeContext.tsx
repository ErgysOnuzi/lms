import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { OrganizationSettings } from '@/types/database'

interface ThemeContextValue {
  settings: OrganizationSettings | null
  updateSettings: (s: Partial<OrganizationSettings>) => void
}

const ThemeContext = createContext<ThemeContextValue>({ settings: null, updateSettings: () => {} })

function applyTheme(settings: OrganizationSettings) {
  document.documentElement.style.setProperty('--primary', settings.primary_color)
  document.documentElement.style.setProperty('--accent', settings.accent_color)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)

  useEffect(() => {
    supabase.from('organization_settings').select('*').limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings(data)
          applyTheme(data)
        }
      })
  }, [])

  function updateSettings(patch: Partial<OrganizationSettings>) {
    setSettings(prev => {
      const next = prev ? { ...prev, ...patch } : (patch as OrganizationSettings)
      applyTheme(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ settings, updateSettings }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}
