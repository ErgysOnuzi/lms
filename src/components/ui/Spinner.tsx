import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600', className)} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  )
}
