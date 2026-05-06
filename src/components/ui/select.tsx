'use client'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs text-[#8898aa] font-medium uppercase tracking-wide">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none bg-[#0a0e16] border border-[#1a2030] rounded-lg',
            'text-[#e8ecf4] text-sm px-3 py-2.5 pr-9 outline-none cursor-pointer',
            'focus:border-[#00d4a0] focus:ring-1 focus:ring-[#00d4a0]/20',
            'hover:border-[#243048] transition-all duration-200',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0d1117]">{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
      </div>
    </div>
  )
)
Select.displayName = 'Select'
