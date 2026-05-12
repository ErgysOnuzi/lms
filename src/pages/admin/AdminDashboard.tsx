import { useQuery } from '@tanstack/react-query'
import { Users, BookOpen, HardDrive, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'

interface SystemStats {
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  publishedCourses: number
  pendingCourses: number
  totalEnrollments: number
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profiles, courses, enrollments] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('courses').select('status'),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
      ])
      const p = profiles.data ?? []
      const c = courses.data ?? []
      return {
        totalStudents:    p.filter(r => r.role === 'student').length,
        totalInstructors: p.filter(r => r.role === 'instructor').length,
        totalCourses:     c.length,
        publishedCourses: c.filter(r => r.status === 'published').length,
        pendingCourses:   c.filter(r => r.status === 'pending').length,
        totalEnrollments: enrollments.count ?? 0,
      }
    },
  })

  if (isLoading) return <PageSpinner />

  const tiles = [
    { label: 'Total Students',    value: stats?.totalStudents,    icon: Users,     color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Instructors',       value: stats?.totalInstructors, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Published Courses', value: stats?.publishedCourses, icon: BookOpen,  color: 'bg-sky-50 text-sky-600' },
    { label: 'Pending Approval',  value: stats?.pendingCourses,   icon: HardDrive, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Courses',     value: stats?.totalCourses,     icon: BookOpen,  color: 'bg-slate-100 text-slate-600' },
    { label: 'Total Enrollments', value: stats?.totalEnrollments, icon: Users,     color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map(t => (
          <Card key={t.label}>
            <CardBody className="flex flex-col gap-2 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.color}`}>
                <t.icon size={20} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{t.value ?? 0}</p>
              <p className="text-xs text-slate-500 leading-tight">{t.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent audit log */}
      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Recent Activity</h2></CardHeader>
        <AuditLog />
      </Card>
    </div>
  )
}

function AuditLog() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_audit_logs')
        .select('*, actor:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="divide-y divide-slate-50">
      {!data?.length && (
        <p className="px-6 py-8 text-center text-sm text-slate-400">No audit events yet</p>
      )}
      {data?.map((log: { id: string; action: string; table_name: string; actor?: { full_name?: string }; created_at: string }) => (
        <div key={log.id} className="flex items-center gap-4 px-6 py-3 text-sm">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
            log.action === 'INSERT' ? 'bg-emerald-100 text-emerald-700' :
            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>{log.action}</span>
          <span className="text-slate-500">{log.table_name}</span>
          <span className="flex-1 text-slate-700">{log.actor?.full_name ?? 'System'}</span>
          <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
