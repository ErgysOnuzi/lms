import { Link } from 'react-router-dom'
import { BookOpen, Play, Award, Flame } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useStudentEnrollments } from '@/hooks/useEnrollments'
import { useCourseProgress } from '@/hooks/useProgress'
import { Card, CardBody } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Enrollment, Lesson, Module } from '@/types/database'

function CourseCard({ enrollment }: { enrollment: Enrollment }) {
  const { profile } = useAuth()
  const { data: progress } = useCourseProgress(profile?.id ?? '', enrollment.course_id)

  const course = enrollment.course
  const allLessons: Lesson[] = (course?.modules as (Module & { lessons: Lesson[] })[] ?? [])
    .flatMap(m => m.lessons ?? [])

  const completedIds = new Set((progress ?? []).filter(p => p.is_completed).map(p => p.lesson_id))
  const completedCount = allLessons.filter(l => completedIds.has(l.id)).length
  const totalCount = allLessons.length
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  // Last uncompleted lesson
  const nextLesson = allLessons.find(l => !completedIds.has(l.id))

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {course?.cover_image_url ? (
        <img src={course.cover_image_url} alt={course?.title} className="h-36 w-full object-cover" />
      ) : (
        <div className="h-36 w-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
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
            <Award size={14} className="mr-1" /> Completed!
          </Badge>
        ) : nextLesson ? (
          <Link to={`/courses/${enrollment.course_id}/learn/${nextLesson.id}`}>
            <Button size="sm" className="w-full">
              <Play size={14} /> Continue Learning
            </Button>
          </Link>
        ) : (
          <Link to={`/courses/${enrollment.course_id}`}>
            <Button variant="outline" size="sm" className="w-full">View Course</Button>
          </Link>
        )}
      </CardBody>
    </Card>
  )
}

export default function StudentDashboard() {
  const { profile } = useAuth()
  const { data: enrollments, isLoading } = useStudentEnrollments(profile?.id ?? '')

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Student'}!
          </h1>
          <p className="text-sm text-slate-500">Pick up where you left off</p>
        </div>
        {(profile?.streak_days ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2 text-amber-700">
            <Flame size={18} />
            <span className="font-semibold">{profile?.streak_days}d streak</span>
          </div>
        )}
      </div>

      {/* XP Bar */}
      <Card>
        <CardBody className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg">
            {Math.floor((profile?.xp_points ?? 0) / 100)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">Level {Math.floor((profile?.xp_points ?? 0) / 100)}</span>
              <span className="text-slate-500">{profile?.xp_points ?? 0} XP</span>
            </div>
            <Progress value={(profile?.xp_points ?? 0) % 100} />
          </div>
        </CardBody>
      </Card>

      {/* In-progress courses */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">My Courses</h2>
        {!enrollments?.length ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <BookOpen size={48} className="text-slate-300" />
              <div>
                <p className="font-medium text-slate-700">No courses yet</p>
                <p className="text-sm text-slate-500">Browse the catalog and enroll in a course</p>
              </div>
              <Link to="/courses"><Button>Browse Courses</Button></Link>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {enrollments.map(enrollment => (
              <CourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
