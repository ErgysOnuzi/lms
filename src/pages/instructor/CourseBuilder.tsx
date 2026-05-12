import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronDown, ChevronRight, Trash2, Video, FileText, File, HelpCircle, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useCourse } from '@/hooks/useCourses'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import type { ContentType, Lesson, Module } from '@/types/database'

const moduleSchema = z.object({ title: z.string().min(1), description: z.string().optional() })
const lessonSchema = z.object({
  title: z.string().min(1),
  content_type: z.enum(['video', 'markdown', 'document', 'quiz']),
  content: z.string().optional(),
  video_url: z.string().url().optional().or(z.literal('')),
})

type ModuleForm = z.infer<typeof moduleSchema>
type LessonForm = z.infer<typeof lessonSchema>

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  video: Video,
  markdown: FileText,
  document: File,
  quiz: HelpCircle,
}
const contentTypeBadge: Record<ContentType, string> = {
  video: 'bg-blue-100 text-blue-700',
  markdown: 'bg-green-100 text-green-700',
  document: 'bg-orange-100 text-orange-700',
  quiz: 'bg-purple-100 text-purple-700',
}

export default function CourseBuilder() {
  const { courseId } = useParams<{ courseId: string }>()
  const qc = useQueryClient()
  const { data: course, isLoading } = useCourse(courseId!)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [addModuleOpen, setAddModuleOpen] = useState(false)
  const [addLessonState, setAddLessonState] = useState<{ open: boolean; moduleId: string | null }>({ open: false, moduleId: null })

  const moduleForm = useForm<ModuleForm>({ resolver: zodResolver(moduleSchema) })
  const lessonForm = useForm<LessonForm>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { content_type: 'markdown' },
  })

  const addModule = useMutation({
    mutationFn: async (values: ModuleForm) => {
      const pos = (course?.modules?.length ?? 0)
      const { error } = await supabase.from('modules').insert({ ...values, course_id: courseId, position: pos })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses', courseId] }); setAddModuleOpen(false); moduleForm.reset() },
  })

  const addLesson = useMutation({
    mutationFn: async (values: LessonForm) => {
      const module = course?.modules?.find(m => m.id === addLessonState.moduleId)
      const pos = (module?.lessons?.length ?? 0)
      const { error } = await supabase.from('lessons').insert({
        ...values,
        module_id: addLessonState.moduleId,
        position: pos,
        video_url: values.video_url || null,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses', courseId] }); setAddLessonState({ open: false, moduleId: null }); lessonForm.reset() },
  })

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses', courseId] }),
  })

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses', courseId] }),
  })

  function toggleModule(id: string) {
    setExpandedModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{course?.title}</h1>
          <p className="text-sm text-slate-500">Manage modules and lessons</p>
        </div>
        <Button onClick={() => setAddModuleOpen(true)}>
          <Plus size={16} /> Add Module
        </Button>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {course?.modules?.map((mod: Module & { lessons?: Lesson[] }, mIdx: number) => (
          <Card key={mod.id}>
            <CardHeader className="py-3">
              <div className="flex items-center gap-3">
                <GripVertical size={18} className="text-slate-400 cursor-grab" />
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {expandedModules.has(mod.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-medium text-slate-900">{mIdx + 1}. {mod.title}</span>
                  <Badge variant="default">{mod.lessons?.length ?? 0} lessons</Badge>
                </button>
                <button
                  onClick={() => deleteModule.mutate(mod.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </CardHeader>

            {expandedModules.has(mod.id) && (
              <CardBody className="pt-0 space-y-2">
                {mod.lessons?.map((lesson: Lesson, lIdx: number) => {
                  const Icon = contentTypeIcons[lesson.content_type]
                  return (
                    <div key={lesson.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50 group">
                      <GripVertical size={16} className="text-slate-300 cursor-grab" />
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${contentTypeBadge[lesson.content_type]}`}>
                        <Icon size={14} />
                      </span>
                      <span className="flex-1 text-sm text-slate-700">{mIdx + 1}.{lIdx + 1} {lesson.title}</span>
                      {lesson.is_free_preview && <Badge variant="info">Preview</Badge>}
                      <button
                        onClick={() => deleteLesson.mutate(lesson.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}

                <button
                  onClick={() => setAddLessonState({ open: true, moduleId: mod.id })}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Plus size={16} /> Add Lesson
                </button>
              </CardBody>
            )}
          </Card>
        ))}

        {!course?.modules?.length && (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-slate-500">No modules yet. Start by adding a module.</p>
              <Button onClick={() => setAddModuleOpen(true)}><Plus size={16} /> Add Module</Button>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Add Module Modal */}
      <Modal open={addModuleOpen} onClose={() => setAddModuleOpen(false)} title="Add Module">
        <form onSubmit={moduleForm.handleSubmit(v => addModule.mutate(v))} className="space-y-4">
          <Input label="Module Title" error={moduleForm.formState.errors.title?.message} {...moduleForm.register('title')} />
          <Textarea label="Description (optional)" rows={2} {...moduleForm.register('description')} />
          <Button type="submit" loading={addModule.isPending} className="w-full">Add Module</Button>
        </form>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal open={addLessonState.open} onClose={() => setAddLessonState({ open: false, moduleId: null })} title="Add Lesson">
        <form onSubmit={lessonForm.handleSubmit(v => addLesson.mutate(v))} className="space-y-4">
          <Input label="Lesson Title" error={lessonForm.formState.errors.title?.message} {...lessonForm.register('title')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Content Type</label>
            <select {...lessonForm.register('content_type')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
              <option value="markdown">Markdown Article</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="quiz">Quiz</option>
            </select>
          </div>
          <Textarea label="Content (Markdown)" rows={4} {...lessonForm.register('content')} />
          <Input label="Video URL (if video)" placeholder="https://..." {...lessonForm.register('video_url')} />
          <Button type="submit" loading={addLesson.isPending} className="w-full">Add Lesson</Button>
        </form>
      </Modal>
    </div>
  )
}
