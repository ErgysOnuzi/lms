import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { OrganizationSettings } from '@/types/database'

export default function SystemSettings() {
  const qc = useQueryClient()
  const { settings, updateSettings } = useTheme()

  const { data } = useQuery({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('organization_settings').select('*').limit(1).single()
      return data as OrganizationSettings | null
    },
  })

  const { register, handleSubmit, reset } = useForm<Partial<OrganizationSettings>>()

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const save = useMutation({
    mutationFn: async (values: Partial<OrganizationSettings>) => {
      if (data?.id) {
        await supabase.from('organization_settings').update(values).eq('id', data.id)
      } else {
        await supabase.from('organization_settings').insert({
          ...values,
          organization_id: crypto.randomUUID(),
        })
      }
      updateSettings(values as OrganizationSettings)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-settings'] }),
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Branding</h2></CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(v => save.mutate(v))} className="space-y-4">
            <Input label="University / Organization Name" {...register('name')} />
            <Input label="Logo URL" placeholder="https://…" {...register('logo_url')} />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('primary_color')} className="h-10 w-14 rounded border border-slate-300 cursor-pointer" />
                  <Input {...register('primary_color')} placeholder="#6366f1" className="flex-1" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('accent_color')} className="h-10 w-14 rounded border border-slate-300 cursor-pointer" />
                  <Input {...register('accent_color')} placeholder="#8b5cf6" className="flex-1" />
                </div>
              </div>
            </div>

            {settings && (
              <div className="flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: settings.primary_color + '22' }}>
                <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: settings.primary_color }} />
                <div>
                  <p className="font-medium" style={{ color: settings.primary_color }}>{settings.name}</p>
                  <p className="text-xs text-slate-500">Live preview</p>
                </div>
              </div>
            )}

            <Button type="submit" loading={save.isPending} className="w-full">Save Settings</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
