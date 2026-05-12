import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Download, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { exportToCsv } from '@/lib/csvExport'
import type { Profile, UserRole } from '@/types/database'

const roleBadge: Record<UserRole, { variant: 'success' | 'info' | 'warning' | 'default'; label: string }> = {
  admin:      { variant: 'warning', label: 'Admin' },
  instructor: { variant: 'info',    label: 'Instructor' },
  student:    { variant: 'default', label: 'Student' },
  alumni:     { variant: 'success', label: 'Alumni' },
}

export default function UserManagement() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
  })

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = (users ?? []).filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  function exportUsers() {
    exportToCsv(filtered.map(u => ({
      name: u.full_name ?? '',
      email: u.email,
      role: u.role,
      joined: u.created_at,
    })), 'users.csv')
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <Button variant="outline" onClick={exportUsers}><Download size={16} /> Export CSV</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-slate-500">{filtered.length} users</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">XP</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const { variant, label } = roleBadge[user.role]
                return (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                          {user.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.full_name ?? '—'}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3"><Badge variant={variant}>{label}</Badge></td>
                    <td className="px-6 py-3 text-slate-700">{user.xp_points}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        {(['student', 'instructor', 'admin', 'alumni'] as UserRole[]).map(r => (
                          r !== user.role && (
                            <Button
                              key={r}
                              size="sm" variant="ghost"
                              onClick={() => changeRole.mutate({ id: user.id, role: r })}
                              loading={changeRole.isPending}
                            >
                              <Shield size={12} />→{r}
                            </Button>
                          )
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
