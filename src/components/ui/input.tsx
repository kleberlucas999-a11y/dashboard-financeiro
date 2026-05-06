'use client'
import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
  suffix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs text-[#8898aa] font-medium uppercase tracking-wide">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-[#4a5568] text-sm font-mono z-10">{prefix}</span>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-[#0a0e16] border border-[#1a2030] rounded-lg text-[#e8ecf4] text-sm',
            'px-3 py-2.5 outline-none transition-all duration-200',
            'placeholder:text-[#4a5568]',
            'focus:border-[#00d4a0] focus:ring-1 focus:ring-[#00d4a0]/20',
            'hover:border-[#243048]',
            prefix && 'pl-8',
            suffix && 'pr-14',
            error && 'border-[#f06060]',
            className
          )}
          {...props}
        />
        {suffix && <span className="absolute right-3 text-[#4a5568] text-xs font-mono">{suffix}</span>}
      </div>
      {error && <span className="text-xs text-[#f06060]">{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'
