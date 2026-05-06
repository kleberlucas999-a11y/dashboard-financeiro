'use client'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'green' | 'amber' | 'red' | 'usdt' | 'purple' | 'blue' | 'muted'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[#1a2030] text-[#8898aa]',
  green: 'bg-[#00d4a0]/15 text-[#00d4a0] border border-[#00d4a0]/30',
  amber: 'bg-[#f5a020]/15 text-[#f5a020] border border-[#f5a020]/30',
  red: 'bg-[#f06060]/15 text-[#f06060] border border-[#f06060]/30',
  usdt: 'bg-[#26a17b]/15 text-[#26a17b] border border-[#26a17b]/30',
  purple: 'bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/30',
  blue: 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30',
  muted: 'bg-[#4a5568]/20 text-[#8898aa]',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}
