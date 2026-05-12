import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { roleHome } from '@/lib/roleHome'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTranslation } from 'react-i18next'
import type { UserRole } from '@/types/database'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
})
type FormValues = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit({ email, password }: FormValues) {
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      return
    }

    // Fetch the profile to get the role so we can redirect correctly
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    navigate(roleHome((profile?.role as UserRole) ?? null), { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">EduCore LMS</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@university.edu"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              {t('auth.login')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
