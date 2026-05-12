import { useQuery } from '@tanstack/react-query'
import { Award, Download, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { Certificate } from '@/types/database'

export default function Certificates() {
  const { profile } = useAuth()

  const { data: certificates, isLoading } = useQuery<Certificate[]>({
    queryKey: ['certificates', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('*, course:courses(title, cover_image_url)')
        .eq('student_id', profile!.id)
        .order('issued_at', { ascending: false })
      if (error) throw error
      return data as Certificate[]
    },
    enabled: !!profile?.id,
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Certificates</h1>
        <span className="text-sm text-slate-500">{certificates?.length ?? 0} earned</span>
      </div>

      {!certificates?.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
              <Award size={40} className="text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-700">No certificates yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Complete 100% of a course to earn your certificate
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map(cert => (
            <Card key={cert.id} className="overflow-hidden">
              {/* Certificate design */}
              <div className="relative h-40 bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center text-white p-4">
                <Award size={36} className="mb-2 text-yellow-300" />
                <p className="text-sm font-medium opacity-80">Certificate of Completion</p>
                <p className="text-center text-sm font-semibold mt-1 line-clamp-2">
                  {cert.course?.title}
                </p>
              </div>
              <CardBody className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <BookOpen size={16} className="shrink-0 text-indigo-500" />
                  <span className="text-sm font-medium line-clamp-1">{cert.course?.title}</span>
                </div>
                <p className="text-xs text-slate-400">Issued {formatDate(cert.issued_at)}</p>

                {cert.certificate_url ? (
                  <a href={cert.certificate_url} target="_blank" rel="noreferrer" className="block">
                    <Button size="sm" variant="outline" className="w-full">
                      <Download size={14} /> Download PDF
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="secondary" className="w-full" disabled>
                    PDF generating…
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
