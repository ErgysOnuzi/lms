import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2, Lock, ChevronRight, ChevronLeft,
  PanelLeftClose, PanelLeftOpen, ArrowRight, Home,
  Video, FileText, File, HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCourse } from '@/hooks/useCourses'
import { useCourseProgress, useMarkComplete, useLastAccessed } from '@/hooks/useProgress'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ContentType, Lesson, Module } from '@/types/database'
import { QuizRenderer } from '@/components/quiz/QuizRenderer'
import { AIAssistant } from '@/components/AIAssistant'

const ReactMarkdown = lazy(() => import('react-markdown'))

const contentIcons: Record<ContentType, React.ElementType> = {
  video: Video, markdown: FileText, document: File, quiz: HelpCircle,
}

function LoadingLesson() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
    </div>
  )
}

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data: course, isLoading } = useCourse(courseId!)
  const { data: progress } = useCourseProgress(profile?.id ?? '', courseId!)
  const markComplete = useMarkComplete(courseId!)
  const trackAccess = useLastAccessed()

  const completedIds = new Set(
    (progress ?? []).filter(p => p.is_completed).map(p => p.lesson_id)
  )

  const allLessons: Array<Lesson & { moduleTitle: string }> =
    ((course?.modules ?? []) as (Module & { lessons: Lesson[] })[]).flatMap(m =>
      (m.lessons ?? []).map(l => ({ ...l, moduleTitle: m.title }))
    )

  const currentIdx = allLessons.findIndex(l => l.id === lessonId)
  const currentLesson = allLessons[currentIdx]
  const prevLesson = allLessons[currentIdx - 1]
  const nextLesson = allLessons[currentIdx + 1]
  const totalCount = allLessons.length
  const completedCount = allLessons.filter(l => completedIds.has(l.id)).length
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  // Auto-navigate to first lesson if none selected
  useEffect(() => {
    if (!lessonId && allLessons.length > 0) {
      navigate(`/courses/${courseId}/learn/${allLessons[0].id}`, { replace: true })
    }
  }, [lessonId, allLessons, courseId, navigate])

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

  if (isLoading || !profile) return <LoadingLesson />

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ── Lesson Sidebar ──────────────────────────────────────── */}
      <aside className={cn(
        'flex flex-col flex-shrink-0 bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out overflow-hidden',
        sidebarOpen ? 'w-72' : 'w-0',
        'fixed inset-y-0 left-0 z-30 lg:relative lg:z-auto'
      )}>
        <div className="min-w-72 flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-start gap-3 p-4 border-b border-slate-800">
            <Link to="/my-courses" className="mt-0.5 text-slate-400 hover:text-white transition-colors shrink-0">
              <Home size={16} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 mb-1">Course</p>
              <h2 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                {course?.title}
              </h2>
            </div>
          </div>

          {/* Progress */}
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Your progress</span>
              <span className="font-medium text-white">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{completedCount} of {totalCount} lessons done</p>
          </div>

          {/* Module / lesson tree */}
          <nav className="flex-1 overflow-y-auto py-2">
            {((course?.modules ?? []) as (Module & { lessons: Lesson[] })[]).map((mod, mi) => (
              <div key={mod.id} className="mb-1">
                {/* Module header */}
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                    {mi + 1}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 truncate">
                    {mod.title}
                  </p>
                </div>

                {/* Lessons */}
                <div className="pl-4 pr-3 space-y-0.5">
                  {(mod.lessons ?? []).map((lesson) => {
                    const isCompleted = completedIds.has(lesson.id)
                    const isCurrent = lesson.id === lessonId
                    const globalIdx = allLessons.findIndex(l => l.id === lesson.id)
                    const isLocked = !lesson.is_free_preview
                      && globalIdx > 0
                      && !completedIds.has(allLessons[globalIdx - 1]?.id ?? '')
                    const Icon = contentIcons[lesson.content_type]

                    return (
                      <button
                        key={lesson.id}
                        disabled={isLocked}
                        onClick={() => navigate(`/courses/${courseId}/learn/${lesson.id}`)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left transition-colors',
                          isCurrent && 'bg-indigo-600 text-white',
                          !isCurrent && !isLocked && 'text-slate-400 hover:bg-slate-800 hover:text-white',
                          isLocked && 'text-slate-700 cursor-not-allowed',
                        )}
                      >
                        {/* State icon */}
                        <span className="shrink-0">
                          {isCompleted
                            ? <CheckCircle2 size={15} className="text-emerald-400" />
                            : isLocked
                              ? <Lock size={15} className="text-slate-700" />
                              : <Icon size={15} className={isCurrent ? 'text-white' : 'text-slate-500'} />
                          }
                        </span>
                        <span className="flex-1 line-clamp-2 leading-snug">{lesson.title}</span>
                        {isCurrent && <ChevronRight size={14} className="shrink-0 text-indigo-300" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Player topbar */}
        <header className="flex h-12 items-center gap-3 border-b border-slate-200 bg-white px-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            title={sidebarOpen ? 'Hide lessons' : 'Show lessons'}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {currentLesson ? (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 leading-none mb-0.5 truncate">
                {currentLesson.moduleTitle}
              </p>
              <h1 className="text-sm font-semibold text-slate-900 truncate">
                {currentLesson.title}
              </h1>
            </div>
          ) : (
            <p className="flex-1 text-sm text-slate-400">Select a lesson to begin</p>
          )}

          {/* Completed pill */}
          {currentLesson && completedIds.has(currentLesson.id) && (
            <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={12} /> Completed
            </span>
          )}
        </header>

        {/* Lesson body */}
        <div className="flex-1 overflow-y-auto">
          {!currentLesson ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
                <FileText size={36} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No lesson selected</p>
                <p className="text-sm text-slate-400 mt-1">Open the panel and pick a lesson to start</p>
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <PanelLeftOpen size={16} /> Show Lessons
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">

              {/* Video */}
              {currentLesson.content_type === 'video' && currentLesson.video_url && (
                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-lg">
                  <iframe
                    src={currentLesson.video_url}
                    className="h-full w-full"
                    allowFullScreen
                    title={currentLesson.title}
                  />
                </div>
              )}

              {/* Markdown */}
              {currentLesson.content_type === 'markdown' && currentLesson.content && (
                <Suspense fallback={<LoadingLesson />}>
                  <div className="prose prose-slate prose-headings:font-semibold prose-a:text-indigo-600 max-w-none">
                    <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
                  </div>
                </Suspense>
              )}

              {/* Document */}
              {currentLesson.content_type === 'document' && currentLesson.document_url && (
                <iframe
                  src={currentLesson.document_url}
                  className="h-[72vh] w-full rounded-2xl border border-slate-200 shadow-sm"
                  title={currentLesson.title}
                />
              )}

              {/* Quiz */}
              {currentLesson.content_type === 'quiz' && currentLesson.quiz_data && (
                <QuizRenderer
                  lessonId={currentLesson.id}
                  quizData={currentLesson.quiz_data}
                  studentId={profile.id}
                  onPassed={handleMarkComplete}
                />
              )}

              {/* ── Navigation bar ── */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-6 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && navigate(`/courses/${courseId}/learn/${prevLesson.id}`)}
                  className="gap-1.5"
                >
                  <ChevronLeft size={15} /> Previous
                </Button>

                {completedIds.has(lessonId!) ? (
                  <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 size={15} /> Completed
                  </div>
                ) : (
                  <Button
                    onClick={handleMarkComplete}
                    loading={markComplete.isPending}
                    size="sm"
                    className="gap-1.5 px-5"
                  >
                    Mark Complete
                    {nextLesson && <ArrowRight size={15} />}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && navigate(`/courses/${courseId}/learn/${nextLesson.id}`)}
                  className="gap-1.5"
                >
                  Next <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      {currentLesson && (
        <AIAssistant lessonContent={currentLesson.content ?? currentLesson.title} />
      )}
    </div>
  )
}
