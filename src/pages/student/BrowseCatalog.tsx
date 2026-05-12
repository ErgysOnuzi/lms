import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Search, UserCheck, Clock, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Course } from '@/types/database'

export default function BrowseCatalog() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, instructor:profiles(id, full_name, avatar_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Course[]
    },
  })

  // Which courses this student is already enrolled in
  const { data: enrollments } = useQuery({
    queryKey: ['enrollments', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile!.id)
      return new Set((data ?? []).map(e => e.course_id))
    },
    enabled: !!profile?.id,
  })

  const enroll = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('enrollments').insert({
        student_id: profile!.id,
        course_id: courseId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', profile?.id] })
      qc.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })

  const filtered = (courses ?? []).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Course Catalog</h1>
        <p className="text-sm text-slate-500">Discover and enroll in courses</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search courses…"
          className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {!filtered.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-20 text-center">
            <BookOpen size={48} className="text-slate-300" />
            <div>
              <p className="font-medium text-slate-700">
                {courses?.length === 0 ? 'No published courses yet' : `No results for "${search}"`}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {courses?.length === 0
                  ? 'Check back soon — instructors are building courses now.'
                  : 'Try a different search term.'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(course => {
            const enrolled = enrollments?.has(course.id) ?? false
            return (
              <Card key={course.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                {course.cover_image_url ? (
                  <img
                    src={course.cover_image_url}
                    alt={course.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="h-40 w-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                    <BookOpen size={40} className="text-indigo-400" />
                  </div>
                )}

                <CardBody className="flex flex-col flex-1 gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 flex-1">
                      {course.title}
                    </h3>
                    {course.is_free && <Badge variant="success">Free</Badge>}
                  </div>

                  {course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{course.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-auto">
                    <span className="flex items-center gap-1">
                      <Globe size={12} />
                      {course.language.toUpperCase()}
                    </span>
                    {course.instructor && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {course.instructor.full_name}
                      </span>
                    )}
                  </div>

                  {enrolled ? (
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      <UserCheck size={14} /> Enrolled
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      loading={enroll.isPending}
                      onClick={() => enroll.mutate(course.id)}
                    >
                      Enroll Now
                    </Button>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
