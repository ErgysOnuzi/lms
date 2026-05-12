import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Enrollment } from '@/types/database'

export function useStudentEnrollments(studentId: string) {
  return useQuery({
    queryKey: ['enrollments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`*, course:courses(*, modules(id, lessons(id)))`)
        .eq('student_id', studentId)
      if (error) throw error
      return data as Enrollment[]
    },
    enabled: !!studentId,
  })
}

export function useEnroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, courseId }: { studentId: string; courseId: string }) => {
      const { error } = await supabase.from('enrollments').insert({ student_id: studentId, course_id: courseId })
      if (error) throw error
    },
    onSuccess: (_d, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['enrollments', studentId] })
    },
  })
}
