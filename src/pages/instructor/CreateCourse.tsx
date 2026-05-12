import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateCourse } from '@/hooks/useCourses'
import { uploadCourseFile } from '@/lib/uploadFile'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

const schema = z.object({
  title: z.string().min(3, 'Min 3 characters').max(120),
  description: z.string().min(10, 'Min 10 characters').optional(),
  language: z.string().min(1),
})
type FormValues = z.infer<typeof schema>

export default function CreateCourse() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const createCourse = useCreateCourse()
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { language: 'en' },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function onSubmit(values: FormValues) {
    if (!profile) return
    let cover_image_url: string | null = null

    if (coverFile) {
      // Upload with a temporary ID; we'll use a placeholder course ID
      const tempId = crypto.randomUUID()
      cover_image_url = await uploadCourseFile(tempId, coverFile, 'covers')
    }

    const course = await createCourse.mutateAsync({
      ...values,
      description: values.description ?? null,
      cover_image_url,
      instructor_id: profile.id,
      organization_id: profile.organization_id,
      status: 'draft',
      is_free: false,
    })

    navigate(`/instructor/courses/${course.id}/builder`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Course</h1>
        <p className="text-sm text-slate-500">Fill in the basics — you can add modules and lessons next</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800">Course Details</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Course Title"
              placeholder="e.g. Introduction to Data Structures"
              error={errors.title?.message}
              {...register('title')}
            />

            <Textarea
              label="Description"
              rows={4}
              placeholder="What will students learn in this course?"
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Language</label>
              <select
                {...register('language')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="en">English</option>
                <option value="sq">Albanian (Shqip)</option>
              </select>
            </div>

            {/* Cover image */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Cover Image</label>
              <label className="cursor-pointer">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="h-48 w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <ImagePlus size={32} className="text-slate-400" />
                    <span className="text-sm text-slate-500">Click to upload cover image</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
              </label>
            </div>

            {createCourse.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {String(createCourse.error)}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSubmitting || createCourse.isPending}>
                Create & Build Course
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
