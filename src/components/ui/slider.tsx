'use client'
import { cn } from '@/lib/utils'
import { InputHTMLAttributes } from 'react'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  displayValue?: string
  color?: string
}

export function Slider({ className, label, displayValue, color = '#00d4a0', value, ...props }: SliderProps) {
  const pct = value !== undefined ? Number(value) : 50
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || displayValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-[#8898aa] font-medium">{label}</span>}
          {displayValue && <span className="text-xs font-mono text-[#e8ecf4]">{displayValue}</span>}
        </div>
      )}
      <input
        type="range"
        value={value}
        className="w-full h-2 appearance-none rounded-full outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #1a2030 ${pct}%, #1a2030 100%)`,
        }}
        {...props}
      />
    </div>
  )
}
