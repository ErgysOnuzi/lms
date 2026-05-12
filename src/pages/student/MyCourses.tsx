import { Link } from 'react-router-dom'
import { BookOpen, Play, Award, Search } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStudentEnrollments } from '@/hooks/useEnrollments'
import { useCourseProgress } from '@/hooks/useProgress'
import { Card, CardBody } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Enrollment, Lesson, Module } from '@/types/database'

function EnrolledCourseCard({ enrollment }: { enrollment: Enrollment }) {
  const { profile } = useAuth()
  const { data: progress } = useCourseProgress(profile?.id ?? '', enrollment.course_id)

  const course = enrollment.course
  const allLessons: Lesson[] = ((course?.modules ?? []) as (Module & { lessons: Lesson[] })[])
    .flatMap(m => m.lessons ?? [])

  const completedIds = new Set((progress ?? []).filter(p => p.is_completed).map(p => p.lesson_id))
  const completedCount = allLessons.filter(l => completedIds.has(l.id)).length
  const totalCount = allLessons.length
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0
  const nextLesson = allLessons.find(l => !completedIds.has(l.id))

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {course?.cover_image_url ? (
        <img src={course.cover_image_url} alt={course.title ?? ''} className="h-40 w-full object-cover" />
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
          <BookOpen size={36} className="text-indigo-400" />
        </div>
      )}
      <CardBody className="space-y-3">
        <h3 className="font-semibold text-slate-900 line-clamp-2">{course?.title}</h3>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{completedCount}/{totalCount} lessons</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>

        {pct === 100 ? (
          <Badge variant="success" className="w-full justify-center py-1.5">
            <Award size={14} className="mr-1" /> Completed
          </Badge>
        ) : nextLesson ? (
          <Link to={`/courses/${enrollment.course_id}/learn/${nextLesson.id}`}>
            <Button size="sm" className="w-full"><Play size={14} /> Continue</Button>
          </Link>
        ) : (
          <Link to={`/courses/${enrollment.course_id}/learn`}>
            <Button variant="outline" size="sm" className="w-full">Start Course</Button>
          </Link>
        )}
      </CardBody>
    </Card>
  )
}

export default function MyCourses() {
  const { profile } = useAuth()
  const { data: enrollments, isLoading } = useStudentEnrollments(profile?.id ?? '')
  const [search, setSearch] = useState('')

  if (isLoading) return <PageSpinner />

  const filtered = (enrollments ?? []).filter(e =>
    e.course?.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
        <span className="text-sm text-slate-500">{enrollments?.length ?? 0} enrolled</span>
      </div>

      {(enrollments?.length ?? 0) > 0 && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your courses…"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {!enrollments?.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <BookOpen size={48} className="text-slate-300" />
            <div>
              <p className="font-medium text-slate-700">No courses yet</p>
              <p className="text-sm text-slate-500">Ask your instructor to enrol you in a course</p>
            </div>
          </CardBody>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No courses match "{search}"</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(e => <EnrolledCourseCard key={e.id} enrollment={e} />)}
        </div>
      )}
    </div>
  )
}
