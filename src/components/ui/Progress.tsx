import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number   // 0-100
  className?: string
  showLabel?: boolean
}

export function Progress({ value, className, showLabel }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-slate-500 w-8 text-right">{clamped}%</span>}
    </div>
  )
}
