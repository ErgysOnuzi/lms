import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Send, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { uploadCourseFile } from '@/lib/uploadFile'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { Assignment, Submission, SubmissionStatus } from '@/types/database'

const statusConfig: Record<SubmissionStatus, { icon: React.ElementType; variant: 'success' | 'warning' | 'info' | 'default' | 'danger'; label: string }> = {
  graded:      { icon: CheckCircle2,   variant: 'success', label: 'Graded' },
  submitted:   { icon: Send,           variant: 'info',    label: 'Submitted' },
  late:        { icon: AlertTriangle,  variant: 'warning', label: 'Late' },
  not_started: { icon: Clock,          variant: 'default', label: 'Not Started' },
}

export default function AssignmentView() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const { data: assignment, isLoading: loadingAssignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('assignments').select('*').eq('id', assignmentId).single()
      if (error) throw error
      return data as Assignment
    },
    enabled: !!assignmentId,
  })

  const { data: submission, isLoading: loadingSubmission } = useQuery({
    queryKey: ['submission', assignmentId, profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', profile!.id)  // enabled guard ensures profile exists
        .maybeSingle()
      return data as Submission | null
    },
    enabled: !!assignmentId && !!profile?.id,
  })

  const submit = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated')
      let file_url: string | null = null
      if (file && assignment) {
        file_url = await uploadCourseFile(assignment.course_id, file, 'assignments')
      }
      const isLate = assignment?.due_date ? new Date() > new Date(assignment.due_date) : false
      const { error } = await supabase.from('submissions').upsert({
        assignment_id: assignmentId,
        student_id: profile.id,
        content: text || null,
        file_url,
        status: isLate ? 'late' : 'submitted',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'assignment_id,student_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submission', assignmentId, profile?.id] }),
  })

  if (loadingAssignment || loadingSubmission) return <PageSpinner />
  if (!assignment) return <div className="p-8 text-center text-slate-500">Assignment not found</div>

  const isLate = assignment.due_date ? new Date() > new Date(assignment.due_date) : false
  const canSubmit = !submission || submission.status === 'not_started'
  const status = submission?.status ?? 'not_started'
  const { icon: StatusIcon, variant, label } = statusConfig[status]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Assignment details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
            <Badge variant={variant}>
              <StatusIcon size={12} className="mr-1" />{label}
            </Badge>
          </div>
          {assignment.due_date && (
            <p className={`mt-1 text-sm ${isLate ? 'text-red-500' : 'text-slate-500'}`}>
              {isLate ? 'Overdue · ' : 'Due · '}{formatDate(assignment.due_date)}
            </p>
          )}
        </CardHeader>
        <CardBody>
          <p className="text-slate-700 whitespace-pre-wrap">{assignment.description}</p>
          <p className="mt-3 text-sm text-slate-500">Max points: {assignment.max_points}</p>
        </CardBody>
      </Card>

      {/* Grade & feedback */}
      {submission?.status === 'graded' && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Grade & Feedback</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-indigo-600">{submission.points_earned}</span>
              <span className="text-slate-500">/ {assignment.max_points}</span>
            </div>
            {submission.feedback && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {submission.feedback}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Submission form */}
      {canSubmit && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Your Submission</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Textarea
              label="Your answer"
              rows={6}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type your answer here..."
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Attach file</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 hover:bg-slate-50 transition-colors">
                <Upload size={20} className="text-slate-400" />
                <span className="text-sm text-slate-500">
                  {file ? file.name : 'Click to upload (PDF, DOCX, ZIP…)'}
                </span>
                <input type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {submit.error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{String(submit.error)}</p>
            )}

            <Button
              onClick={() => submit.mutate()}
              loading={submit.isPending}
              disabled={!text && !file}
              className="w-full"
            >
              <Send size={16} />
              {isLate ? 'Submit Late' : 'Submit Assignment'}
            </Button>
          </CardBody>
        </Card>
      )}

      {submission?.submitted_at && submission.status !== 'graded' && (
        <p className="text-center text-sm text-slate-500">
          Submitted on {formatDate(submission.submitted_at)} · Awaiting grading
        </p>
      )}
    </div>
  )
}
