import { useQuery } from '@tanstack/react-query'
import { Users, BookOpen, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { exportToCsv } from '@/lib/csvExport'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

interface StudentRow {
  student_id: string
  enrolled_at: string
  course_title: string
  full_name: string | null
  email: string
  completed_lessons: number
  total_lessons: number
}

export default function StudentsList() {
  const { profile } = useAuth()

  const { data: rows, isLoading } = useQuery<StudentRow[]>({
    queryKey: ['instructor-students', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      // Get instructor's courses with modules and lessons
      const { data: courses, error: cErr } = await supabase
        .from('courses')
        .select('id, title, modules(id, lessons(id))')
        .eq('instructor_id', profile.id)
      if (cErr) throw cErr

      const courseIds = (courses ?? []).map(c => c.id)
      if (!courseIds.length) return []

      // Get enrollments for those courses
      const { data: enrollments, error: eErr } = await supabase
        .from('enrollments')
        .select('student_id, course_id, enrolled_at, student:profiles(full_name, email)')
        .in('course_id', courseIds)
        .order('enrolled_at', { ascending: false })
      if (eErr) throw eErr

      if (!enrollments?.length) return []

      // Get lesson progress for all enrolled students
      const studentIds = [...new Set(enrollments.map(e => e.student_id))]
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('student_id, lesson_id, is_completed')
        .in('student_id', studentIds)

      const completedSet = new Set(
        (progress ?? []).filter(p => p.is_completed).map(p => `${p.student_id}:${p.lesson_id}`)
      )

      const courseMap = new Map((courses ?? []).map(c => {
        const lessons = (c.modules as { lessons: { id: string }[] }[]).flatMap(m => m.lessons ?? [])
        return [c.id, { title: c.title, lessonIds: lessons.map(l => l.id) }]
      }))

      return enrollments.map(e => {
        const course = courseMap.get(e.course_id)
        const totalLessons = course?.lessonIds.length ?? 0
        const completedLessons = (course?.lessonIds ?? []).filter(
          lid => completedSet.has(`${e.student_id}:${lid}`)
        ).length
        const student = Array.isArray(e.student) ? e.student[0] : e.student

        return {
          student_id: e.student_id,
          enrolled_at: e.enrolled_at,
          course_title: course?.title ?? '',
          full_name: student?.full_name ?? null,
          email: student?.email ?? '',
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
        }
      })
    },
    enabled: !!profile?.id,
  })

  if (isLoading) return <PageSpinner />

  function exportStudents() {
    exportToCsv(
      (rows ?? []).map(r => ({
        name: r.full_name ?? '',
        email: r.email,
        course: r.course_title,
        progress: `${r.completed_lessons}/${r.total_lessons}`,
        enrolled: r.enrolled_at,
      })),
      'students.csv'
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">{rows?.length ?? 0} enrollments across your courses</p>
        </div>
        <Button variant="outline" onClick={exportStudents}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      {!rows?.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <Users size={48} className="text-slate-300" />
            <div>
              <p className="font-medium text-slate-700">No students yet</p>
              <p className="text-sm text-slate-500">Students will appear here once they enrol</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp size={16} />
              <span>Showing all students enrolled in your courses</span>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Progress</th>
                  <th className="px-6 py-3">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const pct = row.total_lessons
                    ? Math.round((row.completed_lessons / row.total_lessons) * 100)
                    : 0
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 shrink-0">
                            {row.full_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{row.full_name ?? '—'}</p>
                            <p className="text-xs text-slate-500">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 text-slate-700">
                          <BookOpen size={14} className="shrink-0 text-slate-400" />
                          <span className="line-clamp-1">{row.course_title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="w-24" />
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {row.completed_lessons}/{row.total_lessons}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">
                        {formatDate(row.enrolled_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
