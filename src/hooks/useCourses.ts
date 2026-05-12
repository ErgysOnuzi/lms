import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Course } from '@/types/database'

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, instructor:profiles(id,full_name,avatar_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Course[]
    },
  })
}

export function useInstructorCourses(instructorId: string) {
  return useQuery({
    queryKey: ['courses', 'instructor', instructorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Course[]
    },
    enabled: !!instructorId,
  })
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:profiles(id,full_name,avatar_url),
          modules(id,title,description,position,
            lessons(id,title,content_type,position,is_free_preview,duration_seconds)
          )
        `)
        .eq('id', courseId)
        .single()
      if (error) throw error
      // sort modules and lessons by position
      if (data?.modules) {
        data.modules.sort((a: {position:number}, b: {position:number}) => a.position - b.position)
        data.modules.forEach((m: {lessons?: {position:number}[]}) => {
          m.lessons?.sort((a, b) => a.position - b.position)
        })
      }
      return data as Course
    },
    enabled: !!courseId,
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Course, 'id' | 'created_at' | 'updated_at' | 'instructor'>) => {
      const { data, error } = await supabase.from('courses').insert(values).select().single()
      if (error) throw error
      return data as Course
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Course> & { id: string }) => {
      const { error } = await supabase.from('courses').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['courses', id] })
      qc.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}
