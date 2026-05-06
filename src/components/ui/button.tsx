'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'default' | 'ghost' | 'outline' | 'destructive' | 'success' | 'amber'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-[#00d4a0] text-[#07090d] hover:bg-[#00b88a] font-semibold',
  ghost: 'bg-transparent text-[#8898aa] hover:bg-[#1a2030] hover:text-[#e8ecf4]',
  outline: 'border border-[#1a2030] bg-transparent text-[#e8ecf4] hover:border-[#243048] hover:bg-[#0d1117]',
  destructive: 'bg-[#f06060]/20 text-[#f06060] border border-[#f06060]/30 hover:bg-[#f06060]/30',
  success: 'bg-[#00d4a0]/20 text-[#00d4a0] border border-[#00d4a0]/30 hover:bg-[#00d4a0]/30',
  amber: 'bg-[#f5a020]/20 text-[#f5a020] border border-[#f5a020]/30 hover:bg-[#f5a020]/30',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
  icon: 'p-2 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
