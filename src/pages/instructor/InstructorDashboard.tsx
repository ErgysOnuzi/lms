import { Link } from 'react-router-dom'
import { Plus, BookOpen, Users, BarChart2, Eye, EyeOff } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useInstructorCourses } from '@/hooks/useCourses'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { Course } from '@/types/database'

export default function InstructorDashboard() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { data: courses, isLoading } = useInstructorCourses(profile?.id ?? '')

  // Total unique students enrolled across all this instructor's courses
  const { data: studentCount } = useQuery({
    queryKey: ['instructor-student-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0
      const { data: myCourses } = await supabase
        .from('courses').select('id').eq('instructor_id', profile.id)
      const ids = (myCourses ?? []).map(c => c.id)
      if (!ids.length) return 0
      const { data } = await supabase
        .from('enrollments').select('student_id').in('course_id', ids)
      return new Set((data ?? []).map(e => e.student_id)).size
    },
    enabled: !!profile?.id,
  })

  const toggleStatus = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      const next = current === 'published' ? 'draft' : 'published'
      const { error } = await supabase.from('courses').update({ status: next }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses', 'instructor', profile?.id] })
    },
  })

  if (isLoading) return <PageSpinner />

  const published = courses?.filter(c => c.status === 'published').length ?? 0
  const drafts    = courses?.filter(c => c.status === 'draft').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-500">Manage and monitor your course catalog</p>
        </div>
        <Link to="/instructor/courses/new">
          <Button><Plus size={16} /> New Course</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Courses', value: courses?.length ?? 0, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Published',     value: published,             icon: BarChart2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Drafts',        value: drafts,                icon: EyeOff,   color: 'text-slate-500 bg-slate-100' },
          { label: 'Total Students', value: studentCount ?? 0,     icon: Users,    color: 'text-sky-600 bg-sky-50' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardBody className="flex items-center gap-4">
              <div className={`rounded-xl p-3 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Course list */}
      {!courses?.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <BookOpen size={48} className="text-slate-300" />
            <div>
              <p className="font-medium text-slate-700">No courses yet</p>
              <p className="text-sm text-slate-500">Create your first course to get started</p>
            </div>
            <Link to="/instructor/courses/new">
              <Button><Plus size={16} /> Create Course</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course: Course) => {
            const isPublished = course.status === 'published'
            return (
              <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {course.cover_image_url ? (
                  <img src={course.cover_image_url} alt={course.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 w-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                    <BookOpen size={40} className="text-indigo-400" />
                  </div>
                )}

                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 flex-1">{course.title}</h3>
                    <Badge variant={isPublished ? 'success' : 'default'}>
                      {isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500">{formatDate(course.created_at)}</p>

                  {/* Publish / Unpublish toggle */}
                  <button
                    onClick={() => toggleStatus.mutate({ id: course.id, current: course.status })}
                    disabled={toggleStatus.isPending}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isPublished
                        ? 'border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                        : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    {isPublished
                      ? <><EyeOff size={14} /> Unpublish (hide from students)</>
                      : <><Eye size={14} /> Publish (make visible to students)</>
                    }
                  </button>

                  <div className="flex gap-2">
                    <Link to={`/instructor/courses/${course.id}/builder`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Edit</Button>
                    </Link>
                    <Link to={`/instructor/courses/${course.id}/grades`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">Gradebook</Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
