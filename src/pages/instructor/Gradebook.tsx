import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useCourse } from '@/hooks/useCourses'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Input'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { exportToCsv } from '@/lib/csvExport'
import type { Submission, SubmissionStatus } from '@/types/database'

const statusBadge: Record<SubmissionStatus, { variant: 'success' | 'warning' | 'info' | 'default' | 'danger'; label: string }> = {
  graded:      { variant: 'success', label: 'Graded' },
  submitted:   { variant: 'info',    label: 'Submitted' },
  late:        { variant: 'warning', label: 'Late' },
  not_started: { variant: 'default', label: 'Not Started' },
}

export default function Gradebook() {
  const { courseId } = useParams<{ courseId: string }>()
  const qc = useQueryClient()
  const { data: course } = useCourse(courseId!)
  const [selected, setSelected] = useState<Submission | null>(null)
  const [feedback, setFeedback] = useState('')
  const [points, setPoints] = useState('')

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', courseId],
    queryFn: async () => {
      // Fetch assignment IDs for this course first, then get submissions.
      // PostgREST cannot filter on a foreign-table column via .eq() without
      // an !inner join — fetching IDs separately is more reliable.
      const { data: assignments, error: aErr } = await supabase
        .from('assignments')
        .select('id')
        .eq('course_id', courseId)
      if (aErr) throw aErr

      const ids = (assignments ?? []).map(a => a.id)
      if (!ids.length) return []

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles(id,full_name,email,avatar_url),
          assignment:assignments(id,title,max_points,course_id)
        `)
        .in('assignment_id', ids)
      if (error) throw error
      return data as Submission[]
    },
    enabled: !!courseId,
  })

  const grade = useMutation({
    mutationFn: async ({ id, pts, fb }: { id: string; pts: number; fb: string }) => {
      const { error } = await supabase.from('submissions').update({
        points_earned: pts,
        feedback: fb,
        status: 'graded',
        graded_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions', courseId] }); setSelected(null) },
  })

  function exportGradebook() {
    const rows = (submissions ?? []).map(s => ({
      student: s.student?.full_name ?? '',
      email: s.student?.email ?? '',
      assignment: s.assignment?.title ?? '',
      status: s.status,
      points: s.points_earned ?? '',
      max_points: s.assignment?.max_points ?? '',
      submitted_at: s.submitted_at ?? '',
    }))
    exportToCsv(rows, `gradebook-${course?.title ?? courseId}.csv`)
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gradebook</h1>
          <p className="text-sm text-slate-500">{course?.title}</p>
        </div>
        <Button variant="outline" onClick={exportGradebook}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-slate-500">{submissions?.length ?? 0} submissions</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Assignment</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map(sub => {
                const { variant, label } = statusBadge[sub.status]
                return (
                  <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">{sub.student?.full_name}</div>
                      <div className="text-xs text-slate-500">{sub.student?.email}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-700">{sub.assignment?.title}</td>
                    <td className="px-6 py-3"><Badge variant={variant}>{label}</Badge></td>
                    <td className="px-6 py-3">
                      {sub.points_earned != null
                        ? `${sub.points_earned} / ${sub.assignment?.max_points}`
                        : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => { setSelected(sub); setFeedback(sub.feedback ?? ''); setPoints(String(sub.points_earned ?? '')) }}
                      >
                        <MessageSquare size={14} />
                        {sub.status === 'graded' ? 'Edit Grade' : 'Grade'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!submissions?.length && (
            <div className="flex items-center justify-center py-16 text-slate-400">No submissions yet</div>
          )}
        </div>
      </Card>

      {/* Grading modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Grade Submission" className="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Student</p>
                <p className="font-medium">{selected.student?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Assignment</p>
                <p className="font-medium">{selected.assignment?.title}</p>
              </div>
            </div>

            {selected.content && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Submission</p>
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 max-h-40 overflow-y-auto">
                  {selected.content}
                </div>
              </div>
            )}

            {selected.file_url && (
              <a href={selected.file_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                View submitted file
              </a>
            )}

            <Input
              label={`Score (out of ${selected.assignment?.max_points})`}
              type="number"
              value={points}
              onChange={e => setPoints(e.target.value)}
              min={0}
              max={selected.assignment?.max_points}
            />
            <Textarea
              label="Feedback"
              rows={4}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Leave feedback for the student..."
            />

            <Button
              className="w-full"
              loading={grade.isPending}
              onClick={() => grade.mutate({ id: selected.id, pts: Number(points), fb: feedback })}
            >
              Save Grade
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
