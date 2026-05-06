'use client'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { ReactNode, useEffect } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' }

export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-[#0d1117] border border-[#243048] rounded-2xl shadow-2xl animate-fade-in', sizeMap[size], className)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2030]">
            <h2 className="text-base font-semibold text-[#e8ecf4]">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
