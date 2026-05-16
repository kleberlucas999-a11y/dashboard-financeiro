'use client'
import { cn } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  X, LayoutDashboard, Receipt, Bitcoin, PieChart, CalendarDays,
  Landmark, History, BellRing, TrendingUp, Map, Target, Bot,
  UserCircle, BookOpen, LogOut, ShoppingCart,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview',   label: 'Visão Geral',      icon: LayoutDashboard },
  { id: 'bills',      label: 'Contas',            icon: Receipt },
  { id: 'daily',      label: 'Gastos Diários',    icon: ShoppingCart },
  { id: 'usdt',       label: 'USDT / APY',        icon: Bitcoin },
  { id: 'allocation', label: 'Alocação 50-30-20', icon: PieChart },
  { id: 'calendar',   label: 'Calendário',        icon: CalendarDays },
  { id: 'accounts',   label: 'Contas Bancárias',  icon: Landmark },
  { id: 'history',    label: 'Histórico',         icon: History },
  { id: 'alerts',     label: 'Alertas',           icon: BellRing },
]

const PLANNING_ITEM = { id: 'planning', label: 'Planejamento', icon: Map }

const PERSONAL_ITEMS = [
  { id: 'guide',   label: 'Guia Inicial', icon: BookOpen,   color: '#f5a020' },
  { id: 'goals',   label: 'Metas',        icon: Target,     color: '#00d4a0' },
  { id: 'advisor', label: 'Advisor',      icon: Bot,        color: '#6366f1' },
  { id: 'profile', label: 'Perfil',       icon: UserCircle, color: '#8898aa' },
]

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeSection, setActiveSection, userProfile, logout } = useFinanceStore()
  const router = useRouter()

  const handleNav = (id: string) => {
    setActiveSection(id)
    onClose()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    router.push('/auth')
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0d1117] border-r border-[#1a2030] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-[#1a2030]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center">
              <TrendingUp size={16} className="text-[#00d4a0]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#e8ecf4] leading-none">FinDash</p>
              <p className="text-xs text-[#4a5568] mt-0.5">Pessoal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-left',
                activeSection === item.id
                  ? 'bg-[#00d4a0]/10 text-[#00d4a0] border border-[#00d4a0]/20'
                  : 'text-[#8898aa] hover:bg-[#1a2030] hover:text-[#e8ecf4]',
              )}
            >
              <item.icon size={18} className="shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}

          <div className="my-3 border-t border-[#1a2030]" />

          {/* Planning */}
          <button
            onClick={() => handleNav(PLANNING_ITEM.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-left',
              activeSection === PLANNING_ITEM.id
                ? 'bg-[#f5a020]/10 text-[#f5a020] border border-[#f5a020]/20'
                : 'text-[#8898aa] hover:bg-[#1a2030] hover:text-[#f5a020]',
            )}
          >
            <Map size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{PLANNING_ITEM.label}</span>
            <span className="text-xs bg-[#f5a020]/20 text-[#f5a020] px-1.5 py-0.5 rounded-full border border-[#f5a020]/30">
              maio
            </span>
          </button>

          <div className="my-3 border-t border-[#1a2030]" />
          <p className="text-xs text-[#4a5568] px-3 mb-1 uppercase tracking-wider">Pessoal</p>

          {PERSONAL_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-left',
                activeSection === item.id ? 'border' : 'text-[#8898aa] hover:bg-[#1a2030]',
              )}
              style={activeSection === item.id ? {
                background: `${item.color}18`,
                color: item.color,
                borderColor: `${item.color}33`,
              } : undefined}
            >
              <item.icon size={18} className="shrink-0" style={activeSection === item.id ? { color: item.color } : undefined} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#1a2030] space-y-1">
          {userProfile && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[#00d4a0]">
                  {userProfile.name?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </div>
              <p className="text-xs font-medium text-[#e8ecf4] truncate">{userProfile.name}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 transition-all cursor-pointer"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="text-xs">Sair</span>
          </button>
        </div>
      </div>
    </>
  )
}
