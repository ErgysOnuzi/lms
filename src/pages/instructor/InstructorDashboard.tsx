import { Link } from 'react-router-dom'
import { Plus, BookOpen, Users, BarChart2, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useInstructorCourses } from '@/hooks/useCourses'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { CourseStatus } from '@/types/database'

const statusBadge: Record<CourseStatus, { variant: 'success' | 'warning' | 'default' | 'danger'; label: string }> = {
  published: { variant: 'success', label: 'Published' },
  pending:   { variant: 'warning', label: 'Pending Review' },
  draft:     { variant: 'default', label: 'Draft' },
  archived:  { variant: 'danger',  label: 'Archived' },
}

export default function InstructorDashboard() {
  const { profile } = useAuth()
  const { data: courses, isLoading } = useInstructorCourses(profile?.id ?? '')

  if (isLoading) return <PageSpinner />

  const published = courses?.filter(c => c.status === 'published').length ?? 0
  const pending   = courses?.filter(c => c.status === 'pending').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-500">Manage and monitor your course catalog</p>
        </div>
        <Link to="/instructor/courses/new">
          <Button>
            <Plus size={16} />
            New Course
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Courses', value: courses?.length ?? 0, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Published',     value: published,             icon: BarChart2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Pending',       value: pending,               icon: Clock,    color: 'text-amber-600 bg-amber-50' },
          { label: 'Total Students', value: '—',                  icon: Users,    color: 'text-sky-600 bg-sky-50' },
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
          {courses.map(course => {
            const { variant, label } = statusBadge[course.status]
            return (
              <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {course.cover_image_url && (
                  <img src={course.cover_image_url} alt={course.title}
                    className="h-40 w-full object-cover" />
                )}
                {!course.cover_image_url && (
                  <div className="h-40 w-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                    <BookOpen size={40} className="text-indigo-400" />
                  </div>
                )}
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-2">{course.title}</h3>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(course.created_at)}</p>
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
