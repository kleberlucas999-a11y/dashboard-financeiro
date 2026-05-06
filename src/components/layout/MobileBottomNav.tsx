'use client'
import { cn } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import {
  LayoutDashboard, Receipt, Landmark, History, MoreHorizontal,
  PieChart, CalendarDays, Bitcoin, BellRing, Map, Target, Bot, UserCircle, BookOpen,
} from 'lucide-react'

const PRIMARY_NAV = [
  { id: 'overview',  label: 'Geral',    icon: LayoutDashboard },
  { id: 'bills',     label: 'Contas',   icon: Receipt },
  { id: 'accounts',  label: 'Bancário', icon: Landmark },
  { id: 'history',   label: 'Histórico',icon: History },
]

export function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { activeSection, setActiveSection } = useFinanceStore()

  const isOther = !PRIMARY_NAV.some((n) => n.id === activeSection)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1117] border-t border-[#1a2030] flex items-center">
      {PRIMARY_NAV.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveSection(id)}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-2.5 transition-all cursor-pointer',
            activeSection === id
              ? 'text-[#00d4a0]'
              : 'text-[#4a5568]',
          )}
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </button>
      ))}

      {/* Mais */}
      <button
        onClick={onOpenMenu}
        className={cn(
          'flex-1 flex flex-col items-center gap-1 py-2.5 transition-all cursor-pointer',
          isOther ? 'text-[#00d4a0]' : 'text-[#4a5568]',
        )}
      >
        <MoreHorizontal size={20} />
        <span className="text-[10px] font-medium leading-none">Mais</span>
      </button>
    </nav>
  )
}
