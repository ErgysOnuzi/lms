import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, Lock, ChevronRight, ChevronLeft,
  Menu, X, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCourse } from '@/hooks/useCourses'
import { useCourseProgress, useMarkComplete, useLastAccessed } from '@/hooks/useProgress'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'
import type { Lesson, Module } from '@/types/database'
import { QuizRenderer } from '@/components/quiz/QuizRenderer'
import { AIAssistant } from '@/components/AIAssistant'

const ReactMarkdown = lazy(() => import('react-markdown'))

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data: course, isLoading } = useCourse(courseId!)
  const { data: progress } = useCourseProgress(profile?.id ?? '', courseId!)
  const markComplete = useMarkComplete(courseId!)
  const trackAccess = useLastAccessed()

  const completedIds = new Set((progress ?? []).filter(p => p.is_completed).map(p => p.lesson_id))

  const allLessons: Array<Lesson & { moduleTitle: string; moduleIdx: number; lessonIdx: number }> =
    (course?.modules as (Module & { lessons: Lesson[] })[] ?? []).flatMap((m, mi) =>
      (m.lessons ?? []).map((l, li) => ({ ...l, moduleTitle: m.title, moduleIdx: mi, lessonIdx: li }))
    )

  const currentIdx = allLessons.findIndex(l => l.id === lessonId)
  const currentLesson = allLessons[currentIdx]
  const prevLesson = allLessons[currentIdx - 1]
  const nextLesson = allLessons[currentIdx + 1]

  const totalCount = allLessons.length
  const completedCount = allLessons.filter(l => completedIds.has(l.id)).length
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  // Track access on lesson mount — passes IDs explicitly so the hook can guard them
  useEffect(() => {
    if (profile?.id && lessonId) {
      trackAccess.mutate({ studentId: profile.id, lessonId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, profile?.id])

  function handleMarkComplete() {
    if (!profile || !lessonId) return
    markComplete.mutate({ lessonId, studentId: profile.id }, {
      onSuccess: () => {
        if (nextLesson) navigate(`/courses/${courseId}/learn/${nextLesson.id}`)
      },
    })
  }

  if (isLoading || !course || !profile) return <PageSpinner />

  return (
    <div className="flex h-full -m-4 lg:-m-6 overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        'flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto transition-all duration-300',
        sidebarOpen ? 'w-72' : 'w-0',
        'lg:relative fixed inset-y-0 left-0 z-30 lg:z-auto'
      )}>
        <div className="min-w-72">
          {/* Course header */}
          <div className="border-b border-slate-100 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 line-clamp-2">{course.title}</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 lg:hidden">
                <X size={18} />
              </button>
            </div>
            <Progress value={pct} showLabel />
            <p className="text-xs text-slate-500">{completedCount}/{totalCount} lessons complete</p>
          </div>

          {/* Module/lesson tree */}
          <nav className="p-3">
            {(course.modules as (Module & { lessons: Lesson[] })[] ?? []).map((mod, mi) => (
              <div key={mod.id} className="mb-3">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {mi + 1}. {mod.title}
                </p>
                <div className="space-y-0.5">
                  {mod.lessons?.map((lesson) => {
                    const isCompleted = completedIds.has(lesson.id)
                    const isCurrent = lesson.id === lessonId
                    const lessonIdx = allLessons.findIndex(l => l.id === lesson.id)
                    const isLocked = !lesson.is_free_preview && lessonIdx > 0 && !completedIds.has(allLessons[lessonIdx - 1]?.id ?? '')

                    return (
                      <button
                        key={lesson.id}
                        disabled={isLocked}
                        onClick={() => navigate(`/courses/${courseId}/learn/${lesson.id}`)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                          isCurrent && 'bg-indigo-50 text-indigo-700 font-medium',
                          !isCurrent && !isLocked && 'text-slate-700 hover:bg-slate-100',
                          isLocked && 'text-slate-400 cursor-not-allowed',
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                        ) : isLocked ? (
                          <Lock size={16} className="shrink-0 text-slate-300" />
                        ) : (
                          <Circle size={16} className="shrink-0 text-slate-300" />
                        )}
                        <span className="line-clamp-2">{lesson.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Player topbar */}
        <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(o => !o)} className="text-slate-500 hover:text-slate-700">
            <Menu size={20} />
          </button>
          {currentLesson && (
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{currentLesson.moduleTitle}</p>
              <h1 className="font-semibold text-slate-900 truncate">{currentLesson.title}</h1>
            </div>
          )}
        </div>

        {/* Lesson content */}
        <div className="flex-1 overflow-y-auto">
          {currentLesson ? (
            <div className="mx-auto max-w-3xl p-6 space-y-6">
              {currentLesson.content_type === 'video' && currentLesson.video_url && (
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={currentLesson.video_url}
                    className="h-full w-full"
                    allowFullScreen
                    title={currentLesson.title}
                  />
                </div>
              )}

              {currentLesson.content_type === 'markdown' && currentLesson.content && (
                <Suspense fallback={<PageSpinner />}>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
                  </div>
                </Suspense>
              )}

              {currentLesson.content_type === 'document' && currentLesson.document_url && (
                <iframe
                  src={currentLesson.document_url}
                  className="h-[70vh] w-full rounded-xl border border-slate-200"
                  title={currentLesson.title}
                />
              )}

              {currentLesson.content_type === 'quiz' && currentLesson.quiz_data && (
                <QuizRenderer
                  lessonId={currentLesson.id}
                  quizData={currentLesson.quiz_data}
                  studentId={profile.id}
                  onPassed={handleMarkComplete}
                />
              )}

              {/* Navigation & complete */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  variant="ghost"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && navigate(`/courses/${courseId}/learn/${prevLesson.id}`)}
                >
                  <ChevronLeft size={16} /> Previous
                </Button>

                {completedIds.has(lessonId!) ? (
                  <Button variant="secondary" disabled>
                    <CheckCircle2 size={16} className="text-emerald-600" /> Completed
                  </Button>
                ) : (
                  <Button
                    onClick={handleMarkComplete}
                    loading={markComplete.isPending}
                  >
                    Mark as Complete
                    {nextLesson && <ArrowRight size={16} />}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && navigate(`/courses/${courseId}/learn/${nextLesson.id}`)}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Select a lesson to start learning
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant floating widget */}
      {currentLesson && <AIAssistant lessonContent={currentLesson.content ?? currentLesson.title} />}
    </div>
  )
}
