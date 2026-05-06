'use client'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeH = { sm: 'h-1', md: 'h-2', lg: 'h-3' }

export function Progress({ value, max = 100, className, color = '#00d4a0', size = 'md' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('w-full bg-[#1a2030] rounded-full overflow-hidden', sizeH[size], className)}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}
