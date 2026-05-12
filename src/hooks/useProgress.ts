import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { LessonProgress } from '@/types/database'

export function useCourseProgress(studentId: string, courseId: string) {
  return useQuery({
    queryKey: ['progress', courseId, studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*, lesson:lessons(id, module:modules(course_id))')
        .eq('student_id', studentId)
      if (error) throw error
      return (data ?? []) as LessonProgress[]
    },
    enabled: !!studentId && !!courseId,
  })
}

export function useMarkComplete(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lessonId, studentId }: { lessonId: string; studentId: string }) => {
      const { error } = await supabase.from('lesson_progress').upsert({
        lesson_id: lessonId,
        student_id: studentId,
        is_completed: true,
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,lesson_id' })
      if (error) throw error
    },
    // Optimistic update: mark immediately in cache
    onMutate: async ({ lessonId, studentId }) => {
      await qc.cancelQueries({ queryKey: ['progress', courseId, studentId] })
      const prev = qc.getQueryData<LessonProgress[]>(['progress', courseId, studentId])
      qc.setQueryData<LessonProgress[]>(['progress', courseId, studentId], old => {
        const existing = old ?? []
        const idx = existing.findIndex(p => p.lesson_id === lessonId)
        const updated: LessonProgress = {
          id: '',
          student_id: studentId,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        }
        if (idx >= 0) return existing.map((p, i) => (i === idx ? updated : p))
        return [...existing, updated]
      })
      return { prev }
    },
    onError: (_err, { studentId }, ctx) => {
      qc.setQueryData(['progress', courseId, studentId], ctx?.prev)
    },
    onSettled: (_d, _e, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['progress', courseId, studentId] })
    },
  })
}

export function useLastAccessed() {
  return useMutation({
    mutationFn: async ({ studentId, lessonId }: { studentId: string; lessonId: string }) => {
      // Guard: skip silently if IDs are missing (e.g. profile still loading)
      if (!studentId || !lessonId) return
      await supabase.from('lesson_progress').upsert({
        student_id: studentId,
        lesson_id: lessonId,
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,lesson_id' })
    },
  })
}
