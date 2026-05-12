import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, Send } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { SubmissionStatus } from '@/types/database'

const statusConfig: Record<SubmissionStatus, { variant: 'success' | 'warning' | 'info' | 'default' | 'danger'; label: string; icon: React.ElementType }> = {
  graded:      { variant: 'success', label: 'Graded',      icon: CheckCircle2 },
  submitted:   { variant: 'info',    label: 'Submitted',   icon: Send },
  late:        { variant: 'warning', label: 'Late',        icon: AlertTriangle },
  not_started: { variant: 'default', label: 'Not Started', icon: Clock },
}

interface AssignmentRow {
  id: string
  title: string
  description: string | null
  due_date: string | null
  max_points: number
  course: { title: string } | null
  submission: { status: SubmissionStatus } | null
}

export default function AssignmentsList() {
  const { profile } = useAuth()

  const { data: rows, isLoading } = useQuery<AssignmentRow[]>({
    queryKey: ['assignments-list', profile?.id],
    queryFn: async () => {
      // Get all courses the student is enrolled in
      const { data: enrollments, error: eErr } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile!.id)
      if (eErr) throw eErr

      const courseIds = (enrollments ?? []).map(e => e.course_id)
      if (!courseIds.length) return []

      // Get assignments for those courses
      const { data: assignments, error: aErr } = await supabase
        .from('assignments')
        .select('id, title, description, due_date, max_points, course:courses(title)')
        .in('course_id', courseIds)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (aErr) throw aErr

      // Get this student's submissions for those assignments
      const assignmentIds = (assignments ?? []).map(a => a.id)
      const { data: submissions } = assignmentIds.length
        ? await supabase
            .from('submissions')
            .select('assignment_id, status')
            .eq('student_id', profile!.id)
            .in('assignment_id', assignmentIds)
        : { data: [] }

      const subMap = new Map((submissions ?? []).map(s => [s.assignment_id, s.status as SubmissionStatus]))

      return (assignments ?? []).map(a => ({
        ...a,
        course: Array.isArray(a.course) ? a.course[0] : a.course,
        submission: subMap.has(a.id) ? { status: subMap.get(a.id)! } : null,
      }))
    },
    enabled: !!profile?.id,
  })

  if (isLoading) return <PageSpinner />

  const now = new Date()
  const upcoming  = (rows ?? []).filter(a => !a.due_date || new Date(a.due_date) >= now)
  const overdue   = (rows ?? []).filter(a => a.due_date && new Date(a.due_date) < now && (!a.submission || a.submission.status === 'not_started'))

  function Section({ title, items, emptyMsg }: { title: string; items: AssignmentRow[]; emptyMsg: string }) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-700">{title} <span className="text-slate-400 font-normal">({items.length})</span></h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyMsg}</p>
        ) : items.map(a => {
          const status = a.submission?.status ?? 'not_started'
          const { variant, label, icon: Icon } = statusConfig[status]
          const isOverdueItem = a.due_date && new Date(a.due_date) < now

          return (
            <Link key={a.id} to={`/assignments/${a.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardBody className="flex items-center gap-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <ClipboardList size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.course?.title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={variant}>
                      <Icon size={11} className="mr-1" />{label}
                    </Badge>
                    {a.due_date && (
                      <span className={`text-xs ${isOverdueItem ? 'text-red-500' : 'text-slate-400'}`}>
                        {isOverdueItem ? 'Overdue · ' : 'Due · '}{formatDate(a.due_date)}
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>

      {!rows?.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <ClipboardList size={48} className="text-slate-300" />
            <div>
              <p className="font-medium text-slate-700">No assignments yet</p>
              <p className="text-sm text-slate-500">Assignments will appear here once your instructor adds them</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {overdue.length > 0 && <Section title="Overdue" items={overdue} emptyMsg="" />}
          <Section title="Upcoming & Active" items={upcoming} emptyMsg="No upcoming assignments" />
        </>
      )}
    </div>
  )
}
