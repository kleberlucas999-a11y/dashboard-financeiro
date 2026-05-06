'use client'
import { cn } from '@/lib/utils'
import { createContext, useContext, useState, ReactNode } from 'react'

interface TabsCtx { active: string; setActive: (v: string) => void }
const TabsContext = createContext<TabsCtx>({ active: '', setActive: () => {} })

export function Tabs({ defaultValue, value, onValueChange, children, className }: {
  defaultValue?: string; value?: string; onValueChange?: (v: string) => void;
  children: ReactNode; className?: string
}) {
  const [internal, setInternal] = useState(defaultValue || '')
  const active = value ?? internal
  const setActive = (v: string) => { setInternal(v); onValueChange?.(v) }
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex gap-1 bg-[#0a0e16] border border-[#1a2030] rounded-xl p-1', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { active, setActive } = useContext(TabsContext)
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap',
        active === value
          ? 'bg-[#0d1117] text-[#e8ecf4] shadow-sm border border-[#1a2030]'
          : 'text-[#8898aa] hover:text-[#e8ecf4]',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
