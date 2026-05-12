import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Course } from '@/types/database'

export default function CourseApproval() {
  const qc = useQueryClient()

  const { data: pending, isLoading } = useQuery({
    queryKey: ['admin-pending-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, instructor:profiles(full_name,email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Course[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'published' | 'draft' }) => {
      const { error } = await supabase.from('courses').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pending-courses'] }),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Course Approval Queue</h1>
      <p className="text-sm text-slate-500">
        {pending?.length ?? 0} course{pending?.length !== 1 ? 's' : ''} awaiting review
      </p>

      {!pending?.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
            <CheckCircle2 size={48} className="text-emerald-400" />
            <p className="font-medium text-slate-700">All caught up!</p>
            <p className="text-sm text-slate-500">No courses pending review</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map(course => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{course.title}</h3>
                    <p className="text-sm text-slate-500">
                      by {course.instructor?.full_name} · {new Date(course.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {course.description && (
                  <p className="text-sm text-slate-700 line-clamp-3">{course.description}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => updateStatus.mutate({ id: course.id, status: 'published' })}
                    loading={updateStatus.isPending}
                  >
                    <CheckCircle2 size={16} /> Approve & Publish
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => updateStatus.mutate({ id: course.id, status: 'draft' })}
                    loading={updateStatus.isPending}
                  >
                    <XCircle size={16} /> Request Changes
                  </Button>
                  <Button variant="ghost">
                    <Eye size={16} /> Preview
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
